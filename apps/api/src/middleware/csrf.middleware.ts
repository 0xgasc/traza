import { Request, Response, NextFunction } from 'express';

/**
 * Origin-based CSRF protection for state-changing requests.
 * Since the API uses JWT in Authorization headers (not cookies for auth),
 * CSRF risk is low — but this adds defense-in-depth by verifying that
 * mutating requests come from the expected origin.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const origin = req.get('origin');
  const referer = req.get('referer');
  const allowedOrigin = process.env.APP_URL || 'http://localhost:3000';

  // API key requests are not browser-based, skip CSRF check
  if (req.get('x-api-key')) {
    return next();
  }

  // Public signing endpoints are accessed from email links (various origins)
  if (req.path.startsWith('/sign/')) {
    return next();
  }

  // If no origin/referer header, it's likely a non-browser request (curl, Postman)
  // or same-origin (browsers always send origin for cross-origin POST)
  if (!origin && !referer) {
    return next();
  }

  // Verify origin matches
  if (origin && !origin.startsWith(allowedOrigin)) {
    return res.status(403).json({
      error: {
        code: 'CSRF_VIOLATION',
        message: 'Cross-origin request blocked',
      },
    });
  }

  // Verify referer matches
  if (!origin && referer && !referer.startsWith(allowedOrigin)) {
    return res.status(403).json({
      error: {
        code: 'CSRF_VIOLATION',
        message: 'Cross-origin request blocked',
      },
    });
  }

  next();
}
