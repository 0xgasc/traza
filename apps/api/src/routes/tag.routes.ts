import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { prisma } from '@traza/database';
import { AppError } from '../middleware/error.middleware.js';
import { success, created } from '../utils/response.js';

const router = Router();

// List user's tags
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const tags = await prisma.tag.findMany({
      where: { userId: req.user!.userId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { documents: true } } },
    });
    success(res, tags);
  } catch (err) { next(err); }
});

// Create a tag
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name, color } = req.body;
    if (!name?.trim()) {
      throw new AppError(400, 'VALIDATION', 'Tag name is required');
    }
    const tag = await prisma.tag.create({
      data: {
        userId: req.user!.userId,
        name: name.trim(),
        color: color ?? '#3b82f6',
      },
    });
    created(res, tag);
  } catch (err) { next(err); }
});

// Delete a tag
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const tag = await prisma.tag.findUnique({ where: { id: req.params.id } });
    if (!tag || tag.userId !== req.user!.userId) {
      throw new AppError(404, 'NOT_FOUND', 'Tag not found');
    }
    await prisma.tag.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) { next(err); }
});

// Add tag to document
router.post('/documents/:documentId', requireAuth, async (req, res, next) => {
  try {
    const { tagId } = req.body;
    const doc = await prisma.document.findUnique({ where: { id: req.params.documentId } });
    if (!doc || doc.ownerId !== req.user!.userId) throw new AppError(404, 'NOT_FOUND', 'Document not found');
    const tag = await prisma.tag.findUnique({ where: { id: tagId } });
    if (!tag || tag.userId !== req.user!.userId) throw new AppError(404, 'NOT_FOUND', 'Tag not found');

    await prisma.documentTag.upsert({
      where: { documentId_tagId: { documentId: req.params.documentId, tagId } },
      create: { documentId: req.params.documentId, tagId },
      update: {},
    });
    success(res, { ok: true });
  } catch (err) { next(err); }
});

// Remove tag from document
router.delete('/documents/:documentId/:tagId', requireAuth, async (req, res, next) => {
  try {
    await prisma.documentTag.deleteMany({
      where: { documentId: req.params.documentId, tagId: req.params.tagId },
    });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
