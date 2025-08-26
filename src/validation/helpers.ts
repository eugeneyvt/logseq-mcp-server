/**
 * Validation Helper Functions
 * Consolidated validation utilities and preprocessing logic
 */

import type { SearchParams, EditParams, DeleteParams, GetParams } from './schemas.js';
import { ErrorCode, createStructuredError, validateTypeOperation } from '../utils/system/errors.js';

// ============================================================================
// INPUT PREPROCESSING
// ============================================================================

/**
 * Preprocess arguments to handle stringified objects and arrays
 */
export function preprocessArgs(args: unknown): unknown {
  if (typeof args !== 'object' || args === null) {
    return args;
  }

  const processed: Record<string, unknown> = { ...args };

  // Handle stringified filter parameter
  if (typeof processed.filter === 'string') {
    try {
      processed.filter = JSON.parse(processed.filter);
    } catch {
      // Not JSON, keep as string (will fail validation)
    }
  }

  // Handle stringified scope parameter
  if (typeof processed.scope === 'string') {
    try {
      processed.scope = JSON.parse(processed.scope);
    } catch {
      // Not JSON, keep as string (will fail validation)
    }
  }

  // Handle stringified arrays in filter
  if (processed.filter && typeof processed.filter === 'object') {
    const filter = processed.filter as Record<string, unknown>;
    ['tags_all', 'tags_any'].forEach(key => {
      if (typeof filter[key] === 'string') {
        try {
          filter[key] = JSON.parse(filter[key] as string);
        } catch {
          // Not JSON, keep as string
        }
      }
    });
  }

  // Handle stringified arrays in scope
  if (processed.scope && typeof processed.scope === 'object') {
    const scope = processed.scope as Record<string, unknown>;
    if (scope.page_titles && typeof scope.page_titles === 'string') {
      try {
        scope.page_titles = JSON.parse(scope.page_titles);
      } catch {
        // Not JSON, keep as string
      }
    }
  }

  return processed;
}

// ============================================================================
// PARAMETER VALIDATION
// ============================================================================

/**
 * Validate search parameters
 */
export function validateSearchParams(params: SearchParams): unknown | null {
  // Validate query if provided
  if (params.query && typeof params.query !== 'string') {
    return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
      field: 'query',
      reason: 'Query must be a string',
      suggestion: 'Provide a text query string'
    });
  }

  // Validate limit
  if (params.limit !== undefined && (params.limit < 1 || params.limit > 100)) {
    return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
      field: 'limit',
      reason: 'Limit must be between 1 and 100',
      suggestion: 'Use limit value between 1-100'
    });
  }

  // Validate scope page_titles if provided
  if (params.scope?.page_titles) {
    for (const pageName of params.scope.page_titles) {
      const pageError = validatePageName(pageName);
      if (pageError) {
        return pageError;
      }
    }
  }

  // Validate scope parent_block_id if provided
  if (params.scope?.parent_block_id) {
    const blockError = validateBlockUuid(params.scope.parent_block_id);
    if (blockError) {
      return blockError;
    }
  }

  return null;
}

/**
 * Validate get parameters
 */
export function validateGetParams(params: GetParams): unknown | null {
  // Validate target based on type
  if (Array.isArray(params.target)) {
    for (const target of params.target) {
      const targetError = validateTarget(params.type, target);
      if (targetError) {
        return targetError;
      }
    }
  } else {
    const targetError = validateTarget(params.type, params.target);
    if (targetError) {
      return targetError;
    }
  }

  return null;
}

/**
 * Validate edit parameters
 */
export function validateEditParams(params: EditParams): unknown | null {
  // Validate type+operation combination
  const typeOpError = validateTypeOperation(params.type, params.operation);
  if (typeOpError) {
    return typeOpError;
  }

  // Validate content for operations that require it
  if (['create', 'update', 'append', 'prepend'].includes(params.operation)) {
    if (!params.content) {
      return createStructuredError(ErrorCode.VALIDATION_ERROR, {
        field: 'content',
        reason: `Operation '${params.operation}' requires content`,
        suggestion: 'Provide content for this operation'
      });
    }
  }

  // Validate position for move operations
  if (params.operation === 'move' && !params.position) {
    return createStructuredError(ErrorCode.VALIDATION_ERROR, {
      field: 'position',
      reason: 'Move operation requires position specification',
      suggestion: 'Provide after_block_id, before_block_id, or parent_block_id'
    });
  }

  return null;
}

/**
 * Validate delete parameters
 */
export function validateDeleteParams(params: DeleteParams): unknown | null {
  // Validate confirmDestroy is explicitly set
  if (!params.confirmDestroy) {
    return createStructuredError(ErrorCode.VALIDATION_ERROR, {
      field: 'confirmDestroy',
      reason: 'Delete operation requires explicit confirmation',
      suggestion: 'Set confirmDestroy: true to proceed with deletion'
    });
  }

  return null;
}

// ============================================================================
// ENTITY VALIDATION  
// ============================================================================

/**
 * Validate page name
 */
export function validatePageName(pageName: string): unknown | null {
  if (!pageName || typeof pageName !== 'string') {
    return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
      field: 'pageName',
      reason: 'Page name must be a non-empty string',
      suggestion: 'Provide a valid page name'
    });
  }

  if (pageName.trim() !== pageName) {
    return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
      field: 'pageName',
      reason: 'Page name cannot have leading or trailing whitespace',
      suggestion: 'Remove leading/trailing spaces from page name'
    });
  }

  // Check for invalid characters
  const invalidChars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
  for (const char of invalidChars) {
    if (pageName.includes(char)) {
      return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
        field: 'pageName',
        reason: `Page name contains invalid character: ${char}`,
        suggestion: 'Remove invalid characters from page name'
      });
    }
  }

  return null;
}

/**
 * Validate block UUID
 */
export function validateBlockUuid(blockUuid: string): unknown | null {
  if (!blockUuid || typeof blockUuid !== 'string') {
    return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
      field: 'blockUuid',
      reason: 'Block UUID must be a non-empty string',
      suggestion: 'Provide a valid block UUID'
    });
  }

  // Basic UUID format validation (loose check)
  if (blockUuid.length < 8) {
    return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
      field: 'blockUuid',
      reason: 'Block UUID appears to be too short',
      suggestion: 'Provide a valid block UUID from Logseq'
    });
  }

  return null;
}

/**
 * Validate target based on content type
 */
function validateTarget(type: string, target: string): unknown | null {
  switch (type) {
    case 'page':
      return validatePageName(target);
    case 'block':
      return validateBlockUuid(target);
    case 'template':
      return validatePageName(target); // Templates are stored as pages
    default:
      // For other types, just validate it's a non-empty string
      if (!target || typeof target !== 'string') {
        return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
          field: 'target',
          reason: 'Target must be a non-empty string',
          suggestion: 'Provide a valid target identifier'
        });
      }
      return null;
  }
}

// ============================================================================
// CONTENT VALIDATION
// ============================================================================

/**
 * Validate and sanitize block content
 */
export function validateAndSanitizeBlockContent(
  content: string, 
  strict = true
): { content?: string; error?: unknown } {
  if (!content || typeof content !== 'string') {
    return {
      error: createStructuredError(ErrorCode.VALIDATION_ERROR, {
        field: 'content',
        reason: 'Block content must be a non-empty string',
        suggestion: 'Provide valid block content'
      })
    };
  }

  // Sanitize content
  let sanitized = content.trim();
  
  // Remove potential XSS vectors if in strict mode
  if (strict) {
    // Remove script tags
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove javascript: urls
    sanitized = sanitized.replace(/javascript:/gi, '');
  }

  // Validate length
  if (sanitized.length > 10000) {
    return {
      error: createStructuredError(ErrorCode.VALIDATION_ERROR, {
        field: 'content',
        reason: 'Block content exceeds maximum length (10000 characters)',
        suggestion: 'Reduce content length or split into multiple blocks'
      })
    };
  }

  return { content: sanitized };
}

/**
 * Process and validate array content
 */
export function processContent(content: unknown): string[] {
  if (Array.isArray(content)) {
    return content.map(item => String(item).trim()).filter(item => item.length > 0);
  }
  
  if (typeof content === 'string') {
    const trimmed = content.trim();
    return trimmed ? [trimmed] : [];
  }
  
  return [];
}