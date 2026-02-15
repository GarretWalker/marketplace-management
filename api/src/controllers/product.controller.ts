import { Request, Response, NextFunction } from 'express';
import { productService } from '../services/product.service';
import { logger } from '../utils/logger';
import { ProductListFilters } from '../types/product.types';

export class ProductController {
  /**
   * POST /api/products - Create product
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const merchantId = req.user!.merchant_id;

      if (!merchantId) {
        res.status(403).json({
          data: null,
          error: { code: 'FORBIDDEN', message: 'Merchant account required' },
        });
        return;
      }

      const { data, error } = await productService.createProduct(merchantId, req.body);

      if (error) {
        res.status(400).json({ data: null, error: { code: 'CREATE_FAILED', message: error } });
        return;
      }

      res.status(201).json({ data, error: null });
    } catch (error) {
      logger.error({ error }, 'Failed to create product');
      next(error);
    }
  }

  /**
   * GET /api/products - List products
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: ProductListFilters = {
        merchantId: req.query.merchant_id as string,
        status: req.query.status as string,
        categoryId: req.query.category_id as string,
        sortBy: req.query.sort_by as any,
        sortOrder: req.query.sort_order as any,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const { data, error, total } = await productService.getProducts(filters);

      if (error) {
        res.status(400).json({ data: null, error: { code: 'FETCH_FAILED', message: error } });
        return;
      }

      res.json({ data, error: null, meta: { total } });
    } catch (error) {
      logger.error({ error }, 'Failed to list products');
      next(error);
    }
  }

  /**
   * GET /api/products/:id - Get single product
   */
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = req.params.id;
      const merchantId = req.user?.merchant_id;

      const { data, error } = await productService.getProductById(productId, merchantId);

      if (error) {
        res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: error } });
        return;
      }

      res.json({ data, error: null });
    } catch (error) {
      logger.error({ error }, 'Failed to get product');
      next(error);
    }
  }

  /**
   * PUT /api/products/:id - Update product
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = req.params.id;
      const merchantId = req.user!.merchant_id;

      if (!merchantId) {
        res.status(403).json({
          data: null,
          error: { code: 'FORBIDDEN', message: 'Merchant account required' },
        });
        return;
      }

      const { data, error } = await productService.updateProduct(
        productId,
        merchantId,
        req.body
      );

      if (error) {
        res.status(400).json({ data: null, error: { code: 'UPDATE_FAILED', message: error } });
        return;
      }

      res.json({ data, error: null });
    } catch (error) {
      logger.error({ error }, 'Failed to update product');
      next(error);
    }
  }

  /**
   * DELETE /api/products/:id - Archive product
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = req.params.id;
      const merchantId = req.user!.merchant_id;

      if (!merchantId) {
        res.status(403).json({
          data: null,
          error: { code: 'FORBIDDEN', message: 'Merchant account required' },
        });
        return;
      }

      const { data, error } = await productService.deleteProduct(productId, merchantId);

      if (error) {
        res.status(400).json({ data: null, error: { code: 'DELETE_FAILED', message: error } });
        return;
      }

      res.json({ data, error: null });
    } catch (error) {
      logger.error({ error }, 'Failed to delete product');
      next(error);
    }
  }

  /**
   * POST /api/products/:id/images - Upload image (stub, no network on VPS)
   */
  async uploadImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = req.params.id;
      const merchantId = req.user!.merchant_id;

      if (!merchantId) {
        res.status(403).json({
          data: null,
          error: { code: 'FORBIDDEN', message: 'Merchant account required' },
        });
        return;
      }

      // Verify product belongs to merchant
      const { data: product, error: verifyError } = await productService.getProductById(
        productId,
        merchantId
      );

      if (verifyError || !product) {
        res.status(404).json({
          data: null,
          error: { code: 'NOT_FOUND', message: 'Product not found' },
        });
        return;
      }

      // NOTE: Image upload to Supabase Storage would happen here
      // For now, stub with logger since VPS has no network
      logger.info('Image upload requested (stubbed - no network on VPS)', {
        productId,
        merchantId,
      });

      // Stub response - in production, would return actual uploaded image
      res.status(501).json({
        data: null,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Image upload not available on VPS without network access',
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to upload image');
      next(error);
    }
  }

  /**
   * PUT /api/products/:id/images/reorder - Reorder images
   */
  async reorderImages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = req.params.id;
      const merchantId = req.user!.merchant_id;
      const { imageIds } = req.body;

      if (!merchantId) {
        res.status(403).json({
          data: null,
          error: { code: 'FORBIDDEN', message: 'Merchant account required' },
        });
        return;
      }

      if (!Array.isArray(imageIds)) {
        res.status(400).json({
          data: null,
          error: { code: 'VALIDATION_ERROR', message: 'imageIds must be an array' },
        });
        return;
      }

      const { data, error } = await productService.reorderImages(
        productId,
        merchantId,
        imageIds
      );

      if (error) {
        res.status(400).json({ data: null, error: { code: 'REORDER_FAILED', message: error } });
        return;
      }

      res.json({ data: { success: data }, error: null });
    } catch (error) {
      logger.error({ error }, 'Failed to reorder images');
      next(error);
    }
  }

  /**
   * DELETE /api/products/images/:imageId - Delete image
   */
  async deleteImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const imageId = req.params.imageId;
      const productId = req.query.product_id as string;
      const merchantId = req.user!.merchant_id;

      if (!merchantId) {
        res.status(403).json({
          data: null,
          error: { code: 'FORBIDDEN', message: 'Merchant account required' },
        });
        return;
      }

      if (!productId) {
        res.status(400).json({
          data: null,
          error: { code: 'VALIDATION_ERROR', message: 'product_id is required' },
        });
        return;
      }

      const { data, error } = await productService.deleteImage(imageId, productId, merchantId);

      if (error) {
        res.status(400).json({ data: null, error: { code: 'DELETE_FAILED', message: error } });
        return;
      }

      res.json({ data: { success: data }, error: null });
    } catch (error) {
      logger.error({ error }, 'Failed to delete image');
      next(error);
    }
  }

  /**
   * PUT /api/products/:id/inventory - Quick inventory update
   */
  async updateInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = req.params.id;
      const merchantId = req.user!.merchant_id;

      if (!merchantId) {
        res.status(403).json({
          data: null,
          error: { code: 'FORBIDDEN', message: 'Merchant account required' },
        });
        return;
      }

      const { quantity } = req.body;

      if (typeof quantity !== 'number') {
        res.status(400).json({
          data: null,
          error: { code: 'VALIDATION_ERROR', message: 'quantity must be a number' },
        });
        return;
      }

      const { data, error } = await productService.updateInventory(productId, merchantId, {
        quantity,
      });

      if (error) {
        res.status(400).json({
          data: null,
          error: { code: 'UPDATE_FAILED', message: error },
        });
        return;
      }

      res.json({ data, error: null });
    } catch (error) {
      logger.error({ error }, 'Failed to update inventory');
      next(error);
    }
  }
}

export const productController = new ProductController();
