import type { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

/**
 * Request timeout middleware.
 * Sends 408 if the request takes longer than the configured timeout.
 */
export function requestTimeout(ms = 30_000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('Request timeout', {
          method: req.method,
          url: req.originalUrl,
          timeout: ms,
        });
        res.status(408).json({
          error: { code: 'REQUEST_TIMEOUT', message: 'Request timed out' },
        });
      }
    }, ms);

    // Clear the timeout when the response finishes
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
}
