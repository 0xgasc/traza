import 'dotenv/config';
import { initSentry } from './config/sentry.js';
import { logger } from './config/logger.js';
import { startWebhookWorker } from './workers/webhook.worker.js';
import { startReminderWorker } from './workers/reminder.worker.js';
import app from './app.js';

// Initialize Sentry before anything else
initSentry();

const PORT = parseInt(process.env.PORT || '4000', 10);

app.listen(PORT, () => {
  logger.info(`API server running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`API docs: http://localhost:${PORT}/api/docs`);

  // Start background workers
  startWebhookWorker();
  startReminderWorker();
});
