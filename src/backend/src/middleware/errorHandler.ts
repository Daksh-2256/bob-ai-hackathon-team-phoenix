// ============================================================
// SupplyGuard AI — Global Error Handler Middleware
// ============================================================
import { Request, Response, NextFunction } from 'express';

/**
 * Global Express error handler.
 * Always returns JSON. Never exposes stack traces in production.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isProd = process.env['NODE_ENV'] === 'production';

  if (err instanceof Error) {
    console.error(`[SupplyGuard Error] ${err.message}`);
    res.status(500).json({
      success: false,
      error: isProd ? 'Internal server error' : err.message,
    });
    return;
  }

  console.error('[SupplyGuard Error] Unknown error', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
}
