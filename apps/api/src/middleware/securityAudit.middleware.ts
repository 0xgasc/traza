import { Request, Response, NextFunction } from 'express';

// Paths and methods that should be audit-logged for security
const AUDIT_PATTERNS = [
  { method: 'POST', path: /\/auth\/login/ },
  { method: 'POST', path: /\/auth\/register/ },
  { method: 'POST', path: /\/auth\/api-key/ },
  { method: 'DELETE', path: /\/documents\// },
  { method: 'POST', path: /\/documents\/.*\/anchor/ },
  { method: 'POST', path: /\/sign\/.*/ },
];

export function securityAudit(req: Request, res: Response, next: NextFunction) {
  const shouldLog = AUDIT_PATTERNS.some(
    (p) => req.method === p.method && p.path.test(req.path),
  );

  if (!shouldLog) {
    return next();
  }

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: req.user?.userId ?? null,
      duration,
    };

    // Log failed auth attempts at warn level
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.warn('[security-audit] FAILED:', JSON.stringify(logEntry));
    } else {
      console.info('[security-audit]', JSON.stringify(logEntry));
    }
  });

  next();
}
