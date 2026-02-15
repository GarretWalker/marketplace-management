import { Router } from 'express';
import { productController } from '../controllers/product.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// All routes require merchant role
router.use(roleMiddleware('merchant'));

// POST /api/products - Create product
router.post('/', productController.create.bind(productController));

// GET /api/products - List products
router.get('/', productController.list.bind(productController));

// GET /api/products/:id - Get single product
router.get('/:id', productController.get.bind(productController));

// PUT /api/products/:id - Update product
router.put('/:id', productController.update.bind(productController));

// DELETE /api/products/:id - Archive product
router.delete('/:id', productController.delete.bind(productController));

// POST /api/products/:id/images - Upload image
router.post('/:id/images', productController.uploadImage.bind(productController));

// PUT /api/products/:id/images/reorder - Reorder images
router.put('/:id/images/reorder', productController.reorderImages.bind(productController));

// DELETE /api/products/images/:imageId - Delete image
router.delete('/images/:imageId', productController.deleteImage.bind(productController));

// PUT /api/products/:id/inventory - Quick inventory update
router.put('/:id/inventory', productController.updateInventory.bind(productController));

export default router;
