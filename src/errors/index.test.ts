import { describe, it, expect } from 'vitest';

import {
  JSON_RPC_ERROR_CODES,
  McpError,
  LogseqConnectionError,
  LogseqApiError,
  ValidationError,
  ConfigurationError,
  createErrorResponse,
  sanitizeErrorForLogging,
} from './index.js';

describe('Error Classes', () => {
  describe('McpError', () => {
    it('should create error with correct properties', () => {
      const error = new McpError('Test message', JSON_RPC_ERROR_CODES.INTERNAL_ERROR, {
        detail: 'test',
      });

      expect(error.message).toBe('Test message');
      expect(error.code).toBe(JSON_RPC_ERROR_CODES.INTERNAL_ERROR);
      expect(error.data).toEqual({ detail: 'test' });
      expect(error.name).toBe('McpError');
    });

    it('should convert to JSON-RPC format', () => {
      const error = new McpError('Test message', JSON_RPC_ERROR_CODES.INVALID_PARAMS, {
        field: 'test',
      });

      const jsonRpc = error.toJsonRpc();
      expect(jsonRpc).toEqual({
        code: JSON_RPC_ERROR_CODES.INVALID_PARAMS,
        message: 'Test message',
        data: { field: 'test' },
      });
    });

    it('should not include data field when undefined', () => {
      const error = new McpError('Test message', JSON_RPC_ERROR_CODES.INTERNAL_ERROR);

      const jsonRpc = error.toJsonRpc();
      expect(jsonRpc).toEqual({
        code: JSON_RPC_ERROR_CODES.INTERNAL_ERROR,
        message: 'Test message',
      });
    });
  });

  describe('LogseqConnectionError', () => {
    it('should create connection error', () => {
      const originalError = new Error('Connection failed');
      const error = new LogseqConnectionError('Failed to connect', originalError);

      expect(error.message).toBe('Failed to connect');
      expect(error.code).toBe(JSON_RPC_ERROR_CODES.LOGSEQ_CONNECTION_ERROR);
      expect(error.data).toEqual({ originalError: 'Connection failed' });
    });
  });

  describe('LogseqApiError', () => {
    it('should create API error with status code', () => {
      const error = new LogseqApiError('API failed', 404);

      expect(error.message).toBe('API failed');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe(JSON_RPC_ERROR_CODES.LOGSEQ_API_ERROR);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error', () => {
      const validationDetails = { field: 'name', error: 'required' };
      const error = new ValidationError('Validation failed', validationDetails);

      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe(JSON_RPC_ERROR_CODES.VALIDATION_ERROR);
      expect(error.data).toEqual(validationDetails);
    });
  });

  describe('ConfigurationError', () => {
    it('should create configuration error', () => {
      const configDetails = { setting: 'apiToken', issue: 'missing' };
      const error = new ConfigurationError('Config invalid', configDetails);

      expect(error.message).toBe('Config invalid');
      expect(error.code).toBe(JSON_RPC_ERROR_CODES.CONFIGURATION_ERROR);
      expect(error.data).toEqual(configDetails);
    });
  });
});

describe('Error Utilities', () => {
  describe('createErrorResponse', () => {
    it('should handle McpError', () => {
      const mcpError = new McpError('MCP error', JSON_RPC_ERROR_CODES.INVALID_REQUEST);
      const response = createErrorResponse(mcpError);

      expect(response).toEqual({
        code: JSON_RPC_ERROR_CODES.INVALID_REQUEST,
        message: 'MCP error',
      });
    });

    it('should handle regular Error', () => {
      const regularError = new Error('Regular error');
      const response = createErrorResponse(regularError);

      expect(response).toEqual({
        code: JSON_RPC_ERROR_CODES.INTERNAL_ERROR,
        message: 'Regular error',
      });
    });

    it('should handle unknown error', () => {
      const unknownError = 'String error';
      const response = createErrorResponse(unknownError);

      expect(response).toEqual({
        code: JSON_RPC_ERROR_CODES.INTERNAL_ERROR,
        message: 'An unknown error occurred',
        data: { originalError: 'String error' },
      });
    });
  });

  describe('sanitizeErrorForLogging', () => {
    it('should sanitize McpError', () => {
      const mcpError = new McpError('MCP error', JSON_RPC_ERROR_CODES.INVALID_REQUEST, {
        sensitive: 'data',
      });
      const sanitized = sanitizeErrorForLogging(mcpError);

      expect(sanitized).toEqual({
        name: 'McpError',
        message: 'MCP error',
        code: JSON_RPC_ERROR_CODES.INVALID_REQUEST,
        data: { sensitive: 'data' },
      });
    });

    it('should sanitize regular Error', () => {
      const regularError = new Error('Regular error');
      regularError.stack = 'stack trace';
      const sanitized = sanitizeErrorForLogging(regularError);

      expect(sanitized).toEqual({
        name: 'Error',
        message: 'Regular error',
        stack: 'stack trace',
      });
    });

    it('should sanitize unknown error', () => {
      const unknownError = { custom: 'error' };
      const sanitized = sanitizeErrorForLogging(unknownError);

      expect(sanitized).toEqual({
        error: '[object Object]',
      });
    });
  });
});
