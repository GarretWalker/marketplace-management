import { Router } from 'express';
import { merchantController } from '../controllers/merchant.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/merchants/me - Get current merchant
router.get('/me',
  roleMiddleware('merchant'),
  merchantController.getMe.bind(merchantController)
);

// PUT /api/merchants/me - Update current merchant
router.put('/me',
  roleMiddleware('merchant'),
  merchantController.updateMe.bind(merchantController)
);

export default router;
