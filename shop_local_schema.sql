-- ============================================================================
-- SHOP LOCAL MARKETPLACE - DATABASE SCHEMA
-- Supabase (PostgreSQL)
-- Date: February 12, 2026
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('shopper', 'merchant', 'chamber_admin');

CREATE TYPE merchant_status AS ENUM (
    'pending',       -- Claimed listing, awaiting chamber approval
    'active',        -- Approved and active
    'suspended',     -- Manually suspended by chamber or platform
    'inactive'       -- Auto-deactivated due to lapsed chamber membership
);

CREATE TYPE product_source AS ENUM (
    'manual',        -- Added through merchant portal
    'shopify',       -- Synced from Shopify
    'square',        -- Synced from Square
    'woocommerce'    -- Synced from WooCommerce
);

CREATE TYPE product_status AS ENUM (
    'draft',         -- Not yet visible
    'active',        -- Live on marketplace
    'out_of_stock',  -- Quantity is 0
    'archived'       -- Removed by merchant but not deleted
);

CREATE TYPE order_status AS ENUM (
    'pending',           -- Just placed, awaiting merchant acknowledgment
    'confirmed',         -- Merchant confirmed the order
    'ready_for_pickup',  -- Ready for customer pickup (if local pickup)
    'shipped',           -- Merchant has shipped it
    'delivered',         -- Confirmed delivered
    'cancelled',         -- Cancelled before fulfillment
    'refunded'           -- Refunded after fulfillment
);

CREATE TYPE fulfillment_type AS ENUM (
    'local_pickup',
    'flat_rate',
    'standard_shipping'
);

CREATE TYPE integration_provider AS ENUM (
    'shopify',
    'square',
    'woocommerce'
);

CREATE TYPE chambermaster_member_status AS ENUM (
    'prospective',   -- Status code 1
    'active',        -- Status code 2
    'courtesy',      -- Status code 4
    'non_member',    -- Status code 8
    'inactive',      -- Status code 16
    'deleted'        -- Status code 32
);


-- ============================================================================
-- 1. CHAMBERS
-- The top-level entity. Each chamber gets a branded marketplace.
-- ============================================================================

CREATE TABLE chambers (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                VARCHAR(255) NOT NULL,
    slug                VARCHAR(100) NOT NULL UNIQUE,  -- e.g. "cullman" for cullman.shoplocal.com

    -- ChamberMaster / GrowthZone Integration
    chambermaster_association_id    VARCHAR(100),
    chambermaster_api_key           TEXT,               -- Encrypted at rest
    chambermaster_base_url          VARCHAR(500),
    chambermaster_last_sync_at      TIMESTAMPTZ,
    chambermaster_sync_enabled      BOOLEAN DEFAULT FALSE,

    -- Branding / Customization
    logo_url            TEXT,
    hero_image_url      TEXT,
    primary_color       VARCHAR(7) DEFAULT '#2563EB',   -- Hex color
    accent_color        VARCHAR(7) DEFAULT '#1E40AF',
    tagline             VARCHAR(255),

    -- Contact
    website_url         VARCHAR(500),
    contact_email       VARCHAR(255),
    phone               VARCHAR(20),
    address_line1       VARCHAR(255),
    address_line2       VARCHAR(255),
    city                VARCHAR(100),
    state               VARCHAR(2),
    zip                 VARCHAR(10),

    -- Platform
    is_active           BOOLEAN DEFAULT FALSE,          -- Goes true when ready to launch
    launched_at         TIMESTAMPTZ,                    -- When consumer site went live
    product_threshold   INTEGER DEFAULT 20,             -- Min products before launch

    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================================
-- 2. PROFILES
-- Extends Supabase Auth. Every authenticated user gets a profile.
-- Role determines what they see in the portal.
-- ============================================================================

CREATE TABLE profiles (
    id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role                user_role NOT NULL DEFAULT 'shopper',
    email               VARCHAR(255) NOT NULL,
    first_name          VARCHAR(100),
    last_name           VARCHAR(100),
    phone               VARCHAR(20),
    avatar_url          TEXT,

    -- If role is chamber_admin, link to their chamber
    chamber_id          UUID REFERENCES chambers(id) ON DELETE SET NULL,

    -- If role is merchant, link to their merchant record
    merchant_id         UUID,  -- FK added after merchants table is created

    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================================
-- 3. CHAMBERMASTER MEMBERS (SYNCED ROSTER)
-- Raw member data pulled from ChamberMaster API.
-- This is the roster merchants "claim" during onboarding.
-- ============================================================================

CREATE TABLE chambermaster_members (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chamber_id          UUID NOT NULL REFERENCES chambers(id) ON DELETE CASCADE,

    -- Data from ChamberMaster
    cm_member_id        VARCHAR(100),                   -- ChamberMaster's internal ID
    business_name       VARCHAR(255) NOT NULL,
    contact_name        VARCHAR(255),
    email               VARCHAR(255),
    phone               VARCHAR(20),
    website_url         VARCHAR(500),
    address_line1       VARCHAR(255),
    address_line2       VARCHAR(255),
    city                VARCHAR(100),
    state               VARCHAR(2),
    zip                 VARCHAR(10),
    category            VARCHAR(255),                   -- Business category from CM
    member_status       chambermaster_member_status DEFAULT 'active',
    member_status_code  INTEGER,                        -- Raw status code from API

    -- Tracking
    is_claimed          BOOLEAN DEFAULT FALSE,          -- Has a merchant claimed this listing?
    claimed_by          UUID REFERENCES profiles(id),
    claimed_at          TIMESTAMPTZ,

    last_synced_at      TIMESTAMPTZ DEFAULT NOW(),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(chamber_id, cm_member_id)
);

CREATE INDEX idx_cm_members_chamber ON chambermaster_members(chamber_id);
CREATE INDEX idx_cm_members_status ON chambermaster_members(member_status);
CREATE INDEX idx_cm_members_email ON chambermaster_members(email);


-- ============================================================================
-- 4. MERCHANTS
-- A verified business that has been approved to sell on the platform.
-- Created when a chamber admin approves a claim request.
-- ============================================================================

CREATE TABLE merchants (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chamber_id          UUID NOT NULL REFERENCES chambers(id) ON DELETE CASCADE,
    cm_member_id        UUID REFERENCES chambermaster_members(id),  -- Link to synced roster

    -- Business Info (initially populated from ChamberMaster, editable)
    business_name       VARCHAR(255) NOT NULL,
    slug                VARCHAR(100) NOT NULL,          -- URL-friendly name
    description         TEXT,
    logo_url            TEXT,
    cover_image_url     TEXT,
    contact_email       VARCHAR(255),
    phone               VARCHAR(20),
    website_url         VARCHAR(500),

    -- Address
    address_line1       VARCHAR(255),
    address_line2       VARCHAR(255),
    city                VARCHAR(100),
    state               VARCHAR(2),
    zip                 VARCHAR(10),

    -- Status
    status              merchant_status DEFAULT 'pending',
    approved_at         TIMESTAMPTZ,
    approved_by         UUID REFERENCES profiles(id),   -- Chamber admin who approved
    deactivated_at      TIMESTAMPTZ,
    deactivation_reason TEXT,

    -- Stripe Connect
    stripe_account_id   VARCHAR(255),                   -- Stripe connected account ID
    stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
    stripe_payouts_enabled     BOOLEAN DEFAULT FALSE,

    -- Shipping / Fulfillment Options
    offers_local_pickup     BOOLEAN DEFAULT TRUE,
    offers_flat_rate        BOOLEAN DEFAULT FALSE,
    flat_rate_amount        DECIMAL(10,2),               -- e.g. 5.99
    offers_standard_shipping BOOLEAN DEFAULT FALSE,
    shipping_notes          TEXT,                         -- Free text for merchant to explain

    -- Stats (denormalized for quick dashboard reads)
    total_products      INTEGER DEFAULT 0,
    total_orders        INTEGER DEFAULT 0,
    total_revenue       DECIMAL(12,2) DEFAULT 0,

    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(chamber_id, slug)
);

CREATE INDEX idx_merchants_chamber ON merchants(chamber_id);
CREATE INDEX idx_merchants_status ON merchants(status);
CREATE INDEX idx_merchants_stripe ON merchants(stripe_account_id);

-- Now add the FK on profiles
ALTER TABLE profiles
    ADD CONSTRAINT fk_profiles_merchant
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE SET NULL;


-- ============================================================================
-- 5. MERCHANT INTEGRATIONS
-- OAuth connections to Shopify, Square, WooCommerce, etc.
-- A merchant can have multiple integrations.
-- ============================================================================

CREATE TABLE merchant_integrations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id         UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    provider            integration_provider NOT NULL,

    -- OAuth Tokens (encrypted at rest)
    access_token        TEXT,
    refresh_token       TEXT,
    token_expires_at    TIMESTAMPTZ,

    -- Provider-specific identifiers
    shop_domain         VARCHAR(500),       -- Shopify: mystore.myshopify.com
    location_id         VARCHAR(255),       -- Square: location ID

    -- Sync status
    is_active           BOOLEAN DEFAULT TRUE,
    last_sync_at        TIMESTAMPTZ,
    last_sync_status    VARCHAR(50),        -- 'success', 'failed', 'partial'
    last_sync_error     TEXT,
    products_synced     INTEGER DEFAULT 0,

    connected_at        TIMESTAMPTZ DEFAULT NOW(),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(merchant_id, provider)
);

CREATE INDEX idx_integrations_merchant ON merchant_integrations(merchant_id);


-- ============================================================================
-- 6. PRODUCT CATEGORIES
-- Platform-wide categories. Products are organized by category on the
-- consumer site, not just by store.
-- ============================================================================

CREATE TABLE categories (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                VARCHAR(100) NOT NULL,
    slug                VARCHAR(100) NOT NULL UNIQUE,
    description         TEXT,
    icon_url            TEXT,
    display_order       INTEGER DEFAULT 0,
    parent_id           UUID REFERENCES categories(id),  -- Allow subcategories
    is_active           BOOLEAN DEFAULT TRUE,

    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================================
-- 7. PRODUCTS
-- The core product table. Products come from manual entry or API sync.
-- ============================================================================

CREATE TABLE products (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id         UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,

    -- Basic Info
    name                VARCHAR(255) NOT NULL,
    slug                VARCHAR(255) NOT NULL,
    description         TEXT,
    short_description   VARCHAR(500),

    -- Pricing
    price               DECIMAL(10,2) NOT NULL,
    compare_at_price    DECIMAL(10,2),                   -- Original/MSRP for showing "sale"

    -- Inventory
    quantity            INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    track_inventory     BOOLEAN DEFAULT TRUE,

    -- Source / Sync
    source              product_source DEFAULT 'manual',
    external_id         VARCHAR(255),                    -- Shopify product ID, Square item ID, etc.
    external_variant_id VARCHAR(255),                    -- For platforms that use variants
    last_synced_at      TIMESTAMPTZ,

    -- Status
    status              product_status DEFAULT 'draft',

    -- Metadata
    weight_oz           DECIMAL(8,2),                    -- For shipping calculations
    sku                 VARCHAR(100),
    barcode             VARCHAR(100),

    -- Search / Display
    tags                TEXT[],                          -- Array of tags for search/filtering
    is_featured         BOOLEAN DEFAULT FALSE,

    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(merchant_id, slug)
);

CREATE INDEX idx_products_merchant ON products(merchant_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_source ON products(source);
CREATE INDEX idx_products_external ON products(external_id);
CREATE INDEX idx_products_tags ON products USING GIN(tags);


-- ============================================================================
-- 8. PRODUCT IMAGES
-- Multiple images per product. First image (by display_order) is the primary.
-- ============================================================================

CREATE TABLE product_images (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url           TEXT NOT NULL,
    alt_text            VARCHAR(255),
    display_order       INTEGER DEFAULT 0,
    is_primary          BOOLEAN DEFAULT FALSE,

    -- If synced from external source
    external_image_id   VARCHAR(255),

    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_images_product ON product_images(product_id);


-- ============================================================================
-- 9. ORDERS
-- Single-merchant orders only (no multi-store cart).
-- ============================================================================

CREATE TABLE orders (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number        SERIAL,                          -- Human-readable order number
    merchant_id         UUID NOT NULL REFERENCES merchants(id),
    customer_id         UUID REFERENCES profiles(id),    -- NULL if guest checkout
    chamber_id          UUID NOT NULL REFERENCES chambers(id),

    -- Status
    status              order_status DEFAULT 'pending',

    -- Fulfillment
    fulfillment_type    fulfillment_type NOT NULL,
    tracking_number     VARCHAR(255),
    tracking_url        TEXT,
    shipped_at          TIMESTAMPTZ,
    delivered_at        TIMESTAMPTZ,

    -- Customer Info (stored on order in case profile changes later)
    customer_email      VARCHAR(255) NOT NULL,
    customer_name       VARCHAR(255),
    customer_phone      VARCHAR(20),

    -- Shipping Address (NULL if local pickup)
    shipping_address_line1  VARCHAR(255),
    shipping_address_line2  VARCHAR(255),
    shipping_city           VARCHAR(100),
    shipping_state          VARCHAR(2),
    shipping_zip            VARCHAR(10),

    -- Financials
    subtotal            DECIMAL(10,2) NOT NULL,
    shipping_amount     DECIMAL(10,2) DEFAULT 0,
    tax_amount          DECIMAL(10,2) DEFAULT 0,         -- TBD based on accountant guidance
    total               DECIMAL(10,2) NOT NULL,

    -- Platform Fee
    platform_fee_percent    DECIMAL(4,2) DEFAULT 3.00,   -- e.g. 3%
    platform_fee_amount     DECIMAL(10,2) DEFAULT 0,

    -- Stripe
    stripe_payment_intent_id    VARCHAR(255),
    stripe_charge_id            VARCHAR(255),
    stripe_transfer_id          VARCHAR(255),             -- Transfer to merchant's connected account

    -- Notes
    customer_notes      TEXT,                             -- Special instructions at checkout
    merchant_notes      TEXT,                             -- Internal notes from merchant

    -- Timestamps
    confirmed_at        TIMESTAMPTZ,
    cancelled_at        TIMESTAMPTZ,
    refunded_at         TIMESTAMPTZ,
    refund_amount       DECIMAL(10,2),

    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_merchant ON orders(merchant_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_chamber ON orders(chamber_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);


-- ============================================================================
-- 10. ORDER ITEMS
-- Individual line items within an order.
-- ============================================================================

CREATE TABLE order_items (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id          UUID REFERENCES products(id) ON DELETE SET NULL,

    -- Snapshot of product at time of purchase (prices/names can change)
    product_name        VARCHAR(255) NOT NULL,
    product_image_url   TEXT,
    unit_price          DECIMAL(10,2) NOT NULL,
    quantity            INTEGER NOT NULL DEFAULT 1,
    line_total          DECIMAL(10,2) NOT NULL,          -- unit_price * quantity

    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);


-- ============================================================================
-- 11. MERCHANT CLAIM REQUESTS
-- When a business owner claims a ChamberMaster listing, a request is
-- created for the chamber admin to approve or deny.
-- ============================================================================

CREATE TABLE claim_requests (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chamber_id          UUID NOT NULL REFERENCES chambers(id) ON DELETE CASCADE,
    cm_member_id        UUID NOT NULL REFERENCES chambermaster_members(id),
    requested_by        UUID NOT NULL REFERENCES profiles(id),

    -- Info provided by the person claiming
    contact_email       VARCHAR(255) NOT NULL,
    contact_name        VARCHAR(255),
    contact_phone       VARCHAR(20),
    message             TEXT,                             -- "I'm John, I own John's Hardware"

    -- Resolution
    status              VARCHAR(20) DEFAULT 'pending',   -- pending, approved, denied
    resolved_by         UUID REFERENCES profiles(id),    -- Chamber admin
    resolved_at         TIMESTAMPTZ,
    denial_reason       TEXT,

    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_claims_chamber ON claim_requests(chamber_id);
CREATE INDEX idx_claims_status ON claim_requests(status);


-- ============================================================================
-- 12. NOTIFICATIONS
-- In-app notifications for merchants and chamber admins.
-- ============================================================================

CREATE TABLE notifications (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    type                VARCHAR(50) NOT NULL,             -- 'new_order', 'claim_request',
                                                          -- 'low_stock', 'membership_lapsed',
                                                          -- 'payout_sent', etc.
    title               VARCHAR(255) NOT NULL,
    message             TEXT,
    link                TEXT,                              -- Deep link to relevant page

    is_read             BOOLEAN DEFAULT FALSE,
    read_at             TIMESTAMPTZ,

    -- Optional references for context
    order_id            UUID REFERENCES orders(id),
    merchant_id         UUID REFERENCES merchants(id),
    claim_id            UUID REFERENCES claim_requests(id),

    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id) WHERE is_read = FALSE;


-- ============================================================================
-- 13. CHAMBERMASTER SYNC LOG
-- Track sync history for debugging and monitoring.
-- ============================================================================

CREATE TABLE sync_log (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chamber_id          UUID NOT NULL REFERENCES chambers(id) ON DELETE CASCADE,
    sync_type           VARCHAR(50) NOT NULL,             -- 'chambermaster', 'shopify', 'square'
    merchant_id         UUID REFERENCES merchants(id),    -- NULL for chamber-level syncs

    status              VARCHAR(20) NOT NULL,             -- 'started', 'completed', 'failed'
    members_added       INTEGER DEFAULT 0,
    members_updated     INTEGER DEFAULT 0,
    members_deactivated INTEGER DEFAULT 0,
    products_added      INTEGER DEFAULT 0,
    products_updated    INTEGER DEFAULT 0,
    error_message       TEXT,

    started_at          TIMESTAMPTZ DEFAULT NOW(),
    completed_at        TIMESTAMPTZ
);

CREATE INDEX idx_sync_log_chamber ON sync_log(chamber_id);
CREATE INDEX idx_sync_log_merchant ON sync_log(merchant_id);


-- ============================================================================
-- 14. PLATFORM SETTINGS
-- Global platform configuration. Single row table.
-- ============================================================================

CREATE TABLE platform_settings (
    id                  INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- Only one row
    platform_name       VARCHAR(255) DEFAULT 'Shop Local',
    default_fee_percent DECIMAL(4,2) DEFAULT 3.00,
    support_email       VARCHAR(255),
    maintenance_mode    BOOLEAN DEFAULT FALSE,

    updated_at          TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER tr_chambers_updated BEFORE UPDATE ON chambers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_profiles_updated BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_cm_members_updated BEFORE UPDATE ON chambermaster_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_merchants_updated BEFORE UPDATE ON merchants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_integrations_updated BEFORE UPDATE ON merchant_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_categories_updated BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_products_updated BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_orders_updated BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_claims_updated BEFORE UPDATE ON claim_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- AUTO-DEACTIVATE MERCHANTS ON MEMBERSHIP LAPSE
-- When ChamberMaster sync updates a member to inactive/deleted,
-- this trigger deactivates the associated merchant.
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_membership_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- If member status changed to inactive or deleted
    IF NEW.member_status IN ('inactive', 'deleted')
       AND OLD.member_status = 'active' THEN

        -- Deactivate the merchant
        UPDATE merchants
        SET status = 'inactive',
            deactivated_at = NOW(),
            deactivation_reason = 'ChamberMaster membership status changed to ' || NEW.member_status::TEXT
        WHERE cm_member_id = NEW.id
          AND status = 'active';

        -- Set all their products to archived
        UPDATE products
        SET status = 'archived'
        WHERE merchant_id = (
            SELECT id FROM merchants WHERE cm_member_id = NEW.id
        )
        AND status = 'active';

    -- If member status changed back to active (renewal)
    ELSIF NEW.member_status = 'active'
          AND OLD.member_status IN ('inactive', 'deleted') THEN

        -- Reactivate the merchant (but leave products archived - merchant can re-enable)
        UPDATE merchants
        SET status = 'active',
            deactivated_at = NULL,
            deactivation_reason = NULL
        WHERE cm_member_id = NEW.id
          AND status = 'inactive';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_membership_status_change
    AFTER UPDATE OF member_status ON chambermaster_members
    FOR EACH ROW EXECUTE FUNCTION handle_membership_status_change();


-- ============================================================================
-- AUTO-DECREMENT INVENTORY ON ORDER PLACEMENT
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_order_item_created()
RETURNS TRIGGER AS $$
BEGIN
    -- Decrement product quantity
    UPDATE products
    SET quantity = quantity - NEW.quantity
    WHERE id = NEW.product_id
      AND track_inventory = TRUE;

    -- Check if product is now out of stock
    UPDATE products
    SET status = 'out_of_stock'
    WHERE id = NEW.product_id
      AND quantity <= 0
      AND track_inventory = TRUE
      AND status = 'active';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_order_item_created
    AFTER INSERT ON order_items
    FOR EACH ROW EXECUTE FUNCTION handle_order_item_created();


-- ============================================================================
-- SEED DATA - DEFAULT CATEGORIES
-- ============================================================================

INSERT INTO categories (name, slug, display_order) VALUES
    ('Home & Garden', 'home-garden', 1),
    ('Food & Drink', 'food-drink', 2),
    ('Clothing & Accessories', 'clothing-accessories', 3),
    ('Health & Beauty', 'health-beauty', 4),
    ('Arts & Crafts', 'arts-crafts', 5),
    ('Toys & Games', 'toys-games', 6),
    ('Books & Media', 'books-media', 7),
    ('Sports & Outdoors', 'sports-outdoors', 8),
    ('Electronics', 'electronics', 9),
    ('Pets', 'pets', 10),
    ('Baby & Kids', 'baby-kids', 11),
    ('Gifts & Seasonal', 'gifts-seasonal', 12),
    ('Other', 'other', 99);

INSERT INTO platform_settings (platform_name, default_fee_percent, support_email)
VALUES ('Shop Local', 3.00, 'support@shoplocal.com');
