import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';

const router = Router();

// Public route - no auth required
// GET /api/categories - List all categories
router.get('/', categoryController.getAll);

export default router;
