import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { generalLimiter } from './middleware/rateLimit.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { requireAuth } from './middleware/auth.middleware.js';
import { swaggerSpec } from './config/swagger.js';
import { securityAudit } from './middleware/securityAudit.middleware.js';
import { requestTracing } from './middleware/tracing.middleware.js';
import { prisma } from '@traza/database';
import authRoutes from './routes/auth.routes.js';
import documentRoutes from './routes/document.routes.js';
import signatureRoutes from './routes/signature.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import adminRoutes from './routes/admin.routes.js';
import organizationRoutes from './routes/organization.routes.js';
import gdprRoutes from './routes/gdpr.routes.js';
import { sanitizeInput } from './middleware/sanitize.middleware.js';
import * as extraController from './controllers/document.extra.controller.js';

const app = express();

// Request tracing (correlation IDs)
app.use(requestTracing);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", process.env.APP_URL || 'http://localhost:3000'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }),
);

// CORS
app.use(
  cors({
    origin: process.env.APP_URL || 'http://localhost:3000',
    credentials: true,
  }),
);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Input sanitization (XSS prevention)
app.use(sanitizeInput);

// Request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Rate limiting
app.use('/api/', generalLimiter);

// Security audit logging
app.use('/api/', securityAudit);

// API docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Traza API Documentation',
}));
app.get('/api/docs.json', (_req, res) => { res.json(swaggerSpec); });

// Health check (liveness - is the process alive?)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'traza-api',
    version: '0.1.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Readiness check (can we serve traffic? checks DB connectivity)
app.get('/ready', async (_req, res) => {
  const checks: Record<string, { status: string; latency?: string; error?: string }> = {};

  // Check database
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok', latency: `${Date.now() - dbStart}ms` };
  } catch (err: any) {
    checks.database = { status: 'error', error: err.message };
  }

  const allOk = Object.values(checks).every((c) => c.status === 'ok');
  const memory = process.memoryUsage();

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ready' : 'degraded',
    service: 'traza-api',
    checks,
    memory: {
      rss: `${Math.round(memory.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
    },
  });
});

// API v1 routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1', signatureRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/organizations', organizationRoutes);

// Admin routes (super admin only)
app.use('/api/v1/admin', adminRoutes);

// GDPR / Account management
app.use('/api/v1/account', gdprRoutes);

// Document extra endpoints (verify, anchor, proof)
app.get('/api/v1/documents/:id/verify', requireAuth, extraController.verifyDocument);
app.post('/api/v1/documents/:id/anchor', requireAuth, extraController.anchorDocument);
app.post('/api/v1/documents/:id/proof', requireAuth, extraController.generateProof);

// Dashboard
app.get('/api/v1/dashboard/stats', requireAuth, extraController.getDashboardStats);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

// Error handler
app.use(errorHandler);

export default app;
