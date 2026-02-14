import { supabase } from '../config/supabase';
import { logger } from '../config/pino';

interface CreateChamberInput {
  name: string;
  slug: string;
  city: string;
  state: string;
  contact_email: string;
  phone?: string;
  website_url?: string;
  chambermaster_association_id?: string;
  chambermaster_api_key?: string;
  chambermaster_base_url?: string;
  chambermaster_sync_enabled?: boolean;
}

interface UpdateChamberInput {
  name?: string;
  city?: string;
  state?: string;
  contact_email?: string;
  phone?: string;
  website_url?: string;
  tagline?: string;
  logo_url?: string;
  hero_image_url?: string;
  primary_color?: string;
  accent_color?: string;
  chambermaster_association_id?: string;
  chambermaster_api_key?: string;
  chambermaster_base_url?: string;
  chambermaster_sync_enabled?: boolean;
}

interface BrandingUploadInput {
  logo_url?: string;
  hero_image_url?: string;
}

export const chamberService = {
  /**
   * Create a new chamber and associate it with the chamber admin
   *
   * This is a two-step process:
   * 1. Create the chamber record in the database
   * 2. Link the chamber to the admin's profile (chamber_id foreign key)
   *
   * If step 2 fails, we rollback step 1 to maintain data integrity.
   * Note: is_active defaults to false - chamber admins must "launch" later.
   *
   * @param userId - The ID of the user creating the chamber (from req.user)
   * @param input - Chamber details from setup wizard
   * @returns The created chamber record
   * @throws Error if creation or linking fails
   */
  async create(userId: string, input: CreateChamberInput) {
    logger.info({ userId, chamberName: input.name }, 'Creating new chamber');

    // Step 1: Insert chamber record
    const { data: chamber, error: chamberError } = await supabase
      .from('chambers')
      .insert({
        name: input.name,
        slug: input.slug,
        city: input.city,
        state: input.state,
        contact_email: input.contact_email,
        phone: input.phone,
        website_url: input.website_url,
        chambermaster_association_id: input.chambermaster_association_id,
        chambermaster_api_key: input.chambermaster_api_key,
        chambermaster_base_url: input.chambermaster_base_url,
        chambermaster_sync_enabled: input.chambermaster_sync_enabled || false,
        is_active: false  // New chambers start inactive until admin launches them
      })
      .select()
      .single();

    if (chamberError) {
      logger.error({ error: chamberError }, 'Failed to create chamber');
      throw new Error(`Failed to create chamber: ${chamberError.message}`);
    }

    // Step 2: Link the chamber to the user's profile
    // This establishes the chamber admin relationship
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ chamber_id: chamber.id })
      .eq('id', userId);

    if (profileError) {
      logger.error({ error: profileError, chamberId: chamber.id }, 'Failed to link chamber to profile - rolling back chamber creation');

      // ROLLBACK: Delete the chamber we just created
      // This prevents orphaned chamber records in the database
      // We do this manually since Supabase client doesn't support transactions
      const { error: deleteError } = await supabase
        .from('chambers')
        .delete()
        .eq('id', chamber.id);

      if (deleteError) {
        logger.error({ error: deleteError, chamberId: chamber.id }, 'Failed to rollback chamber creation');
        // Note: We log but don't throw here to preserve the original error
      }

      throw new Error(`Failed to link chamber to profile: ${profileError.message}`);
    }

    logger.info({ chamberId: chamber.id }, 'Chamber created successfully');
    return chamber;
  },

  /**
   * Get chamber by ID (with authorization check)
   *
   * Authorization logic:
   * - Chamber admins can only access their own chamber (checked via profile.chamber_id)
   * - Public endpoints may call this without userId to skip auth check
   *
   * @param chamberId - The chamber ID to fetch
   * @param userId - Optional user ID for authorization check
   * @returns The chamber record
   * @throws Error if not found or user doesn't have access
   */
  async getById(chamberId: string, userId?: string) {
    const { data: chamber, error } = await supabase
      .from('chambers')
      .select('*')
      .eq('id', chamberId)
      .single();

    if (error) {
      logger.error({ error, chamberId }, 'Failed to fetch chamber');
      throw new Error(`Failed to fetch chamber: ${error.message}`);
    }

    if (!chamber) {
      throw new Error('Chamber not found');
    }

    // Authorization: Verify the user has access to this chamber
    // Chamber admins can only access their own chamber
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('chamber_id, role')
        .eq('id', userId)
        .single();

      if (profile?.role === 'chamber_admin' && profile.chamber_id !== chamberId) {
        throw new Error('Forbidden: You do not have access to this chamber');
      }
    }

    return chamber;
  },

  /**
   * Update chamber details
   */
  async update(chamberId: string, userId: string | undefined, input: UpdateChamberInput) {
    logger.info({ chamberId, userId }, 'Updating chamber');

    // Verify user has access
    await this.getById(chamberId, userId);

    const { data: chamber, error } = await supabase
      .from('chambers')
      .update(input)
      .eq('id', chamberId)
      .select()
      .single();

    if (error) {
      logger.error({ error, chamberId }, 'Failed to update chamber');
      throw new Error(`Failed to update chamber: ${error.message}`);
    }

    logger.info({ chamberId }, 'Chamber updated successfully');
    return chamber;
  },

  /**
   * Update chamber branding assets (logo and hero image)
   *
   * Current implementation: Expects URLs to already-uploaded images
   * Future enhancement: Add multipart file upload endpoint to upload directly to Supabase Storage
   *
   * @param chamberId - The chamber to update
   * @param userId - User ID for authorization check
   * @param input - Branding URLs (logo_url and/or hero_image_url)
   * @returns Updated chamber record
   */
  async uploadBranding(
    chamberId: string,
    userId: string | undefined,
    input: BrandingUploadInput
  ) {
    logger.info({ chamberId, userId }, 'Updating chamber branding');

    // Verify user has access to this chamber (throws if not authorized)
    await this.getById(chamberId, userId);

    // Build update object with only provided fields
    const updateData: Partial<UpdateChamberInput> = {};
    if (input.logo_url) updateData.logo_url = input.logo_url;
    if (input.hero_image_url) updateData.hero_image_url = input.hero_image_url;

    const { data: chamber, error } = await supabase
      .from('chambers')
      .update(updateData)
      .eq('id', chamberId)
      .select()
      .single();

    if (error) {
      logger.error({ error, chamberId }, 'Failed to update chamber branding');
      throw new Error(`Failed to update branding: ${error.message}`);
    }

    logger.info({ chamberId }, 'Chamber branding updated successfully');
    return chamber;
  }
};
