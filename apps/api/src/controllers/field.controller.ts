import { Request, Response, NextFunction } from 'express';
import * as fieldService from '../services/field.service.js';
import { success } from '../utils/response.js';

export async function getDocumentFields(req: Request, res: Response, next: NextFunction) {
  try {
    const fields = await fieldService.getDocumentFields(
      req.params.id as string,
      req.user!.userId,
    );
    success(res, fields);
  } catch (err) {
    next(err);
  }
}

export async function saveDocumentFields(req: Request, res: Response, next: NextFunction) {
  try {
    const fields = await fieldService.saveDocumentFields(
      req.params.id as string,
      req.user!.userId,
      req.body.fields,
    );
    success(res, fields);
  } catch (err) {
    next(err);
  }
}

export async function getSignerFields(req: Request, res: Response, next: NextFunction) {
  try {
    const fields = await fieldService.getSignerFields(req.params.token as string);
    success(res, fields);
  } catch (err) {
    next(err);
  }
}
