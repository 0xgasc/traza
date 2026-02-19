import { Request, Response, NextFunction } from 'express';
import * as documentService from '../services/document.service.js';
import { created, success, paginated } from '../utils/response.js';
import { AppError } from '../middleware/error.middleware.js';
import { DocumentStatus } from '@traza/database';

export async function createDocument(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new AppError(400, 'MISSING_FILE', 'A file is required');
    }

    const title = req.body.title;
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      throw new AppError(400, 'MISSING_TITLE', 'A document title is required');
    }

    const result = await documentService.createDocument({
      userId: req.user!.userId,
      file: req.file,
      title: title.trim(),
    });

    created(res, result);
  } catch (err) {
    next(err);
  }
}

export async function listDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const status = req.query.status as DocumentStatus | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || undefined;

    const tagId = (req.query.tagId as string) || undefined;

    const result = await documentService.listDocuments(req.user!.userId, {
      status,
      page,
      limit,
      search,
      tagId,
    });

    paginated(res, result.documents, result.total, result.page, result.limit);
  } catch (err) {
    next(err);
  }
}

export async function getDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const document = await documentService.getDocument(req.params.id as string, req.user!.userId);
    success(res, document);
  } catch (err) {
    next(err);
  }
}

export async function getDownloadUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await documentService.getDownloadUrl(req.params.id as string, req.user!.userId);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function voidDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await documentService.voidDocument(
      req.params.id as string,
      req.user!.userId,
      req.body.reason,
    );
    success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function deleteDocument(req: Request, res: Response, next: NextFunction) {
  try {
    await documentService.deleteDocument(
      req.params.id as string,
      req.user!.userId,
      req.user!.orgId,
      req.user!.orgRole,
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function resendDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await documentService.resendDocument(req.params.id as string, req.user!.userId);
    success(res, result);
  } catch (err) {
    next(err);
  }
}
