import { Request, Response, NextFunction } from 'express';
import { chamberService } from '../services/chamber.service';

export const chamberController = {
  /**
   * Create a new chamber
   * POST /api/chambers
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          data: null,
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
        });
        return;
      }

      const chamber = await chamberService.create(userId, req.body);
      res.status(201).json({ data: chamber, error: null });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get chamber by ID
   * GET /api/chambers/:id
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chamber = await chamberService.getById(req.params.id, req.user?.id);
      res.json({ data: chamber, error: null });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update chamber details
   * PUT /api/chambers/:id
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chamber = await chamberService.update(
        req.params.id,
        req.user?.id,
        req.body
      );
      res.json({ data: chamber, error: null });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Upload chamber branding assets (logo, hero image)
   * POST /api/chambers/:id/branding
   */
  async uploadBranding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await chamberService.uploadBranding(
        req.params.id,
        req.user?.id,
        req.body
      );
      res.json({ data: result, error: null });
    } catch (error) {
      next(error);
    }
  }
};
