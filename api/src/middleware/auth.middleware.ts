import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { logger } from '../config/pino';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        chamber_id?: string;
        merchant_id?: string;
      };
    }
  }
}

/**
 * Middleware to verify Supabase JWT and attach user to request
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No authorization token provided'
        }
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      logger.warn({ error: authError }, 'Invalid or expired token');
      res.status(401).json({
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token'
        }
      });
      return;
    }

    // Fetch user profile to get role and associations
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, chamber_id, merchant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      logger.error({ error: profileError, userId: user.id }, 'Failed to fetch user profile');
      res.status(500).json({
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to load user profile'
        }
      });
      return;
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email || '',
      role: profile.role,
      chamber_id: profile.chamber_id || undefined,
      merchant_id: profile.merchant_id || undefined
    };

    next();
  } catch (error) {
    logger.error({ error }, 'Authentication middleware error');
    res.status(500).json({
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication failed'
      }
    });
    return;
  }
}
