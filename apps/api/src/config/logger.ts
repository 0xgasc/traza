import winston from 'winston';

const { combine, timestamp, json, errors, colorize, simple } = winston.format;

const transports: winston.transport[] = [];

if (process.env.NODE_ENV === 'production') {
  // In production containers, log structured JSON to stdout for log aggregators
  transports.push(
    new winston.transports.Console({
      format: combine(timestamp(), json()),
    }),
  );
} else {
  // In development, use file + colorized console output
  transports.push(
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
    new winston.transports.Console({
      format: combine(colorize(), simple()),
    }),
  );
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp(),
    json(),
  ),
  defaultMeta: { service: 'traza-api' },
  transports,
});
