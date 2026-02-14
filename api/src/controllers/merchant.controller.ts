import { Request, Response, NextFunction } from 'express';
import { merchantService } from '../services/merchant.service';
import { logger } from '../utils/logger';

export class MerchantController {
  /**
   * GET /api/merchants/me - Get current merchant's record
   */
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const merchant = await merchantService.getMerchantByUserId(userId);

      if (!merchant) {
        return res.status(404).json({
          data: null,
          error: { code: 'NOT_FOUND', message: 'Merchant record not found' }
        });
      }

      res.json({ data: merchant, error: null });
    } catch (error) {
      logger.error({ error }, 'Failed to get merchant');
      next(error);
    }
  }

  /**
   * PUT /api/merchants/me - Update current merchant's settings
   */
  async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      
      // Get the merchant ID from profile
      const currentMerchant = await merchantService.getMerchantByUserId(userId);
      if (!currentMerchant) {
        return res.status(404).json({
          data: null,
          error: { code: 'NOT_FOUND', message: 'Merchant record not found' }
        });
      }

      const merchant = await merchantService.updateMerchant(currentMerchant.id, req.body);
      res.json({ data: merchant, error: null });
    } catch (error) {
      logger.error({ error }, 'Failed to update merchant');
      next(error);
    }
  }
}

export const merchantController = new MerchantController();
