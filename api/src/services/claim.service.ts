import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { generateSlug } from '../utils/slug';

interface CreateClaimInput {
  chamberId: string;
  cmMemberId: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  message?: string;
}

interface ClaimRequest {
  id: string;
  chamberId: string;
  cmMemberId: string;
  requestedBy: string;
  contactEmail: string;
  contactName: string;
  contactPhone?: string;
  message?: string;
  status: 'pending' | 'approved' | 'denied';
  resolvedBy?: string;
  resolvedAt?: string;
  denialReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface ClaimWithMemberData extends ClaimRequest {
  memberData: {
    businessName: string;
    email?: string;
    phone?: string;
    address: string;
    category?: string;
  };
}

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

export class ClaimService {
  /**
   * Submit a new claim request
   */
  async createClaim(userId: string, input: CreateClaimInput): Promise<ClaimRequest> {
    // Check if user already has a merchant account
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('merchant_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      throw new Error('Failed to fetch user profile');
    }

    if (profile.merchant_id) {
      throw new Error('You already have a merchant account');
    }

    // Check if user already has a pending claim
    const { data: existingClaim, error: existingClaimError } = await supabase
      .from('claim_requests')
      .select('id, status')
      .eq('requested_by', userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingClaimError) {
      throw new Error('Failed to check existing claims');
    }

    if (existingClaim) {
      throw new Error('You already have a pending claim request');
    }

    // Verify the ChamberMaster member exists and isn't already claimed
    const { data: member, error: memberError } = await supabase
      .from('chambermaster_members')
      .select('id, is_claimed, business_name, chamber_id')
      .eq('id', input.cmMemberId)
      .eq('chamber_id', input.chamberId)
      .single();

    if (memberError || !member) {
      throw new Error('ChamberMaster member not found');
    }

    if (member.is_claimed) {
      throw new Error('This business has already been claimed');
    }

    // Create the claim request
    const { data: claim, error: claimError } = await supabase
      .from('claim_requests')
      .insert({
        chamber_id: input.chamberId,
        cm_member_id: input.cmMemberId,
        requested_by: userId,
        contact_email: input.contactEmail,
        contact_name: input.contactName,
        contact_phone: input.contactPhone,
        message: input.message,
        status: 'pending'
      })
      .select()
      .single();

    if (claimError) {
      logger.error({ error: claimError }, 'Failed to create claim request');
      throw new Error('Failed to create claim request');
    }

    logger.info({ claimId: claim.id, userId, businessName: member.business_name }, 
      'Claim request created');

    return this.mapClaimFromDb(claim);
  }

  /**
   * Get all claims for a chamber
   */
  async getClaimsByChamber(chamberId: string, status?: string): Promise<ClaimWithMemberData[]> {
    let query = supabase
      .from('claim_requests')
      .select(`
        *,
        chambermaster_members!inner(
          business_name,
          email,
          phone,
          address_line1,
          address_line2,
          city,
          state,
          zip,
          category
        )
      `)
      .eq('chamber_id', chamberId);

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data: claims, error } = await query;

    if (error) {
      logger.error({ error }, 'Failed to fetch claims');
      throw new Error('Failed to fetch claims');
    }

    return (claims || []).map(claim => ({
      ...this.mapClaimFromDb(claim),
      memberData: {
        businessName: claim.chambermaster_members.business_name,
        email: claim.chambermaster_members.email,
        phone: claim.chambermaster_members.phone,
        address: [
          claim.chambermaster_members.address_line1,
          claim.chambermaster_members.address_line2,
          claim.chambermaster_members.city,
          claim.chambermaster_members.state,
          claim.chambermaster_members.zip
        ].filter(Boolean).join(', '),
        category: claim.chambermaster_members.category
      }
    }));
  }

  /**
   * Approve a claim request (TRANSACTIONAL)
   * 1. Create merchant record from CM member data
   * 2. Update profile with merchant_id
   * 3. Set cm_member.is_claimed = true
   * 4. Create notification record
   * 5. Update claim status
   */
  async approveClaim(claimId: string, approvedBy: string): Promise<Merchant> {
    // Fetch the claim with member data
    const { data: claim, error: claimError } = await supabase
      .from('claim_requests')
      .select(`
        *,
        chambermaster_members!inner(
          id,
          business_name,
          contact_name,
          email,
          phone,
          website_url,
          address_line1,
          address_line2,
          city,
          state,
          zip
        )
      `)
      .eq('id', claimId)
      .single();

    if (claimError || !claim) {
      throw new Error('Claim request not found');
    }

    if (claim.status !== 'pending') {
      throw new Error('Claim has already been resolved');
    }

    const member = claim.chambermaster_members;
    const slug = generateSlug(member.business_name);

    let merchantId: string | null = null;

    try {
      // Step 1: Create merchant record from CM member data
      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .insert({
          chamber_id: claim.chamber_id,
          cm_member_id: member.id,
          business_name: member.business_name,
          slug,
          contact_email: member.email || claim.contact_email,
          phone: member.phone || claim.contact_phone,
          website_url: member.website_url,
          address_line1: member.address_line1,
          address_line2: member.address_line2,
          city: member.city,
          state: member.state,
          zip: member.zip,
          status: 'active',
          approved_at: new Date().toISOString(),
          approved_by: approvedBy
        })
        .select()
        .single();

      if (merchantError) {
        throw new Error('Failed to create merchant record');
      }

      merchantId = merchant.id;

      // Step 2: Update profile with merchant_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ merchant_id: merchantId })
        .eq('id', claim.requested_by);

      if (profileError) {
        throw new Error('Failed to link profile to merchant');
      }

      // Step 3: Set cm_member.is_claimed = true
      const { error: memberUpdateError } = await supabase
        .from('chambermaster_members')
        .update({ 
          is_claimed: true,
          claimed_by: claim.requested_by,
          claimed_at: new Date().toISOString()
        })
        .eq('id', member.id);

      if (memberUpdateError) {
        throw new Error('Failed to mark member as claimed');
      }

      // Step 4: Create notification record
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          recipient_id: claim.requested_by,
          type: 'claim_approved',
          title: 'Your business claim was approved!',
          message: `Your claim for ${merchant.business_name} has been approved. You can now start adding products.`,
          link: '/merchant/dashboard',
          claim_id: claimId,
          merchant_id: merchantId
        });

      if (notificationError) {
        throw new Error('Failed to create notification');
      }

      // Step 5: Update claim status
      const { error: claimUpdateError } = await supabase
        .from('claim_requests')
        .update({
          status: 'approved',
          resolved_by: approvedBy,
          resolved_at: new Date().toISOString()
        })
        .eq('id', claimId);

      if (claimUpdateError) {
        throw new Error('Failed to update claim status');
      }

      logger.info({ 
        claimId, 
        merchantId: merchant.id, 
        businessName: merchant.business_name 
      }, 'Claim approved and merchant created');

      // Log email that WOULD be sent (stub per instructions)
      logger.info({
        recipient: merchant.contact_email,
        subject: 'Welcome to Shop Local!',
        body: `Your claim for ${merchant.business_name} has been approved. You can now log in to start adding products.`
      }, '[EMAIL STUB] Claim approved email');

      return this.mapMerchantFromDb(merchant);
    } catch (error) {
      // Rollback: If merchant was created but subsequent steps failed, delete it
      if (merchantId) {
        logger.warn({ merchantId, claimId }, 'Rolling back merchant creation due to error');
        await supabase.from('merchants').delete().eq('id', merchantId);
      }
      
      logger.error({ error, claimId }, 'Failed to approve claim');
      throw error;
    }
  }

  /**
   * Deny a claim request
   */
  async denyClaim(claimId: string, deniedBy: string, reason: string): Promise<void> {
    const { data: claim, error: claimError } = await supabase
      .from('claim_requests')
      .select('*, chambermaster_members!inner(business_name)')
      .eq('id', claimId)
      .single();

    if (claimError || !claim) {
      throw new Error('Claim request not found');
    }

    if (claim.status !== 'pending') {
      throw new Error('Claim has already been resolved');
    }

    const { error: updateError } = await supabase
      .from('claim_requests')
      .update({
        status: 'denied',
        resolved_by: deniedBy,
        resolved_at: new Date().toISOString(),
        denial_reason: reason
      })
      .eq('id', claimId);

    if (updateError) {
      logger.error({ error: updateError, claimId }, 'Failed to deny claim');
      throw new Error('Failed to deny claim');
    }

    logger.info({ claimId, reason }, 'Claim denied');

    // Log email that WOULD be sent (stub per instructions)
    logger.info({
      recipient: claim.contact_email,
      subject: 'Shop Local Claim Decision',
      body: `Your claim for ${claim.chambermaster_members.business_name} was not approved. Reason: ${reason}`
    }, '[EMAIL STUB] Claim denied email');
  }

  /**
   * Map database record to ClaimRequest type
   */
  private mapClaimFromDb(record: any): ClaimRequest {
    return {
      id: record.id,
      chamberId: record.chamber_id,
      cmMemberId: record.cm_member_id,
      requestedBy: record.requested_by,
      contactEmail: record.contact_email,
      contactName: record.contact_name,
      contactPhone: record.contact_phone,
      message: record.message,
      status: record.status,
      resolvedBy: record.resolved_by,
      resolvedAt: record.resolved_at,
      denialReason: record.denial_reason,
      createdAt: record.created_at,
      updatedAt: record.updated_at
    };
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

export const claimService = new ClaimService();
