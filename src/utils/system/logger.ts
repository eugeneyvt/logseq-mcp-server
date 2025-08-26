import pino from 'pino';

import type { Logger } from 'pino';

/**
 * Logger configuration interface
 */
interface LoggerConfig {
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  isDevelopment?: boolean;
  redact?: string[];
}

/**
 * Create a structured logger instance
 */
export function createLogger(config: LoggerConfig = {}): Logger {
  const { level = 'info', isDevelopment = false, redact = [] } = config;

  const baseRedact = [
    // Security: Always redact these fields
    'apiToken',
    'token',
    'password',
    'secret',
    'key',
    'authorization',
    'cookie',
    'session',
    // Add custom redact fields
    ...redact,
  ];

  return pino(
    {
      level,
      redact: {
        paths: baseRedact,
        censor: '[REDACTED]',
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => ({ level: label }),
      },
      ...(isDevelopment && {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:standard',
          },
        },
      }),
    },
    // IMPORTANT: Write logs to stderr to avoid interfering with JSON-RPC on stdout
    process.stderr
  );
}

/**
 * Default logger instance
 */
// Determine effective log level with safe production default.
// Priority: explicit LOG_LEVEL env > NODE_ENV-based default
const envLevel = process.env['LOG_LEVEL'] as LoggerConfig['level'] | undefined;
const nodeEnv = process.env['NODE_ENV'];
// Treat anything other than explicit 'development' as production-like (including unset)
const effectiveLevel: LoggerConfig['level'] = envLevel ?? (nodeEnv === 'development' ? 'info' : 'error');

export const logger = createLogger({
  level: effectiveLevel,
  // Development mode only when explicitly set
  isDevelopment: nodeEnv === 'development',
});

/**
 * Log levels for conditional logging
 */
export const LOG_LEVELS = {
  TRACE: 10,
  DEBUG: 20,
  INFO: 30,
  WARN: 40,
  ERROR: 50,
  FATAL: 60,
} as const;
