import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service.js';
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
    const result = await authService.register(email, password, name);

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
    const result = await authService.login(email, password);

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

    const tokens = await authService.refreshTokens(refreshToken);

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
    const result = await authService.generateApiKey(userId);
    created(res, result);
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
