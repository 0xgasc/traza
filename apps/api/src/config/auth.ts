export const AUTH_CONFIG = {
  bcryptRounds: 12,
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  refreshTokenExpiryMs: 7 * 24 * 60 * 60 * 1000,
  apiKeyPrefix: 'trz_',
  apiKeyLength: 48,
} as const;
