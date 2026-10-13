import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  console.error('[SERVER ERROR]', err);

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  if (err.name === 'ValidationError') {
    // Mongoose validation error
    res.status(400).json({
      success: false,
      message: err.message,
    });
    return;
  }

  if (err.code === 11000) {
    // Mongo duplicate key error
    res.status(409).json({
      success: false,
      message: 'Duplicate key error: A record with that identifier already exists.',
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error occurred.';

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
