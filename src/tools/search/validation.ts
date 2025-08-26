/**
 * Search Tool Validation Module
 * Parameter validation and preprocessing for search operations
 */

import { ErrorCode, createStructuredError } from '../../utils/system/errors.js';
import { SecureValidationHelpers } from '../../utils/validation.js';
import type { SearchParams } from '../../validation/schemas.js';

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
      const pageError = SecureValidationHelpers.validatePageName(pageName);
      if (pageError) {
        return pageError;
      }
    }
  }

  // Validate scope parent_block_id if provided
  if (params.scope?.parent_block_id) {
    const blockError = SecureValidationHelpers.validateBlockUuid(params.scope.parent_block_id);
    if (blockError) {
      return blockError;
    }
  }

  return null;
}

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

  // Handle numeric parameters that might come as strings
  ['limit', 'depth'].forEach(key => {
    if (processed[key] && typeof processed[key] === 'string') {
      const numValue = Number(processed[key]);
      if (!isNaN(numValue)) {
        processed[key] = numValue;
      }
    }
  });

  return processed;
}