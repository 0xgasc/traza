/**
 * Validated environment variables for the web app.
 * Fails fast at build/startup if required variables are missing in production.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value || '';
}

export const env = {
  /** API base URL (e.g. https://api.traza.dev) */
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',

  /** Public app URL for meta tags, OG images, etc. */
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  /** Sentry DSN for client-side error tracking */
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN || '',

  /** Current environment */
  NODE_ENV: process.env.NODE_ENV || 'development',
} as const;

// Validate critical vars at module load time in production
if (process.env.NODE_ENV === 'production') {
  const required = ['NEXT_PUBLIC_API_URL'] as const;
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables in production:\n${missing.map((k) => `  - ${k}`).join('\n')}`,
    );
  }
}
