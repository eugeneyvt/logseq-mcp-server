import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { ConfigSchema, loadConfig, validateConfigSecurity } from './config.js';

describe('ConfigSchema', () => {
  it('should validate a valid configuration', () => {
    const validConfig = {
      apiUrl: 'http://127.0.0.1:12315',
      apiToken: 'valid-token-123',
      timeout: 10000,
      maxRetries: 3,
      debug: false,
    };

    const result = ConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it('should reject invalid API URL', () => {
    const invalidConfig = {
      apiUrl: 'not-a-url',
      apiToken: 'valid-token-123',
    };

    const result = ConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]?.message).toContain('API URL must be a valid URL');
    }
  });

  it('should reject empty API token', () => {
    const invalidConfig = {
      apiUrl: 'http://127.0.0.1:12315',
      apiToken: '',
    };

    const result = ConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]?.message).toContain('API token is required');
    }
  });

  it('should reject invalid API token characters', () => {
    const invalidConfig = {
      apiUrl: 'http://127.0.0.1:12315',
      apiToken: 'invalid@token!',
    };

    const result = ConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]?.message).toContain('invalid characters');
    }
  });

  it('should apply default values', () => {
    const minimalConfig = {
      apiToken: 'valid-token-123',
    };

    const result = ConfigSchema.parse(minimalConfig);
    expect(result.apiUrl).toBe('http://127.0.0.1:12315');
    expect(result.timeout).toBe(10000);
    expect(result.maxRetries).toBe(3);
    expect(result.debug).toBe(false);
  });
});

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should load configuration from environment variables', () => {
    process.env['LOGSEQ_API_TOKEN'] = 'test-token-123';
    process.env['LOGSEQ_API_URL'] = 'http://localhost:12315';
    process.env['LOGSEQ_TIMEOUT'] = '5000';
    process.env['LOGSEQ_MAX_RETRIES'] = '2';
    process.env['DEBUG'] = '1';

    const config = loadConfig();
    expect(config.apiToken).toBe('test-token-123');
    expect(config.apiUrl).toBe('http://localhost:12315');
    expect(config.timeout).toBe(5000);
    expect(config.maxRetries).toBe(2);
    expect(config.debug).toBe(true);
  });

  it('should throw error when API token is missing', () => {
    delete process.env['LOGSEQ_API_TOKEN'];

    expect(() => loadConfig()).toThrow('Configuration validation failed');
  });
});

describe('validateConfigSecurity', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should warn about localhost in production', () => {
    process.env['NODE_ENV'] = 'production';
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const config = {
      apiUrl: 'http://localhost:12315',
      apiToken: 'test-token-123456789',
      timeout: 10000,
      maxRetries: 3,
      debug: false,
    };

    validateConfigSecurity(config);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Warning: Using localhost API URL in production environment'
    );

    consoleSpy.mockRestore();
  });

  it('should warn about weak token', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const config = {
      apiUrl: 'http://127.0.0.1:12315',
      apiToken: 'short',
      timeout: 10000,
      maxRetries: 3,
      debug: false,
    };

    validateConfigSecurity(config);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Warning: API token appears to be weak (less than 16 characters)'
    );

    consoleSpy.mockRestore();
  });
});
