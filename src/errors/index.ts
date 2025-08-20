/**
 * Standard JSON-RPC error codes
 */
export const JSON_RPC_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // Custom error codes (application specific)
  LOGSEQ_CONNECTION_ERROR: -32001,
  LOGSEQ_API_ERROR: -32002,
  VALIDATION_ERROR: -32003,
  CONFIGURATION_ERROR: -32004,
} as const;

/**
 * Base error class for all MCP server errors
 */
export class McpError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'McpError';
  }

  /**
   * Convert to JSON-RPC error format
   */
  toJsonRpc() {
    return {
      code: this.code,
      message: this.message,
      data: this.data,
    };
  }
}

/**
 * Logseq API connection error
 */
export class LogseqConnectionError extends McpError {
  constructor(message: string, originalError?: Error) {
    super(message, JSON_RPC_ERROR_CODES.LOGSEQ_CONNECTION_ERROR, {
      originalError: originalError?.message,
    });
    this.name = 'LogseqConnectionError';
  }
}

/**
 * Logseq API error
 */
export class LogseqApiError extends McpError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    originalError?: Error
  ) {
    super(message, JSON_RPC_ERROR_CODES.LOGSEQ_API_ERROR, {
      statusCode,
      originalError: originalError?.message,
    });
    this.name = 'LogseqApiError';
  }
}

/**
 * Input validation error
 */
export class ValidationError extends McpError {
  constructor(message: string, validationDetails?: unknown) {
    super(message, JSON_RPC_ERROR_CODES.VALIDATION_ERROR, validationDetails);
    this.name = 'ValidationError';
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends McpError {
  constructor(message: string, configDetails?: unknown) {
    super(message, JSON_RPC_ERROR_CODES.CONFIGURATION_ERROR, configDetails);
    this.name = 'ConfigurationError';
  }
}

/**
 * ROADMAP error classes with standardized codes
 */
export class NotFoundError extends McpError {
  constructor(message: string, hint?: string) {
    super(message, -32004, { hint });
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends McpError {
  constructor(message: string, hint?: string) {
    super(message, -32005, { hint });
    this.name = 'ConflictError';
  }
}

export class LimitExceededError extends McpError {
  constructor(message: string, hint?: string) {
    super(message, -32006, { hint });
    this.name = 'LimitExceededError';
  }
}

export class BadQueryError extends McpError {
  constructor(message: string, hint?: string) {
    super(message, -32007, { hint });
    this.name = 'BadQueryError';
  }
}

/**
 * Helper to create a safe error response
 */
export function createErrorResponse(error: unknown): {
  code: number;
  message: string;
  data?: unknown;
} {
  if (error instanceof McpError) {
    return error.toJsonRpc();
  }

  if (error instanceof Error) {
    return {
      code: JSON_RPC_ERROR_CODES.INTERNAL_ERROR,
      message: error.message,
    };
  }

  return {
    code: JSON_RPC_ERROR_CODES.INTERNAL_ERROR,
    message: 'An unknown error occurred',
    data: { originalError: String(error) },
  };
}

/**
 * Sanitize error for logging (remove sensitive data)
 */
export function sanitizeErrorForLogging(error: unknown): Record<string, unknown> {
  if (error instanceof McpError) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      data: error.data,
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    error: String(error),
  };
}
