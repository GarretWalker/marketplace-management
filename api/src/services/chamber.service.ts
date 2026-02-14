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
   */
  async create(userId: string, input: CreateChamberInput) {
    logger.info({ userId, chamberName: input.name }, 'Creating new chamber');

    // Insert chamber
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
        is_active: false
      })
      .select()
      .single();

    if (chamberError) {
      logger.error({ error: chamberError }, 'Failed to create chamber');
      throw new Error(`Failed to create chamber: ${chamberError.message}`);
    }

    // Update the user's profile to link them to this chamber
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ chamber_id: chamber.id })
      .eq('id', userId);

    if (profileError) {
      logger.error({ error: profileError }, 'Failed to link chamber to profile');
      // Consider rolling back chamber creation here
      throw new Error(`Failed to link chamber to profile: ${profileError.message}`);
    }

    logger.info({ chamberId: chamber.id }, 'Chamber created successfully');
    return chamber;
  },

  /**
   * Get chamber by ID (with authorization check)
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

    // Verify the user has access to this chamber
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
   * Upload branding assets to Supabase Storage
   * For now, this expects URLs to already-uploaded images
   * Full file upload will be handled by a separate multipart endpoint
   */
  async uploadBranding(
    chamberId: string,
    userId: string | undefined,
    input: BrandingUploadInput
  ) {
    logger.info({ chamberId, userId }, 'Updating chamber branding');

    // Verify user has access
    await this.getById(chamberId, userId);

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
