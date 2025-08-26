/**
 * Consolidated Error Handling
 * All error types, creation utilities, and message templates
 */

// ============================================================================
// ERROR TYPES & ENUMS
// ============================================================================

export enum ErrorCode {
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  
  // Validation errors
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
  INVALID_COMBINATION = 'INVALID_COMBINATION',
  TEMPLATE_INVALID = 'TEMPLATE_INVALID',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // Permission/access errors  
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // State/consistency errors
  CONFLICT = 'CONFLICT',
  GRAPH_CONSISTENCY = 'GRAPH_CONSISTENCY',
  
  // Resource limit errors
  TOO_MUCH_DATA = 'TOO_MUCH_DATA',
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
  
  // System errors
  INTERNAL = 'INTERNAL',
  TIMEOUT = 'TIMEOUT',
  UNAVAILABLE = 'UNAVAILABLE'
}

export interface ErrorDetails {
  invalid_fields?: string[];
  suggested_values?: unknown[];
  valid_combinations?: string[];
  documentation_link?: string;
  retry_after?: number;
  current_limits?: Record<string, number>;
  [key: string]: unknown;
}

export interface StructuredError {
  code: ErrorCode;
  message: string;
  hint?: string;
  details?: ErrorDetails;
}

export interface ErrorContext {
  type?: string;
  target?: string;
  id?: string;
  operation?: string;
  validOps?: string[];
  reason?: string;
  field?: string;
  suggestion?: string;
  resource?: string;
  count?: number;
  limit?: number;
  requests?: number;
  retryAfter?: number;
  actual?: number;
  error?: string;
  timeout?: number;
  [key: string]: unknown;
}

// ============================================================================
// ERROR MESSAGE TEMPLATES
// ============================================================================

const ERROR_TEMPLATES: Record<ErrorCode, {
  message: (context: ErrorContext) => string;
  hint: (context: ErrorContext) => string;
}> = {
  [ErrorCode.NOT_FOUND]: {
    message: (ctx) => `${ctx.type || 'Resource'} "${ctx.target || ctx.id}" not found`,
    hint: (ctx) => ctx.suggestion || `Check the ${ctx.type || 'resource'} identifier. Use Search tool to find available ${ctx.type || 'items'}.`
  },
  
  [ErrorCode.INVALID_COMBINATION]: {
    message: (ctx) => `Operation "${ctx.operation}" is not valid for type "${ctx.type}"`,
    hint: (ctx) => ctx.suggestion || `Valid operations for ${ctx.type}: ${ctx.validOps?.join(', ') || 'unknown'}. Check the type+operation compatibility matrix.`
  },
  
  [ErrorCode.TEMPLATE_INVALID]: {
    message: (ctx) => `Template validation failed: ${ctx.reason || 'invalid format'}`,
    hint: (ctx) => ctx.suggestion || 'Templates must be single blocks. Multi-line content should be joined with newlines within one block.'
  },
  
  [ErrorCode.INVALID_ARGUMENT]: {
    message: (ctx) => `Invalid parameter: ${ctx.field || 'unknown'} - ${ctx.reason || 'validation failed'}`,
    hint: (ctx) => ctx.suggestion || 'Check parameter format and try again.'
  },

  [ErrorCode.VALIDATION_ERROR]: {
    message: (ctx) => `Validation failed: ${ctx.reason || 'invalid input'}`,
    hint: (ctx) => ctx.suggestion || 'Check input format and required fields.'
  },
  
  [ErrorCode.PERMISSION_DENIED]: {
    message: (ctx) => `Access denied to ${ctx.resource || 'resource'}`,
    hint: (ctx) => ctx.suggestion || 'Check Logseq API token and permissions. Ensure HTTP API is enabled in Logseq settings.'
  },
  
  [ErrorCode.CONFLICT]: {
    message: (ctx) => `Operation conflicts with current state: ${ctx.reason || 'unknown conflict'}`,
    hint: (ctx) => ctx.suggestion || 'Resource may have been modified. Retry with current state or use idempotency key.'
  },
  
  [ErrorCode.TOO_MUCH_DATA]: {
    message: (ctx) => `Result set too large: ${ctx.count || 'unknown'} items (limit: ${ctx.limit || 100})`,
    hint: (ctx) => ctx.suggestion || 'Use more specific filters or pagination with cursor to reduce result size.'
  },
  
  [ErrorCode.RATE_LIMITED]: {
    message: (ctx) => `Rate limit exceeded: ${ctx.requests || 'too many'} requests`,
    hint: (ctx) => ctx.suggestion || `Wait ${ctx.retryAfter || 60} seconds before retrying or use batching to reduce request count.`
  },
  
  [ErrorCode.ALREADY_EXISTS]: {
    message: (ctx) => `${ctx.type || 'Resource'} "${ctx.target}" already exists`,
    hint: (ctx) => ctx.suggestion || 'Use update operation instead of create, or check if resource already meets your needs.'
  },
  
  [ErrorCode.GRAPH_CONSISTENCY]: {
    message: (ctx) => `Graph consistency violation: ${ctx.reason || 'integrity error'}`,
    hint: (ctx) => ctx.suggestion || 'Operation would create orphaned references or circular dependencies. Use cascade options or fix references first.'
  },
  
  [ErrorCode.LIMIT_EXCEEDED]: {
    message: (ctx) => `Limit exceeded: ${ctx.actual || 'unknown'} > ${ctx.limit || 'unknown'} ${ctx.resource || 'items'}`,
    hint: (ctx) => ctx.suggestion || 'Reduce operation scope or use batching with smaller chunks.'
  },
  
  [ErrorCode.INTERNAL]: {
    message: (ctx) => `Internal server error: ${ctx.error || 'unknown error'}`,
    hint: (ctx) => ctx.suggestion || 'Check Logseq connection and API availability. Retry operation or contact support.'
  },
  
  [ErrorCode.TIMEOUT]: {
    message: (ctx) => `Operation timed out after ${ctx.timeout || 'unknown'} seconds`,
    hint: (ctx) => ctx.suggestion || 'Reduce operation scope or check Logseq performance. Large graphs may need smaller batch sizes.'
  },
  
  [ErrorCode.UNAVAILABLE]: {
    message: (ctx) => `Service unavailable: ${ctx.reason || 'Logseq not responding'}`,
    hint: (ctx) => ctx.suggestion || 'Check Logseq is running and HTTP API is enabled. Verify connection settings.'
  }
};

// ============================================================================
// ERROR CREATION UTILITIES
// ============================================================================

/**
 * Create a structured error response
 */
export function createStructuredError(
  code: ErrorCode,
  context: ErrorContext = {},
  customMessage?: string,
  customHint?: string
): StructuredError {
  const template = ERROR_TEMPLATES[code];
  
  return {
    code,
    message: customMessage || template.message(context),
    hint: customHint || template.hint(context),
    details: context.details as ErrorDetails | undefined
  };
}

/**
 * Create an error response for tool handlers
 */
export function createErrorResponse(error: StructuredError) {
  return {
    error: {
      code: error.code,
      message: error.message,
      hint: error.hint,
      details: error.details
    }
  };
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(code: ErrorCode): boolean {
  return [
    ErrorCode.TIMEOUT,
    ErrorCode.UNAVAILABLE,
    ErrorCode.RATE_LIMITED,
    ErrorCode.INTERNAL
  ].includes(code);
}

/**
 * Get retry delay for retryable errors
 */
export function getRetryDelay(code: ErrorCode, attempt: number): number {
  switch (code) {
    case ErrorCode.RATE_LIMITED:
      return Math.min(1000 * Math.pow(2, attempt), 30000); // Exponential backoff, max 30s
    case ErrorCode.TIMEOUT:
      return 1000 * attempt; // Linear backoff for timeouts
    case ErrorCode.UNAVAILABLE:
      return Math.min(500 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s
    case ErrorCode.INTERNAL:
      return 2000; // Fixed delay for internal errors
    default:
      return 1000;
  }
}

/**
 * Type+Operation validation with helpful errors
 */
export function validateTypeOperation(type: string, operation: string): StructuredError | null {
  const validOps: Record<string, string[]> = {
    page: ['create', 'update', 'append', 'prepend'],
    block: ['create', 'update', 'move', 'append', 'prepend'],
    template: ['create', 'update', 'append'],
    properties: ['create', 'update', 'remove'],
    relations: ['create', 'remove', 'update'],
    tasks: ['create', 'update', 'move'],
    system: [], // read-only
    graph: [] // read-only
  };
  
  const allowedOps = validOps[type];
  
  if (!allowedOps) {
    return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
      field: 'type',
      reason: `Unknown content type: ${type}`,
      suggestion: `Valid types: ${Object.keys(validOps).join(', ')}`
    });
  }
  
  if (allowedOps.length === 0) {
    return createStructuredError(ErrorCode.INVALID_COMBINATION, {
      type,
      operation,
      reason: `Type "${type}" is read-only`,
      suggestion: 'Use Get tool to retrieve this content type'
    });
  }
  
  if (!allowedOps.includes(operation)) {
    return createStructuredError(ErrorCode.INVALID_COMBINATION, {
      type,
      operation,
      validOps: allowedOps
    });
  }
  
  return null;
}

/**
 * Sanitize error for safe logging (remove sensitive data)
 */
export function sanitizeErrorForLogging(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }
  
  if (error && typeof error === 'object') {
    // Create a shallow copy to avoid modifying original
    const sanitized = { ...error };
    
    // Remove potentially sensitive keys
    const sensitiveKeys = ['token', 'password', 'secret', 'key', 'auth', 'authorization'];
    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        delete (sanitized as Record<string, unknown>)[key];
      }
    }
    
    return sanitized;
  }
  
  return error;
}