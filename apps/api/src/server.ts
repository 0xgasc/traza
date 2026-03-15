import 'dotenv/config';
import { initSentry } from './config/sentry.js';
import { logger } from './config/logger.js';
import { startWebhookWorker, stopWebhookWorker } from './workers/webhook.worker.js';
import { startReminderWorker, stopReminderWorker } from './workers/reminder.worker.js';
import { startTokenCleanupWorker, stopTokenCleanupWorker } from './workers/token-cleanup.worker.js';
import { prisma } from '@traza/database';
import app from './app.js';

// Initialize Sentry before anything else
initSentry();

const PORT = parseInt(process.env.PORT || '4000', 10);

const server = app.listen(PORT, () => {
  logger.info(`API server running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`API docs: http://localhost:${PORT}/api/docs`);

  // Start background workers
  startWebhookWorker();
  startReminderWorker();
  startTokenCleanupWorker();
});

// Graceful shutdown
let isShuttingDown = false;

async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`${signal} received — shutting down gracefully`);

  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Stop background workers
  stopWebhookWorker();
  stopReminderWorker();
  stopTokenCleanupWorker();

  // Allow in-flight requests to finish (max 10s)
  await new Promise((resolve) => setTimeout(resolve, 10_000));

  // Disconnect from database
  await prisma.$disconnect();
  logger.info('Database disconnected — exit');

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
