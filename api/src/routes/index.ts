import { Router, Request, Response } from 'express';
import chamberRoutes from './chamber.routes';
import claimRoutes from './claim.routes';
import merchantRoutes from './merchant.routes';
import productRoutes from './product.routes';

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
router.use('/claims', claimRoutes);
router.use('/merchants', merchantRoutes);
router.use('/products', productRoutes);

export default router;
