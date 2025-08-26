/**
 * Delete Tool Validation Module
 * Parameter validation and preprocessing for delete operations
 */

import { ErrorCode, createStructuredError } from '../../utils/system/errors.js';
import { SecureValidationHelpers } from '../../utils/validation.js';
import type { DeleteParams } from '../../validation/schemas.js';

/**
 * Validate delete parameters
 */
export function validateDeleteParams(params: DeleteParams): ReturnType<typeof createStructuredError> | null {
  // Validate confirmDestroy requirement - must be explicitly true
  if (params.confirmDestroy !== true) {
    return createStructuredError(ErrorCode.VALIDATION_ERROR, {
      field: 'confirmDestroy',
      reason: 'Explicit confirmation required for deletion operations',
      suggestion: 'Set confirmDestroy: true to confirm you want to delete this content',
      provided: params.confirmDestroy
    }, 'Delete confirmation required', 'Set confirmDestroy: true to confirm deletion');
  }

  // Validate target(s) based on type
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
    }
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

  // Handle stringified control parameter
  if (typeof processed.control === 'string') {
    try {
      processed.control = JSON.parse(processed.control);
    } catch {
      // Not JSON, keep as string (will fail validation)
    }
  }

  return processed;
}