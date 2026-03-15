import * as Sentry from '@sentry/node';

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.info('[sentry] SENTRY_DSN not set — skipping Sentry initialization');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GIT_SHA || 'unknown',
    serverName: process.env.RAILWAY_SERVICE_NAME || 'traza-api',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
    beforeSend(event) {
      // Strip sensitive data from headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['x-api-key'];
        delete event.request.headers['cookie'];
      }
      // Strip sensitive data from request body
      if (event.request?.data) {
        const data = typeof event.request.data === 'string'
          ? JSON.parse(event.request.data)
          : event.request.data;
        if (data?.password) data.password = '[REDACTED]';
        if (data?.currentPassword) data.currentPassword = '[REDACTED]';
        if (data?.newPassword) data.newPassword = '[REDACTED]';
        event.request.data = data;
      }
      return event;
    },
    ignoreErrors: [
      'INVALID_CREDENTIALS',
      'INVALID_TOKEN',
      'TOKEN_EXPIRED',
      'RATE_LIMIT_EXCEEDED',
    ],
  });

  console.info('[sentry] Sentry initialized');
}

export { Sentry };
