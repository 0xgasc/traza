import winston from 'winston';

const { combine, timestamp, json, errors, colorize, simple } = winston.format;

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp(),
    json(),
  ),
  defaultMeta: { service: 'traza-api' },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
    }),
  ],
});

// In production containers, log structured JSON to stdout for log aggregators
// In development, use colorized human-readable output
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.Console({
      format: combine(timestamp(), json()),
    }),
  );
} else {
  logger.add(
    new winston.transports.Console({
      format: combine(colorize(), simple()),
    }),
  );
}
