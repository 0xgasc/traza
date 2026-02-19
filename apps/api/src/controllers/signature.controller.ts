import { Request, Response, NextFunction } from 'express';
import * as signatureService from '../services/signature.service.js';
import { created, success } from '../utils/response.js';

export async function sendForSigning(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await signatureService.sendForSigning({
      documentId: req.params.id as string,
      userId: req.user!.userId,
      signers: req.body.signers,
      message: req.body.message,
      expiresInDays: req.body.expiresInDays,
    });

    created(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getSigningContext(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await signatureService.getSigningContext(req.params.token as string);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function submitSignature(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await signatureService.submitSignature(
      req.params.token as string,
      req.body.signatureData || null,
      req.body.signatureType || 'drawn',
      req.ip || null,
      req.headers['user-agent'] || null,
      req.body.fieldValues,
    );

    success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function declineSignature(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await signatureService.declineSignature(req.params.token as string, req.body.reason);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getDocumentSignatures(req: Request, res: Response, next: NextFunction) {
  try {
    const signatures = await signatureService.getDocumentSignatures(
      req.params.id as string,
      req.user!.userId,
    );
    success(res, signatures);
  } catch (err) {
    next(err);
  }
}

export async function remindSigner(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await signatureService.remindSigner(
      req.params.id as string,
      req.params.signatureId as string,
      req.user!.userId,
    );
    success(res, result);
  } catch (err) {
    next(err);
  }
}
