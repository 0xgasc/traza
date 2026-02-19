import { Request, Response, NextFunction } from 'express';
import * as templateService from '../services/template.service.js';
import { success, created } from '../utils/response.js';

export async function listTemplates(req: Request, res: Response, next: NextFunction) {
  try {
    const templates = await templateService.listTemplates(req.user!.userId);
    success(res, templates);
  } catch (err) { next(err); }
}

export async function getTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const template = await templateService.getTemplate(req.params.id as string, req.user!.userId);
    success(res, template);
  } catch (err) { next(err); }
}

export async function createTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, description, fileUrl, fileHash, pageCount } = req.body;
    if (!name || !fileUrl || !fileHash) {
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'name, fileUrl, fileHash required' } });
    }
    const template = await templateService.createTemplate(req.user!.userId, {
      name, description, fileUrl, fileHash, pageCount,
    });
    created(res, template);
  } catch (err) { next(err); }
}

export async function updateTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const template = await templateService.updateTemplate(
      req.params.id as string, req.user!.userId, req.body,
    );
    success(res, template);
  } catch (err) { next(err); }
}

export async function deleteTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    await templateService.deleteTemplate(req.params.id as string, req.user!.userId);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function saveTemplateFields(req: Request, res: Response, next: NextFunction) {
  try {
    const fields = await templateService.saveTemplateFields(
      req.params.id as string, req.user!.userId, req.body.fields ?? [],
    );
    success(res, fields);
  } catch (err) { next(err); }
}

export async function getTemplateSignerRoles(req: Request, res: Response, next: NextFunction) {
  try {
    const roles = await templateService.getTemplateSignerRoles(req.params.id as string, req.user!.userId);
    success(res, roles);
  } catch (err) { next(err); }
}

export async function useTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const { signerRoleMap } = req.body; // { "Signer 1": "email@example.com" }
    const document = await templateService.createDocumentFromTemplate(
      req.params.id as string, req.user!.userId, signerRoleMap ?? {},
    );
    created(res, document);
  } catch (err) { next(err); }
}

export async function bulkSend(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows, message, expiresInDays } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'rows array is required' } });
    }
    const results = await templateService.bulkSendFromTemplate(
      req.params.id as string,
      req.user!.userId,
      rows.map((r: any) => ({
        signerRoleMap: r.signerRoleMap ?? {},
        signerNames: r.signerNames,
        message: r.message ?? message,
        expiresInDays: r.expiresInDays ?? expiresInDays,
      })),
    );
    success(res, results);
  } catch (err) { next(err); }
}
