import { Request, Response, NextFunction } from 'express';
import { categoryService } from '../services/category.service';

export const categoryController = {
  /**
   * Get all categories
   * GET /api/categories
   */
  async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await categoryService.getAll();
      res.json({ data: categories, error: null });
    } catch (error) {
      next(error);
    }
  }
};
