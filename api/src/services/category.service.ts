import { supabaseAdmin } from '../config/supabase';
import { logger } from '../config/pino';

export const categoryService = {
  /**
   * Get all categories
   * Returns all rows from the categories table, ordered by name
   */
  async getAll() {
    logger.info('Fetching all categories');

    const { data: categories, error } = await supabaseAdmin
      .from('categories')
      .select('id, name, slug, description')
      .order('name', { ascending: true });

    if (error) {
      logger.error({ error }, 'Failed to fetch categories');
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    logger.info({ count: categories?.length || 0 }, 'Categories fetched');
    return categories || [];
  }
};
