import { Request, Response, NextFunction } from 'express';
import { claimService } from '../services/claim.service';
import { logger } from '../utils/logger';

export class ClaimController {
  /**
   * POST /api/claims - Submit a new claim request
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const claim = await claimService.createClaim(userId, req.body);
      res.status(201).json({ data: claim, error: null });
    } catch (error) {
      logger.error({ error }, 'Failed to create claim');
      next(error);
    }
  }

  /**
   * GET /api/claims?chamber_id=X - List claims for a chamber
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chamberId = req.query.chamber_id as string;
      const status = req.query.status as string | undefined;

      if (!chamberId) {
        res.status(400).json({
          data: null,
          error: { code: 'VALIDATION_ERROR', message: 'chamber_id is required' }
        });
        return;
      }

      const claims = await claimService.getClaimsByChamber(chamberId, status);
      res.json({ data: claims, error: null });
    } catch (error) {
      logger.error({ error }, 'Failed to list claims');
      next(error);
    }
  }

  /**
   * POST /api/claims/:id/approve - Approve a claim
   */
  async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const claimId = req.params.id;
      const approvedBy = req.user!.id;

      const merchant = await claimService.approveClaim(claimId, approvedBy);
      res.json({ data: merchant, error: null });
    } catch (error) {
      logger.error({ error }, 'Failed to approve claim');
      next(error);
    }
  }

  /**
   * POST /api/claims/:id/deny - Deny a claim
   */
  async deny(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const claimId = req.params.id;
      const deniedBy = req.user!.id;
      const { reason } = req.body;

      if (!reason) {
        res.status(400).json({
          data: null,
          error: { code: 'VALIDATION_ERROR', message: 'Denial reason is required' }
        });
        return;
      }

      await claimService.denyClaim(claimId, deniedBy, reason);
      res.json({ data: { success: true }, error: null });
    } catch (error) {
      logger.error({ error }, 'Failed to deny claim');
      next(error);
    }
  }
}

export const claimController = new ClaimController();
