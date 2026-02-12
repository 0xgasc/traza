import { Request, Response, NextFunction } from 'express';
import * as webhookService from '../services/webhook.service.js';
import { created, success, paginated } from '../utils/response.js';

export async function createWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await webhookService.createWebhook(
      req.user!.userId,
      req.body.url,
      req.body.events,
    );
    created(res, result);
  } catch (err) {
    next(err);
  }
}

export async function listWebhooks(req: Request, res: Response, next: NextFunction) {
  try {
    const webhooks = await webhookService.listWebhooks(req.user!.userId);
    success(res, webhooks);
  } catch (err) {
    next(err);
  }
}

export async function updateWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await webhookService.updateWebhook(req.params.id as string, req.user!.userId, req.body);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function deleteWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    await webhookService.deleteWebhook(req.params.id as string, req.user!.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getDeliveries(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await webhookService.getDeliveries(req.params.id as string, req.user!.userId, page, limit);
    paginated(res, result.deliveries, result.total, result.page, result.limit);
  } catch (err) {
    next(err);
  }
}
