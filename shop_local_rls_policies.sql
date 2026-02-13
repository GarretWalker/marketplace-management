-- ============================================================================
-- SHOP LOCAL MARKETPLACE - ROW LEVEL SECURITY POLICIES
-- Run AFTER shop_local_schema.sql
-- Date: February 13, 2026
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE chambers ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chambermaster_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get the current user's role from their profile
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get the current user's chamber_id (for chamber admins)
CREATE OR REPLACE FUNCTION get_user_chamber_id()
RETURNS UUID AS $$
  SELECT chamber_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get the current user's merchant_id (for merchants)
CREATE OR REPLACE FUNCTION get_user_merchant_id()
RETURNS UUID AS $$
  SELECT merchant_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ============================================================================
-- CHAMBERS
-- ============================================================================

-- Anyone can read active chambers (consumer site needs this)
CREATE POLICY chambers_public_read ON chambers
  FOR SELECT USING (is_active = TRUE);

-- Chamber admins can read their own chamber (even if not yet active)
CREATE POLICY chambers_admin_read ON chambers
  FOR SELECT USING (id = get_user_chamber_id());

-- Chamber admins can update their own chamber
CREATE POLICY chambers_admin_update ON chambers
  FOR UPDATE USING (id = get_user_chamber_id());

-- Chamber creation is handled by the API with service_role_key
-- No INSERT policy needed for regular users


-- ============================================================================
-- PROFILES
-- ============================================================================

-- Users can read their own profile
CREATE POLICY profiles_own_read ON profiles
  FOR SELECT USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY profiles_own_update ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Chamber admins can read profiles of merchants in their chamber
CREATE POLICY profiles_chamber_admin_read ON profiles
  FOR SELECT USING (
    get_user_role() = 'chamber_admin'
    AND merchant_id IN (
      SELECT id FROM merchants WHERE chamber_id = get_user_chamber_id()
    )
  );

-- Profile INSERT is handled by the auth trigger with service_role_key


-- ============================================================================
-- CHAMBERMASTER MEMBERS
-- ============================================================================

-- Chamber admins can read members in their chamber
CREATE POLICY cm_members_admin_read ON chambermaster_members
  FOR SELECT USING (chamber_id = get_user_chamber_id());

-- Merchants can read members in their chamber (for claim flow search)
CREATE POLICY cm_members_merchant_read ON chambermaster_members
  FOR SELECT USING (
    chamber_id IN (
      SELECT chamber_id FROM merchants WHERE id = get_user_merchant_id()
    )
  );

-- Any authenticated user can read active members (for claim flow)
-- They need to search for their business during onboarding
CREATE POLICY cm_members_auth_read ON chambermaster_members
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND member_status = 'active'
    AND is_claimed = FALSE
  );

-- All writes handled by API with service_role_key (sync process)


-- ============================================================================
-- MERCHANTS
-- ============================================================================

-- Public can read active merchants (consumer site)
CREATE POLICY merchants_public_read ON merchants
  FOR SELECT USING (status = 'active');

-- Merchants can read and update their own record
CREATE POLICY merchants_own_read ON merchants
  FOR SELECT USING (id = get_user_merchant_id());

CREATE POLICY merchants_own_update ON merchants
  FOR UPDATE USING (id = get_user_merchant_id());

-- Chamber admins can read all merchants in their chamber
CREATE POLICY merchants_admin_read ON merchants
  FOR SELECT USING (chamber_id = get_user_chamber_id());

-- Chamber admins can update merchants in their chamber (approve, suspend)
CREATE POLICY merchants_admin_update ON merchants
  FOR UPDATE USING (chamber_id = get_user_chamber_id());


-- ============================================================================
-- MERCHANT INTEGRATIONS
-- ============================================================================

-- Merchants can read their own integrations
CREATE POLICY integrations_own_read ON merchant_integrations
  FOR SELECT USING (
    merchant_id = get_user_merchant_id()
  );

-- All writes handled by API with service_role_key (OAuth flow)


-- ============================================================================
-- CATEGORIES
-- ============================================================================

-- Everyone can read active categories
CREATE POLICY categories_public_read ON categories
  FOR SELECT USING (is_active = TRUE);

-- Category management handled by API with service_role_key


-- ============================================================================
-- PRODUCTS
-- ============================================================================

-- Public can read active products (consumer site)
CREATE POLICY products_public_read ON products
  FOR SELECT USING (status = 'active');

-- Merchants can read all their own products (including drafts)
CREATE POLICY products_own_read ON products
  FOR SELECT USING (merchant_id = get_user_merchant_id());

-- Merchants can insert products for their own store
CREATE POLICY products_own_insert ON products
  FOR INSERT WITH CHECK (merchant_id = get_user_merchant_id());

-- Merchants can update their own products
CREATE POLICY products_own_update ON products
  FOR UPDATE USING (merchant_id = get_user_merchant_id());

-- Merchants can delete (archive) their own products
CREATE POLICY products_own_delete ON products
  FOR DELETE USING (merchant_id = get_user_merchant_id());

-- Chamber admins can read all products in their chamber
CREATE POLICY products_admin_read ON products
  FOR SELECT USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE chamber_id = get_user_chamber_id()
    )
  );


-- ============================================================================
-- PRODUCT IMAGES
-- ============================================================================

-- Public can read images of active products
CREATE POLICY product_images_public_read ON product_images
  FOR SELECT USING (
    product_id IN (SELECT id FROM products WHERE status = 'active')
  );

-- Merchants can CRUD images for their own products
CREATE POLICY product_images_own_read ON product_images
  FOR SELECT USING (
    product_id IN (
      SELECT id FROM products WHERE merchant_id = get_user_merchant_id()
    )
  );

CREATE POLICY product_images_own_insert ON product_images
  FOR INSERT WITH CHECK (
    product_id IN (
      SELECT id FROM products WHERE merchant_id = get_user_merchant_id()
    )
  );

CREATE POLICY product_images_own_delete ON product_images
  FOR DELETE USING (
    product_id IN (
      SELECT id FROM products WHERE merchant_id = get_user_merchant_id()
    )
  );


-- ============================================================================
-- ORDERS
-- ============================================================================

-- Customers can read their own orders
CREATE POLICY orders_customer_read ON orders
  FOR SELECT USING (customer_id = auth.uid());

-- Merchants can read orders for their store
CREATE POLICY orders_merchant_read ON orders
  FOR SELECT USING (merchant_id = get_user_merchant_id());

-- Merchants can update orders for their store (confirm, ship, etc.)
CREATE POLICY orders_merchant_update ON orders
  FOR UPDATE USING (merchant_id = get_user_merchant_id());

-- Chamber admins can read all orders in their chamber
CREATE POLICY orders_admin_read ON orders
  FOR SELECT USING (chamber_id = get_user_chamber_id());

-- Order creation handled by API with service_role_key
-- (needs to create order + items + trigger inventory in one transaction)


-- ============================================================================
-- ORDER ITEMS
-- ============================================================================

-- Customers can read items of their own orders
CREATE POLICY order_items_customer_read ON order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE customer_id = auth.uid())
  );

-- Merchants can read items of their orders
CREATE POLICY order_items_merchant_read ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders WHERE merchant_id = get_user_merchant_id()
    )
  );

-- Chamber admins can read all order items in their chamber
CREATE POLICY order_items_admin_read ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders WHERE chamber_id = get_user_chamber_id()
    )
  );


-- ============================================================================
-- CLAIM REQUESTS
-- ============================================================================

-- Users can read their own claim requests
CREATE POLICY claims_own_read ON claim_requests
  FOR SELECT USING (requested_by = auth.uid());

-- Users can create claim requests
CREATE POLICY claims_own_insert ON claim_requests
  FOR INSERT WITH CHECK (requested_by = auth.uid());

-- Chamber admins can read all claims in their chamber
CREATE POLICY claims_admin_read ON claim_requests
  FOR SELECT USING (chamber_id = get_user_chamber_id());

-- Chamber admins can update claims in their chamber (approve/deny)
CREATE POLICY claims_admin_update ON claim_requests
  FOR UPDATE USING (chamber_id = get_user_chamber_id());


-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

-- Users can read their own notifications
CREATE POLICY notifications_own_read ON notifications
  FOR SELECT USING (recipient_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY notifications_own_update ON notifications
  FOR UPDATE USING (recipient_id = auth.uid());

-- Notification creation handled by API with service_role_key


-- ============================================================================
-- SYNC LOG
-- ============================================================================

-- Chamber admins can read sync logs for their chamber
CREATE POLICY sync_log_admin_read ON sync_log
  FOR SELECT USING (chamber_id = get_user_chamber_id());

-- All writes handled by API with service_role_key


-- ============================================================================
-- PLATFORM SETTINGS
-- ============================================================================

-- Readable by API only (service_role_key)
-- No public or user-level read needed
-- Platform settings are fetched server-side and injected where needed


-- ============================================================================
-- SUPABASE STORAGE BUCKET POLICIES
-- ============================================================================
-- NOTE: These are configured via Supabase Dashboard or Management API,
-- not via SQL. Documenting the intended policies here for reference.
--
-- Bucket: chamber-assets
--   Public read: YES (logos, hero images are public)
--   Insert/Update: chamber_admin for their own chamber
--   Delete: chamber_admin for their own chamber
--
-- Bucket: merchant-assets
--   Public read: YES (store logos, cover images)
--   Insert/Update: merchant for their own store
--   Delete: merchant for their own store
--
-- Bucket: product-images
--   Public read: YES (product photos)
--   Insert/Update: merchant for their own products
--   Delete: merchant for their own products
--
-- File naming convention:
--   chamber-assets/{chamber_id}/logo.{ext}
--   chamber-assets/{chamber_id}/hero.{ext}
--   merchant-assets/{merchant_id}/logo.{ext}
--   merchant-assets/{merchant_id}/cover.{ext}
--   product-images/{merchant_id}/{product_id}/{filename}.{ext}
