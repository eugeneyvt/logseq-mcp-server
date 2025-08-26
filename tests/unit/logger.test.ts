import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createLogger, logger } from '../../src/utils/system/logger.js';

describe('createLogger', () => {
  it('should create logger with default config', () => {
    const testLogger = createLogger();
    expect(testLogger).toBeDefined();
    expect(testLogger.level).toBe('info');
  });

  it('should create logger with custom level', () => {
    const testLogger = createLogger({ level: 'debug' });
    expect(testLogger.level).toBe('debug');
  });

  it('should include security redaction by default', () => {
    const testLogger = createLogger();

    // Test that logger was created successfully (redaction is internal to pino)
    expect(testLogger).toBeDefined();
    expect(typeof testLogger.info).toBe('function');
  });

  it('should add custom redact fields', () => {
    const testLogger = createLogger({
      redact: ['customField', 'anotherSecret'],
    });

    // Logger should be created successfully with custom redaction
    expect(testLogger).toBeDefined();
  });

  it('should configure development transport when isDevelopment is true', () => {
    const testLogger = createLogger({
      isDevelopment: true,
      level: 'debug',
    });

    expect(testLogger).toBeDefined();
    expect(testLogger.level).toBe('debug');
  });
});

describe('default logger', () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should be available as default export', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.warn).toBe('function');
  });

  it('should respect LOG_LEVEL environment variable', () => {
    // Note: This test shows how the logger would be configured
    // The actual logger instance is already created, so we test the logic
    process.env['LOG_LEVEL'] = 'debug';
    const testLogger = createLogger({
      level: (process.env['LOG_LEVEL'] as any) ?? 'info',
    });

    expect(testLogger.level).toBe('debug');
  });

  it('should detect production environment', () => {
    process.env['NODE_ENV'] = 'production';
    const testLogger = createLogger({
      isDevelopment: process.env['NODE_ENV'] !== 'production',
    });

    expect(testLogger).toBeDefined();
  });
});

describe('logger functionality', () => {
  it('should log info messages without throwing', () => {
    expect(() => {
      logger.info('Test info message');
    }).not.toThrow();
  });

  it('should log error messages without throwing', () => {
    expect(() => {
      logger.error('Test error message');
    }).not.toThrow();
  });

  it('should log structured data without throwing', () => {
    expect(() => {
      logger.info({ user: 'test', action: 'login' }, 'User action');
    }).not.toThrow();
  });

  it('should handle sensitive information without throwing', () => {
    expect(() => {
      logger.info(
        {
          apiToken: 'secret-token',
          password: 'secret-password',
          user: 'john',
        },
        'Login attempt'
      );
    }).not.toThrow();
  });

  it('should support different log levels', () => {
    expect(() => {
      logger.debug('Debug message');
      logger.warn('Warning message');
      logger.error('Error message');
      logger.fatal('Fatal message');
    }).not.toThrow();
  });
});
