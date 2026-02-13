import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/pino';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, 'NOT_FOUND', message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, 'FORBIDDEN', message);
  }
}

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (error instanceof AppError) {
    logger.warn({ err: error, path: req.path }, error.message);
    return res.status(error.statusCode).json({
      data: null,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  // Unhandled error
  logger.error({ err: error, path: req.path }, 'Unhandled error');
  return res.status(500).json({
    data: null,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
