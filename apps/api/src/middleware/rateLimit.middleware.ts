import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many uploads, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Tight limiter for access code verification — prevents brute-forcing 4-digit codes
export const accessCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts per window per IP
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many access code attempts, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for public verify-by-hash — hash lookups must not be
// usable to probe the corpus at scale
export const verifyHashLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many verification requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for public signing endpoints — prevents enumeration and abuse
export const signingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many signing requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Tighter limiter for admin/sensitive operations
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many admin requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
