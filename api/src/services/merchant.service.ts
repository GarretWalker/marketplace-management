import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

interface Merchant {
  id: string;
  chamberId: string;
  cmMemberId?: string;
  businessName: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  contactEmail: string;
  phone?: string;
  websiteUrl?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip?: string;
  status: 'active' | 'pending' | 'suspended';
  approvedAt?: string;
  approvedBy?: string;
  deactivatedAt?: string;
  deactivationReason?: string;
  stripeAccountId?: string;
  stripeOnboardingComplete: boolean;
  stripePayoutsEnabled: boolean;
  offersLocalPickup: boolean;
  offersFlatRate: boolean;
  flatRateAmount?: number;
  offersStandardShipping: boolean;
  shippingNotes?: string;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  createdAt: string;
  updatedAt: string;
}

interface UpdateMerchantInput {
  description?: string;
  logoUrl?: string;
  phone?: string;
  websiteUrl?: string;
  offersLocalPickup?: boolean;
  offersFlatRate?: boolean;
  flatRateAmount?: number;
  offersStandardShipping?: boolean;
  shippingNotes?: string;
}

export class MerchantService {
  /**
   * Get merchant by user ID (from profile)
   */
  async getMerchantByUserId(userId: string): Promise<Merchant | null> {
    // First get the profile to find the merchant_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('merchant_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile || !profile.merchant_id) {
      return null;
    }

    // Then get the merchant record
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select()
      .eq('id', profile.merchant_id)
      .single();

    if (merchantError || !merchant) {
      return null;
    }

    return this.mapMerchantFromDb(merchant);
  }

  /**
   * Get merchant by ID
   */
  async getMerchantById(merchantId: string): Promise<Merchant | null> {
    const { data: merchant, error } = await supabase
      .from('merchants')
      .select()
      .eq('id', merchantId)
      .single();

    if (error || !merchant) {
      return null;
    }

    return this.mapMerchantFromDb(merchant);
  }

  /**
   * Update merchant settings
   */
  async updateMerchant(merchantId: string, input: UpdateMerchantInput): Promise<Merchant> {
    const { data: merchant, error } = await supabase
      .from('merchants')
      .update({
        description: input.description,
        logo_url: input.logoUrl,
        phone: input.phone,
        website_url: input.websiteUrl,
        offers_local_pickup: input.offersLocalPickup,
        offers_flat_rate: input.offersFlatRate,
        flat_rate_amount: input.flatRateAmount,
        offers_standard_shipping: input.offersStandardShipping,
        shipping_notes: input.shippingNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', merchantId)
      .select()
      .single();

    if (error) {
      logger.error({ error, merchantId }, 'Failed to update merchant');
      throw new Error('Failed to update merchant');
    }

    logger.info({ merchantId }, 'Merchant updated');

    return this.mapMerchantFromDb(merchant);
  }

  /**
   * Map database record to Merchant type
   */
  private mapMerchantFromDb(record: any): Merchant {
    return {
      id: record.id,
      chamberId: record.chamber_id,
      cmMemberId: record.cm_member_id,
      businessName: record.business_name,
      slug: record.slug,
      description: record.description,
      logoUrl: record.logo_url,
      coverImageUrl: record.cover_image_url,
      contactEmail: record.contact_email,
      phone: record.phone,
      websiteUrl: record.website_url,
      addressLine1: record.address_line1,
      addressLine2: record.address_line2,
      city: record.city,
      state: record.state,
      zip: record.zip,
      status: record.status,
      approvedAt: record.approved_at,
      approvedBy: record.approved_by,
      deactivatedAt: record.deactivated_at,
      deactivationReason: record.deactivation_reason,
      stripeAccountId: record.stripe_account_id,
      stripeOnboardingComplete: record.stripe_onboarding_complete,
      stripePayoutsEnabled: record.stripe_payouts_enabled,
      offersLocalPickup: record.offers_local_pickup,
      offersFlatRate: record.offers_flat_rate,
      flatRateAmount: record.flat_rate_amount,
      offersStandardShipping: record.offers_standard_shipping,
      shippingNotes: record.shipping_notes,
      totalProducts: record.total_products,
      totalOrders: record.total_orders,
      totalRevenue: record.total_revenue,
      createdAt: record.created_at,
      updatedAt: record.updated_at
    };
  }
}

export const merchantService = new MerchantService();
