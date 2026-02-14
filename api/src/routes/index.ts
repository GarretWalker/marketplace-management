import { Router, Request, Response } from 'express';
import chamberRoutes from './chamber.routes';

const router = Router();

// Health check endpoint
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    data: {
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    },
    error: null,
  });
});

// Route modules
router.use('/chambers', chamberRoutes);

// TODO: Add more route modules here in future sprints
// router.use('/merchants', merchantRoutes);
// etc.

export default router;
