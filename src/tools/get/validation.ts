/**
 * Get Tool Validation Module
 * Contains parameter validation for get operations
 */

import { ErrorCode, createStructuredError } from '../../utils/system/errors.js';
import { SecureValidationHelpers } from '../../utils/validation.js';
import type { GetParams } from '../../validation/schemas.js';

/**
 * Validate get parameters based on type
 */
export function validateGetParams(params: GetParams): unknown | null {
  const targets = Array.isArray(params.target) ? params.target : [params.target];
  
  for (const target of targets) {
    switch (params.type) {
      case 'page':
      case 'template': {
        const pageError = SecureValidationHelpers.validatePageName(target);
        if (pageError) {
          return pageError;
        }
        break;
      }

      case 'block': {
        const blockError = SecureValidationHelpers.validateBlockUuid(target);
        if (blockError) {
          return blockError;
        }
        break;
      }

      case 'properties':
      case 'relations':
      case 'tasks': {
        // Allow both page names and block UUIDs for these types
        const pageError = SecureValidationHelpers.validatePageName(target);
        const blockError = SecureValidationHelpers.validateBlockUuid(target);
        if (pageError && blockError) {
          return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
            field: 'target',
            reason: `${params.type} target must be a page name or block UUID`,
            suggestion: 'Use page name or block UUID as target'
          });
        }
        break;
      }

      case 'system':
      case 'graph': {
        // For system/graph types, target can be any string identifier
        if (typeof target !== 'string' || target.trim().length === 0) {
          return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
            field: 'target',
            reason: `${params.type} target must be a non-empty string`,
            suggestion: 'Provide a valid identifier string'
          });
        }
        break;
      }
    }
  }

  // Validate depth parameter
  if (params.depth !== undefined && (params.depth < 1 || params.depth > 5)) {
    return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
      field: 'depth',
      reason: 'Depth must be between 1 and 5',
      suggestion: 'Use depth value between 1-5'
    });
  }

  // Validate preview_length parameter
  if (params.preview_length !== undefined && (params.preview_length < 10 || params.preview_length > 10000)) {
    return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
      field: 'preview_length',
      reason: 'Preview length must be between 10 and 10000 characters',
      suggestion: 'Use preview_length value between 10-10000'
    });
  }

  return null;
}

/**
 * Preprocess arguments to handle stringified arrays and normalize input
 */
export function preprocessArgs(args: unknown): unknown {
  if (typeof args !== 'object' || args === null) {
    return args;
  }

  const processed: Record<string, unknown> = { ...args };

  // Handle stringified arrays for target parameter
  if (typeof processed.target === 'string') {
    try {
      const parsed = JSON.parse(processed.target);
      if (Array.isArray(parsed)) {
        processed.target = parsed;
      }
    } catch {
      // Not JSON, keep as string
    }
  }

  // Handle stringified include parameter
  if (typeof processed.include === 'string') {
    try {
      processed.include = JSON.parse(processed.include);
    } catch {
      // Not JSON, keep as string (will fail validation)
    }
  }

  // Handle numeric parameters that might come as strings
  ['depth', 'preview_length'].forEach(key => {
    if (processed[key] && typeof processed[key] === 'string') {
      const numValue = Number(processed[key]);
      if (!isNaN(numValue)) {
        processed[key] = numValue;
      }
    }
  });

  return processed;
}