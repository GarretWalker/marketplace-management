import { Router } from 'express';
import { chamberController } from '../controllers/chamber.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

// All chamber routes require authentication and chamber_admin role
router.post(
  '/',
  authMiddleware,
  roleMiddleware('chamber_admin'),
  chamberController.create
);

router.get(
  '/:id',
  authMiddleware,
  roleMiddleware('chamber_admin'),
  chamberController.getById
);

router.put(
  '/:id',
  authMiddleware,
  roleMiddleware('chamber_admin'),
  chamberController.update
);

router.post(
  '/:id/branding',
  authMiddleware,
  roleMiddleware('chamber_admin'),
  chamberController.uploadBranding
);

// ChamberMaster sync endpoints
router.post(
  '/:id/sync',
  authMiddleware,
  roleMiddleware('chamber_admin'),
  chamberController.syncChamberMaster
);

router.get(
  '/:id/members',
  authMiddleware,
  roleMiddleware('chamber_admin'),
  chamberController.getMembers
);

router.get(
  '/:id/sync-status',
  authMiddleware,
  roleMiddleware('chamber_admin'),
  chamberController.getSyncStatus
);

export default router;
