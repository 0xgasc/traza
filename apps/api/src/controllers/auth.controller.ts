import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service.js';
import * as totpService from '../services/totp.service.js';
import { created, success } from '../utils/response.js';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth',
};

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, name } = req.body;
    const sessionMeta = { ipAddress: req.ip, userAgent: req.get('user-agent') };
    const result = await authService.register(email, password, name, sessionMeta);

    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
    created(res, {
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const sessionMeta = { ipAddress: req.ip, userAgent: req.get('user-agent') };
    const result = await authService.login(email, password, sessionMeta);

    // If 2FA is required, return partial response without setting cookie
    if (result.requires2FA) {
      return success(res, {
        requires2FA: true,
        tempToken: result.tempToken,
      });
    }

    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
    success(res, {
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({
        error: { code: 'MISSING_TOKEN', message: 'Refresh token is required' },
      });
    }

    const sessionMeta = { ipAddress: req.ip, userAgent: req.get('user-agent') };
    const tokens = await authService.refreshTokens(refreshToken, sessionMeta);

    res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
    success(res, { accessToken: tokens.accessToken });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getUser(req.user!.userId);
    success(res, user);
  } catch (err) {
    next(err);
  }
}

export async function createApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { name, expiresInDays } = req.body || {};
    const result = await authService.generateApiKey(userId, name, expiresInDays);
    created(res, result);
  } catch (err) {
    next(err);
  }
}

export async function listApiKeys(req: Request, res: Response, next: NextFunction) {
  try {
    const keys = await authService.listApiKeys(req.user!.userId);
    success(res, keys);
  } catch (err) {
    next(err);
  }
}

export async function revokeApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    const keyId = req.params.keyId as string;
    const result = await authService.revokeApiKey(keyId, req.user!.userId);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const { name } = req.body;
    const user = await authService.updateProfile(req.user!.userId, name);
    success(res, user);
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user!.userId, currentPassword, newPassword);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    await authService.requestPasswordReset(email);
    // Always return 200 regardless of whether email exists
    success(res, { message: 'If an account exists, a reset link has been sent' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = req.body;
    const result = await authService.resetPassword(token, password);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function setupTotp(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await totpService.setupTotp(req.user!.userId);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function verifyTotp(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = req.body;
    const result = await totpService.verifyAndEnableTotp(req.user!.userId, code);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function disableTotp(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = req.body;
    const result = await totpService.disableTotp(req.user!.userId, code);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function verifyLoginTotp(req: Request, res: Response, next: NextFunction) {
  try {
    const { tempToken, code } = req.body;
    const sessionMeta = { ipAddress: req.ip, userAgent: req.get('user-agent') };
    const result = await authService.verifyLoginTotp(tempToken, code, sessionMeta);

    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
    success(res, {
      user: result.user,
      organization: result.organization,
      accessToken: result.accessToken,
    });
  } catch (err) {
    next(err);
  }
}

// --- Session Management ---

export async function listSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const sessions = await authService.listSessions(req.user!.userId);
    success(res, sessions);
  } catch (err) {
    next(err);
  }
}

export async function revokeSession(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.revokeSession(req.params.sessionId as string, req.user!.userId);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function revokeAllSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.revokeAllSessions(req.user!.userId);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

// --- Email Verification ---

export async function sendVerification(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.sendVerificationEmail(req.user!.userId);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function verifyEmailToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = (req.body?.token || req.query?.token) as string;
    if (!token) {
      return res.status(400).json({
        error: { code: 'MISSING_TOKEN', message: 'Verification token is required' },
      });
    }
    const result = await authService.verifyEmail(token);
    success(res, result);
  } catch (err) {
    next(err);
  }
}
