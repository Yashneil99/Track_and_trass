const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, errors, splat, json } = format;
const path = require('path');
const DailyRotateFile = require('winston-daily-rotate-file');

const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${stack || message}${Object.keys(meta).length ? ` - ${JSON.stringify(meta)}` : ''}`;
});

const logger = createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    errors({ stack: true }),
    splat(),
    json()
  ),
  transports: [
    new transports.Console({
      format: combine(
        format.colorize(),
        logFormat
      )
    }),
    new DailyRotateFile({
      filename: path.join(__dirname, '../../logs', 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info'
    }),

  ],
  exitOnError: false
});

module.exports = {
  logger
};