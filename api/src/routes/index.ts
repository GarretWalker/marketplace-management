import { Router, Request, Response } from 'express';

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

// TODO: Add route modules here in future sprints
// router.use('/chambers', chamberRoutes);
// router.use('/merchants', merchantRoutes);
// etc.

export default router;
