// ============================================================
// SupplyGuard AI — Validation Middleware
// ============================================================
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Validates req.body against a Zod schema.
 * Returns 400 with validation details if invalid.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: (result.error as ZodError).flatten(),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * Validates req.params against a Zod schema.
 * Returns 400 with validation details if invalid.
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid path parameters',
        details: (result.error as ZodError).flatten(),
      });
      return;
    }
    next();
  };
}
