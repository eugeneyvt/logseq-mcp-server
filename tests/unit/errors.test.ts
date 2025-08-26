import { describe, it, expect } from 'vitest';

import {
  createErrorResponse,
  sanitizeErrorForLogging,
  createStructuredError,
  ErrorCode,
  validateTypeOperation,
  isRetryableError,
  getRetryDelay
} from '../../src/utils/system/errors.js';

describe('Error System', () => {
  describe('createStructuredError', () => {
    it('should create basic structured error', () => {
      const error = createStructuredError(ErrorCode.NOT_FOUND, {
        type: 'page',
        target: 'Test Page'
      });

      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.message).toContain('page "Test Page" not found');
      expect(error.hint).toBeDefined();
    });

    it('should accept custom message and hint', () => {
      const error = createStructuredError(
        ErrorCode.INTERNAL,
        {},
        'Custom error message',
        'Custom hint'
      );

      expect(error.message).toBe('Custom error message');
      expect(error.hint).toBe('Custom hint');
    });

    it('should handle validation errors with field context', () => {
      const error = createStructuredError(ErrorCode.INVALID_ARGUMENT, {
        field: 'target',
        reason: 'cannot be empty'
      });

      expect(error.message).toContain('Invalid parameter: target');
      expect(error.message).toContain('cannot be empty');
    });
  });

  describe('createErrorResponse', () => {
    it('should format error for tool handler response', () => {
      const structuredError = createStructuredError(ErrorCode.NOT_FOUND, {
        type: 'block',
        target: 'test-uuid'
      });

      const response = createErrorResponse(structuredError);

      expect(response).toHaveProperty('error');
      expect(response.error.code).toBe(ErrorCode.NOT_FOUND);
      expect(response.error.message).toContain('block "test-uuid" not found');
      expect(response.error.hint).toBeDefined();
    });
  });

  describe('validateTypeOperation', () => {
    it('should return null for valid combinations', () => {
      expect(validateTypeOperation('page', 'create')).toBeNull();
      expect(validateTypeOperation('block', 'update')).toBeNull();
      expect(validateTypeOperation('template', 'create')).toBeNull();
    });

    it('should reject invalid types', () => {
      const error = validateTypeOperation('invalid-type', 'create');

      expect(error).not.toBeNull();
      expect(error!.code).toBe(ErrorCode.INVALID_ARGUMENT);
      expect(error!.message).toContain('Unknown content type');
    });

    it('should reject invalid operations for valid types', () => {
      const error = validateTypeOperation('page', 'delete');

      expect(error).not.toBeNull();
      expect(error!.code).toBe(ErrorCode.INVALID_COMBINATION);
      expect(error!.message).toContain('delete');
      expect(error!.message).toContain('page');
    });

    it('should reject operations on read-only types', () => {
      const error = validateTypeOperation('system', 'create');

      expect(error).not.toBeNull();
      expect(error!.code).toBe(ErrorCode.INVALID_COMBINATION);
      expect(error!.message).toContain('not valid for type');
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable errors', () => {
      expect(isRetryableError(ErrorCode.TIMEOUT)).toBe(true);
      expect(isRetryableError(ErrorCode.UNAVAILABLE)).toBe(true);
      expect(isRetryableError(ErrorCode.RATE_LIMITED)).toBe(true);
      expect(isRetryableError(ErrorCode.INTERNAL)).toBe(true);
    });

    it('should identify non-retryable errors', () => {
      expect(isRetryableError(ErrorCode.NOT_FOUND)).toBe(false);
      expect(isRetryableError(ErrorCode.INVALID_ARGUMENT)).toBe(false);
      expect(isRetryableError(ErrorCode.PERMISSION_DENIED)).toBe(false);
      expect(isRetryableError(ErrorCode.VALIDATION_ERROR)).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should calculate appropriate retry delays', () => {
      expect(getRetryDelay(ErrorCode.RATE_LIMITED, 1)).toBeGreaterThan(0);
      expect(getRetryDelay(ErrorCode.TIMEOUT, 1)).toBeGreaterThan(0);
      expect(getRetryDelay(ErrorCode.UNAVAILABLE, 1)).toBeGreaterThan(0);
      expect(getRetryDelay(ErrorCode.INTERNAL, 1)).toBe(2000);
    });

    it('should use exponential backoff for rate limiting', () => {
      const delay1 = getRetryDelay(ErrorCode.RATE_LIMITED, 1);
      const delay2 = getRetryDelay(ErrorCode.RATE_LIMITED, 2);
      
      expect(delay2).toBeGreaterThan(delay1);
    });

    it('should cap maximum delays', () => {
      const largeAttempt = 10;
      expect(getRetryDelay(ErrorCode.RATE_LIMITED, largeAttempt)).toBeLessThanOrEqual(30000);
      expect(getRetryDelay(ErrorCode.UNAVAILABLE, largeAttempt)).toBeLessThanOrEqual(10000);
    });
  });

  describe('sanitizeErrorForLogging', () => {
    it('should sanitize Error objects', () => {
      const error = new Error('Test error');
      error.stack = 'test stack trace';
      
      const sanitized = sanitizeErrorForLogging(error);

      expect(sanitized).toEqual({
        name: 'Error',
        message: 'Test error',
        stack: 'test stack trace'
      });
    });

    it('should remove sensitive fields from objects', () => {
      const errorObj = {
        message: 'Test error',
        token: 'secret-token',
        password: 'secret-password',
        data: 'safe data'
      };

      const sanitized = sanitizeErrorForLogging(errorObj) as Record<string, unknown>;

      expect(sanitized.message).toBe('Test error');
      expect(sanitized.data).toBe('safe data');
      expect(sanitized.token).toBeUndefined();
      expect(sanitized.password).toBeUndefined();
    });

    it('should handle primitive values', () => {
      expect(sanitizeErrorForLogging('string error')).toBe('string error');
      expect(sanitizeErrorForLogging(42)).toBe(42);
      expect(sanitizeErrorForLogging(null)).toBe(null);
    });
  });
});