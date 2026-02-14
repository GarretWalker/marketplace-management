import { Request, Response, NextFunction } from 'express';

/**
 * Middleware factory to check if user has required role(s)
 */
export function roleMiddleware(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        data: null,
        error: {
          code: 'FORBIDDEN',
          message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
        }
      });
      return;
    }

    next();
  };
}
