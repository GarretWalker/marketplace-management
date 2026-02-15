import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { generateSlug } from '../utils/slug';
import {
  Product,
  ProductImage,
  ProductWithImages,
  CreateProductInput,
  UpdateProductInput,
  ProductListFilters,
  UpdateInventoryInput,
} from '../types/product.types';

export class ProductService {
  /**
   * Create a new product
   */
  async createProduct(
    merchantId: string,
    input: CreateProductInput
  ): Promise<{ data: Product | null; error: string | null }> {
    try {
      // Generate slug from product name
      const baseSlug = generateSlug(input.name);
      let slug = baseSlug;
      let counter = 1;

      // Check for slug collisions within merchant's products
      while (true) {
        const { data: existing } = await supabase
          .from('products')
          .select('id')
          .eq('merchant_id', merchantId)
          .eq('slug', slug)
          .single();

        if (!existing) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Create product
      const { data, error } = await supabase
        .from('products')
        .insert({
          merchant_id: merchantId,
          name: input.name,
          slug,
          description: input.description,
          short_description: input.shortDescription,
          category_id: input.categoryId,
          price: input.price,
          compare_at_price: input.compareAtPrice,
          quantity: input.quantity,
          low_stock_threshold: input.lowStockThreshold || 5,
          sku: input.sku,
          weight: input.weight,
          tags: input.tags,
          status: input.status,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create product', { error, merchantId, input });
        return { data: null, error: error.message };
      }

      logger.info('Product created', { productId: data.id, merchantId });
      return { data: this.mapProduct(data), error: null };
    } catch (err: any) {
      logger.error('Error creating product', { err: err.message, merchantId });
      return { data: null, error: 'Failed to create product' };
    }
  }

  /**
   * Get products with filters, sorting, pagination
   */
  async getProducts(
    filters: ProductListFilters
  ): Promise<{ data: ProductWithImages[] | null; error: string | null; total?: number }> {
    try {
      let query = supabase
        .from('products')
        .select('*, product_images(*), categories(name)', { count: 'exact' });

      // Apply filters
      if (filters.merchantId) {
        query = query.eq('merchant_id', filters.merchantId);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }

      // Apply sorting
      const sortBy = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder || 'desc';
      const sortCol = this.getSortColumn(sortBy);
      query = query.order(sortCol, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        logger.error('Failed to get products', { error, filters });
        return { data: null, error: error.message };
      }

      const products = data.map((p: any) => this.mapProductWithImages(p));
      return { data: products, error: null, total: count || 0 };
    } catch (err: any) {
      logger.error('Error getting products', { err: err.message, filters });
      return { data: null, error: 'Failed to get products' };
    }
  }

  /**
   * Get single product by ID
   */
  async getProductById(
    productId: string,
    merchantId?: string
  ): Promise<{ data: ProductWithImages | null; error: string | null }> {
    try {
      let query = supabase
        .from('products')
        .select('*, product_images(*), categories(name)')
        .eq('id', productId);

      if (merchantId) {
        query = query.eq('merchant_id', merchantId);
      }

      const { data, error } = await query.single();

      if (error) {
        logger.error('Failed to get product', { error, productId, merchantId });
        return { data: null, error: error.message };
      }

      return { data: this.mapProductWithImages(data), error: null };
    } catch (err: any) {
      logger.error('Error getting product', { err: err.message, productId });
      return { data: null, error: 'Failed to get product' };
    }
  }

  /**
   * Update product
   */
  async updateProduct(
    productId: string,
    merchantId: string,
    input: UpdateProductInput
  ): Promise<{ data: Product | null; error: string | null }> {
    try {
      // If name is being updated, regenerate slug
      let slug: string | undefined;
      if (input.name) {
        const baseSlug = generateSlug(input.name);
        slug = baseSlug;
        let counter = 1;

        while (true) {
          const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('merchant_id', merchantId)
            .eq('slug', slug)
            .neq('id', productId)
            .single();

          if (!existing) break;
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
      }

      const updateData: any = {
        ...input,
        updated_at: new Date().toISOString(),
      };

      if (slug) {
        updateData.slug = slug;
      }

      // Convert camelCase to snake_case for database
      const dbUpdate = {
        name: updateData.name,
        slug: updateData.slug,
        description: updateData.description,
        short_description: updateData.shortDescription,
        category_id: updateData.categoryId,
        price: updateData.price,
        compare_at_price: updateData.compareAtPrice,
        quantity: updateData.quantity,
        low_stock_threshold: updateData.lowStockThreshold,
        sku: updateData.sku,
        weight: updateData.weight,
        tags: updateData.tags,
        status: updateData.status,
        updated_at: updateData.updated_at,
      };

      // Remove undefined fields
      Object.keys(dbUpdate).forEach(
        (key) => (dbUpdate as any)[key] === undefined && delete (dbUpdate as any)[key]
      );

      const { data, error } = await supabase
        .from('products')
        .update(dbUpdate)
        .eq('id', productId)
        .eq('merchant_id', merchantId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update product', { error, productId, merchantId });
        return { data: null, error: error.message };
      }

      logger.info('Product updated', { productId, merchantId });
      return { data: this.mapProduct(data), error: null };
    } catch (err: any) {
      logger.error('Error updating product', { err: err.message, productId });
      return { data: null, error: 'Failed to update product' };
    }
  }

  /**
   * Soft delete product (archive)
   */
  async deleteProduct(
    productId: string,
    merchantId: string
  ): Promise<{ data: Product | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('products')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', productId)
        .eq('merchant_id', merchantId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to delete product', { error, productId, merchantId });
        return { data: null, error: error.message };
      }

      logger.info('Product archived', { productId, merchantId });
      return { data: this.mapProduct(data), error: null };
    } catch (err: any) {
      logger.error('Error deleting product', { err: err.message, productId });
      return { data: null, error: 'Failed to delete product' };
    }
  }

  /**
   * Quick inventory update
   */
  async updateInventory(
    productId: string,
    merchantId: string,
    input: UpdateInventoryInput
  ): Promise<{ data: Product | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('products')
        .update({ quantity: input.quantity, updated_at: new Date().toISOString() })
        .eq('id', productId)
        .eq('merchant_id', merchantId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update inventory', { error, productId, merchantId });
        return { data: null, error: error.message };
      }

      logger.info('Inventory updated', { productId, merchantId, quantity: input.quantity });
      return { data: this.mapProduct(data), error: null };
    } catch (err: any) {
      logger.error('Error updating inventory', { err: err.message, productId });
      return { data: null, error: 'Failed to update inventory' };
    }
  }

  /**
   * Add product image
   */
  async addImage(
    productId: string,
    storageUrl: string,
    isPrimary: boolean = false
  ): Promise<{ data: ProductImage | null; error: string | null }> {
    try {
      // If this is primary, unset others
      if (isPrimary) {
        await supabase
          .from('product_images')
          .update({ is_primary: false })
          .eq('product_id', productId);
      }

      // Get next display order
      const { data: images } = await supabase
        .from('product_images')
        .select('display_order')
        .eq('product_id', productId)
        .order('display_order', { ascending: false })
        .limit(1);

      const displayOrder = images && images.length > 0 ? images[0].display_order + 1 : 0;

      const { data, error } = await supabase
        .from('product_images')
        .insert({
          product_id: productId,
          storage_url: storageUrl,
          display_order: displayOrder,
          is_primary: isPrimary,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to add image', { error, productId });
        return { data: null, error: error.message };
      }

      logger.info('Image added', { imageId: data.id, productId });
      return { data: this.mapProductImage(data), error: null };
    } catch (err: any) {
      logger.error('Error adding image', { err: err.message, productId });
      return { data: null, error: 'Failed to add image' };
    }
  }

  /**
   * Reorder images
   */
  async reorderImages(
    productId: string,
    merchantId: string,
    imageIds: string[]
  ): Promise<{ data: boolean; error: string | null }> {
    try {
      // Verify product belongs to merchant
      const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('id', productId)
        .eq('merchant_id', merchantId)
        .single();

      if (!product) {
        return { data: false, error: 'Product not found' };
      }

      // Update display orders
      for (let i = 0; i < imageIds.length; i++) {
        await supabase
          .from('product_images')
          .update({ display_order: i })
          .eq('id', imageIds[i])
          .eq('product_id', productId);
      }

      logger.info('Images reordered', { productId, count: imageIds.length });
      return { data: true, error: null };
    } catch (err: any) {
      logger.error('Error reordering images', { err: err.message, productId });
      return { data: false, error: 'Failed to reorder images' };
    }
  }

  /**
   * Delete image
   */
  async deleteImage(
    imageId: string,
    productId: string,
    merchantId: string
  ): Promise<{ data: boolean; error: string | null }> {
    try {
      // Verify product belongs to merchant
      const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('id', productId)
        .eq('merchant_id', merchantId)
        .single();

      if (!product) {
        return { data: false, error: 'Product not found' };
      }

      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId)
        .eq('product_id', productId);

      if (error) {
        logger.error('Failed to delete image', { error, imageId, productId });
        return { data: false, error: error.message };
      }

      logger.info('Image deleted', { imageId, productId });
      return { data: true, error: null };
    } catch (err: any) {
      logger.error('Error deleting image', { err: err.message, imageId });
      return { data: false, error: 'Failed to delete image' };
    }
  }

  /**
   * Map database product to Product type
   */
  private mapProduct(data: any): Product {
    return {
      id: data.id,
      merchantId: data.merchant_id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      shortDescription: data.short_description,
      categoryId: data.category_id,
      price: data.price,
      compareAtPrice: data.compare_at_price,
      quantity: data.quantity,
      lowStockThreshold: data.low_stock_threshold,
      sku: data.sku,
      weight: data.weight,
      tags: data.tags,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Map database product with images to ProductWithImages type
   */
  private mapProductWithImages(data: any): ProductWithImages {
    return {
      ...this.mapProduct(data),
      images: (data.product_images || []).map((img: any) => this.mapProductImage(img)),
      categoryName: data.categories?.name,
    };
  }

  /**
   * Map database image to ProductImage type
   */
  private mapProductImage(data: any): ProductImage {
    return {
      id: data.id,
      productId: data.product_id,
      storageUrl: data.storage_url,
      displayOrder: data.display_order,
      isPrimary: data.is_primary,
      createdAt: data.created_at,
    };
  }

  /**
   * Get database column name for sort field
   */
  private getSortColumn(sortBy: string): string {
    const mapping: Record<string, string> = {
      name: 'name',
      price: 'price',
      createdAt: 'created_at',
      quantity: 'quantity',
    };
    return mapping[sortBy] || 'created_at';
  }
}

export const productService = new ProductService();
