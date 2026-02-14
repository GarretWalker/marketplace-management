import { Router } from 'express';
import { claimController } from '../controllers/claim.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/claims - Submit a new claim (merchants only)
router.post('/', 
  roleMiddleware('merchant'),
  claimController.create.bind(claimController)
);

// GET /api/claims - List claims for a chamber (chamber admins only)
router.get('/',
  roleMiddleware('chamber_admin'),
  claimController.list.bind(claimController)
);

// POST /api/claims/:id/approve - Approve a claim (chamber admins only)
router.post('/:id/approve',
  roleMiddleware('chamber_admin'),
  claimController.approve.bind(claimController)
);

// POST /api/claims/:id/deny - Deny a claim (chamber admins only)
router.post('/:id/deny',
  roleMiddleware('chamber_admin'),
  claimController.deny.bind(claimController)
);

export default router;
