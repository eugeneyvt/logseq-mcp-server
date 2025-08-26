/**
 * Properties Entity Validation
 * Property-specific validation and sanitization
 */

import { createStructuredError, ErrorCode } from '../../utils/system/errors.js';
import type { StructuredError } from '../../utils/system/errors.js';
import { sanitizeString } from '../../utils/security/input-validation.js';
import { logger } from '../../utils/system/logger.js';
import type { PropertyValue } from './core.js';
import { isValidPropertyKey, isSystemProperty, normalizePropertyValue } from './core.js';

/**
 * Validate property operation parameters
 */
export interface PropertyOperationParams {
  entityId: string;
  key?: string;
  value?: PropertyValue;
  keys?: string[];
  properties?: Record<string, PropertyValue>;
}

/**
 * Validate property key
 */
export function validatePropertyKey(key: string): StructuredError | null {
  if (!key || typeof key !== 'string') {
    return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
      field: 'propertyKey',
      reason: 'Property key must be a non-empty string',
      suggestion: 'Provide a valid property key'
    });
  }

  try {
    const sanitized = sanitizeString(key, 100);
    
    if (!isValidPropertyKey(sanitized)) {
      return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
        field: 'propertyKey',
        reason: 'Property key must start with letter and contain only alphanumeric, underscore, or hyphen',
        suggestion: 'Use keys like "my_property", "page-type", or "customField"'
      });
    }

    if (isSystemProperty(sanitized)) {
      return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
        field: 'propertyKey',
        reason: 'Cannot modify system property',
        suggestion: 'Use custom property keys instead of system properties'
      });
    }

    return null;
  } catch (error) {
    return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
      field: 'propertyKey',
      reason: `Property key validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      suggestion: 'Use alphanumeric characters with underscores or hyphens only'
    });
  }
}

/**
 * Validate property value
 */
export function validatePropertyValue(value: unknown): { error: StructuredError | null; normalized?: PropertyValue } {
  if (value === null || value === undefined) {
    return { error: null, normalized: '' };
  }

  try {
    const normalized = normalizePropertyValue(value);

    // Check for excessively long values
    if (typeof normalized === 'string' && normalized.length > 10000) {
      return {
        error: createStructuredError(ErrorCode.INVALID_ARGUMENT, {
          field: 'propertyValue',
          reason: 'Property value too long',
          suggestion: 'Keep property values under 10,000 characters'
        })
      };
    }

    // Check for excessively large arrays
    if (Array.isArray(normalized) && normalized.length > 1000) {
      return {
        error: createStructuredError(ErrorCode.INVALID_ARGUMENT, {
          field: 'propertyValue',
          reason: 'Property array too large',
          suggestion: 'Keep property arrays under 1,000 items'
        })
      };
    }

    return { error: null, normalized };
  } catch (error) {
    return {
      error: createStructuredError(ErrorCode.INVALID_ARGUMENT, {
        field: 'propertyValue',
        reason: `Property value validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestion: 'Ensure property value is a valid string, number, boolean, or array'
      })
    };
  }
}

/**
 * Validate entity ID for property operations
 */
export function validateEntityId(entityId: unknown): StructuredError | null {
  if (!entityId || (typeof entityId !== 'string' && typeof entityId !== 'number')) {
    return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
      field: 'entityId',
      reason: 'Entity ID must be a non-empty string or number',
      suggestion: 'Provide a valid page name or block UUID'
    });
  }

  const id = String(entityId).trim();
  if (id.length === 0) {
    return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
      field: 'entityId',
      reason: 'Entity ID cannot be empty',
      suggestion: 'Provide a valid page name or block UUID'
    });
  }

  // Basic UUID pattern check for blocks
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (id.includes('-') && !uuidPattern.test(id)) {
    return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
      field: 'entityId',
      reason: 'Invalid UUID format for block ID',
      suggestion: 'Block UUIDs should be in format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
    });
  }

  return null;
}

/**
 * Validate property operation parameters
 */
export function validatePropertyOperation(params: PropertyOperationParams, operation: 'get' | 'set' | 'remove' | 'batch'): StructuredError[] {
  const errors: StructuredError[] = [];

  // Validate entity ID
  const entityError = validateEntityId(params.entityId);
  if (entityError) {
    errors.push(entityError);
  }

  // Validate based on operation type
  switch (operation) {
    case 'get':
      if (params.key) {
        const keyError = validatePropertyKey(params.key);
        if (keyError) {
          errors.push(keyError);
        }
      }
      break;

    case 'set':
      if (!params.key) {
        errors.push(createStructuredError(ErrorCode.INVALID_ARGUMENT, {
          field: 'propertyKey',
          reason: 'Property key is required for set operation',
          suggestion: 'Provide a property key'
        }));
      } else {
        const keyError = validatePropertyKey(params.key);
        if (keyError) {
          errors.push(keyError);
        }
      }

      if (params.value !== undefined) {
        const { error } = validatePropertyValue(params.value);
        if (error) {
          errors.push(error);
        }
      }
      break;

    case 'remove':
      if (params.key) {
        const keyError = validatePropertyKey(params.key);
        if (keyError) {
          errors.push(keyError);
        }
      } else if (params.keys) {
        for (const key of params.keys) {
          const keyError = validatePropertyKey(key);
          if (keyError) {
            errors.push(keyError);
          }
        }
      } else {
        errors.push(createStructuredError(ErrorCode.INVALID_ARGUMENT, {
          field: 'propertyKey',
          reason: 'Property key or keys array is required for remove operation',
          suggestion: 'Provide either key or keys parameter'
        }));
      }
      break;

    case 'batch':
      if (!params.properties || typeof params.properties !== 'object') {
        errors.push(createStructuredError(ErrorCode.INVALID_ARGUMENT, {
          field: 'properties',
          reason: 'Properties object is required for batch operation',
          suggestion: 'Provide a valid properties object'
        }));
      } else {
        for (const [key, value] of Object.entries(params.properties)) {
          const keyError = validatePropertyKey(key);
          if (keyError) {
            errors.push(keyError);
          }

          const { error: valueError } = validatePropertyValue(value);
          if (valueError) {
            errors.push(valueError);
          }
        }
      }
      break;
  }

  return errors;
}

/**
 * Sanitize property operation parameters
 */
export function sanitizePropertyOperation(params: PropertyOperationParams): PropertyOperationParams {
  const sanitized: PropertyOperationParams = {
    entityId: String(params.entityId).trim()
  };

  if (params.key) {
    try {
      sanitized.key = sanitizeString(params.key, 100);
    } catch {
      sanitized.key = params.key;
    }
  }

  if (params.value !== undefined) {
    const { normalized } = validatePropertyValue(params.value);
    sanitized.value = normalized;
  }

  if (params.keys) {
    sanitized.keys = params.keys.map(key => {
      try {
        return sanitizeString(key, 100);
      } catch {
        return key;
      }
    });
  }

  if (params.properties) {
    sanitized.properties = {};
    for (const [key, value] of Object.entries(params.properties)) {
      try {
        const sanitizedKey = sanitizeString(key, 100);
        const { normalized } = validatePropertyValue(value);
        if (normalized !== undefined) {
          sanitized.properties[sanitizedKey] = normalized;
        }
      } catch (error) {
        logger.warn({ key, error }, 'Failed to sanitize property');
      }
    }
  }

  return sanitized;
}