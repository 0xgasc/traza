import { Router } from 'express';
import * as webhookController from '../controllers/webhook.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { createWebhookSchema, updateWebhookSchema } from '../validators/webhook.validators.js';

const router = Router();

router.post('/', requireAuth, validate(createWebhookSchema), webhookController.createWebhook);
router.get('/', requireAuth, webhookController.listWebhooks);
router.patch('/:id', requireAuth, validate(updateWebhookSchema), webhookController.updateWebhook);
router.delete('/:id', requireAuth, webhookController.deleteWebhook);
router.get('/:id/deliveries', requireAuth, webhookController.getDeliveries);

export default router;
