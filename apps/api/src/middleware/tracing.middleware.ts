import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Adds a correlation/request ID to every request for tracing.
 * Accepts X-Request-ID from upstream (e.g., nginx) or generates one.
 */
export function requestTracing(req: Request, res: Response, next: NextFunction) {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const meta = {
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: (req as any).user?.userId || null,
    };

    if (res.statusCode >= 500) {
      logger.error('Request failed', meta);
    } else if (res.statusCode >= 400) {
      logger.warn('Request client error', meta);
    } else {
      logger.info('Request completed', meta);
    }
  });

  next();
}
