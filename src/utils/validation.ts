/**
 * Consolidated Security-First Validation Module
 * Integrates security validation and content formatting for unified 4-tool architecture
 */

import { logger } from './system/logger.js';
import { ErrorCode, createStructuredError, type StructuredError } from './system/errors.js';

// Import security validation functions
import {
  sanitizeString,
  validateUUID,
  validatePropertyKey as securityValidatePropertyKey
} from './security/input-validation.js';

// Essential validation constants (moved inline)
const VALID_TODO_MARKERS = ['TODO', 'DOING', 'DONE', 'WAITING', 'LATER', 'NOW', 'CANCELED'];

// Type definitions for exported types
export type TodoMarker = typeof VALID_TODO_MARKERS[number];
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalized?: string;
}

/**
 * Basic block content validation and normalization
 */
function validateAndNormalizeBlockContent(content: string, sanitize = true): {
  sanitizedContent?: string;
  error?: { message: string };
} {
  if (!content || typeof content !== 'string') {
    return { error: { message: 'Content must be a non-empty string' } };
  }

  let normalized = content.trim();
  
  if (sanitize) {
    // Basic sanitization - remove potentially harmful content
    normalized = normalized
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  return { sanitizedContent: normalized };
}

/**
 * Logseq-specific content validation that checks for security threats 
 * but does NOT HTML-encode content (since Logseq handles its own formatting)
 */
function validateLogseqBlockContent(content: string): {
  sanitizedContent?: string;
  error?: { message: string };
} {
  if (!content || typeof content !== 'string') {
    return { error: { message: 'Content must be a non-empty string' } };
  }

  if (content.length > 50000) {
    return { error: { message: 'Block content exceeds maximum length of 50000 characters' } };
  }

  // Check for potential script injection BEFORE sanitization
  if (/<script|javascript:|data:/.test(content.toLowerCase())) {
    return { error: { message: 'Block content contains potentially dangerous elements' } };
  }

  // Remove dangerous scripts but preserve all other characters (including quotes, etc.)
  // This is different from HTML encoding - we only remove actual security threats
  const sanitized = content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();

  return { sanitizedContent: sanitized };
}

/**
 * Logseq-specific page name validation that checks security but preserves formatting
 */
function validateLogseqPageName(name: string): {
  sanitizedName?: string;
  error?: { message: string };
} {
  if (typeof name !== 'string') {
    return { error: { message: 'Page name must be a string' } };
  }

  if (name.length > 1000) {
    return { error: { message: 'Page name exceeds maximum length of 1000 characters' } };
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return { error: { message: 'Page name cannot be empty' } };
  }

  // Check for invalid characters (excluding forward slash which is supported for nested pages)
  if (/[<>:"\\|?*]/.test(trimmed)) {
    return { error: { message: 'Page name contains invalid characters' } };
  }

  // Check for reserved names
  const reserved = [
    'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 
    'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 
    'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ];
  if (reserved.includes(trimmed.toUpperCase())) {
    return { error: { message: 'Page name is reserved' } };
  }

  // Return name without HTML encoding - Logseq handles its own escaping
  return { sanitizedName: trimmed };
}

// Re-export for external use
export {
  validateAndNormalizeBlockContent,
  validateLogseqBlockContent,
  validateLogseqPageName,
  VALID_TODO_MARKERS
};

/**
 * Enhanced ValidationHelpers with security-first approach
 * Replaces the basic ValidationHelpers from error-codes.ts
 */
export class SecureValidationHelpers {
  /**
   * Validate and sanitize page name with security checks
   */
  static validatePageName(name: string): StructuredError | null {
    const result = validateLogseqPageName(name);
    if (result.error) {
      return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
        field: 'target',
        reason: result.error.message,
        suggestion: 'Use valid page name characters. Avoid <, >, :, \\, |, ?, *, " and reserved system names.'
      });
    }
    logger.debug({ originalName: name, sanitizedName: result.sanitizedName }, 'Page name validated without HTML encoding');
    return null;
  }

  /**
   * Validate block UUID with format checking
   */
  static validateBlockUuid(uuid: string): StructuredError | null {
    try {
      // Use security validation which normalizes case
      const normalized = validateUUID(uuid);
      logger.debug({ originalUuid: uuid, normalizedUuid: normalized }, 'Block UUID validated');
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown validation error';
      return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
        field: 'target',
        reason: message,
        suggestion: 'Block UUID must be in format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      });
    }
  }

  /**
   * Validate and sanitize block content with security and formatting checks
   */
  static validateAndSanitizeBlockContent(content: string, autofix = true): { error: StructuredError | null; sanitizedContent?: string } {
    // Use Logseq-specific validation that doesn't HTML-encode content
    const logseqResult = validateLogseqBlockContent(content);
    if (logseqResult.error) {
      return {
        error: createStructuredError(ErrorCode.INVALID_ARGUMENT, {
          field: 'content',
          reason: logseqResult.error.message,
          suggestion: 'Remove potentially dangerous elements like scripts, ensure content length is under 50,000 characters.'
        })
      };
    }

    // Apply additional formatting validation if needed
    if (autofix) {
      const validationResult = validateAndNormalizeBlockContent(logseqResult.sanitizedContent!, true);
      
      if (validationResult.error) {
        return {
          error: createStructuredError(ErrorCode.INVALID_ARGUMENT, {
            field: 'content',
            reason: validationResult.error.message || 'Content validation failed',
            suggestion: 'Fix formatting issues. Use proper TODO markers (TODO, DOING, DONE, etc.) and [[Page Name]] for links.'
          })
        };
      }

      return {
        error: null,
        sanitizedContent: validationResult.sanitizedContent
      };
    }

    return {
      error: null,
      sanitizedContent: logseqResult.sanitizedContent
    };
  }

  /**
   * Validate property key with security checks
   */
  static validatePropertyKey(key: string): StructuredError | null {
    try {
      // Use security validation which includes sanitization
      const sanitized = securityValidatePropertyKey(key);
      logger.debug({ originalKey: key, sanitizedKey: sanitized }, 'Property key validated');
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown validation error';
      return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
        field: 'propertyKey',
        reason: message,
        suggestion: 'Property key must start with letter, contain only alphanumeric characters, underscores, or hyphens.'
      });
    }
  }

  /**
   * Validate limit parameter for search operations
   */
  static validateLimit(limit: number, maxLimit = 100): StructuredError | null {
    if (typeof limit !== 'number' || !Number.isInteger(limit)) {
      return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
        field: 'limit',
        reason: 'Limit must be an integer',
        suggestion: `Provide a number between 1 and ${maxLimit}`
      });
    }

    if (limit < 1) {
      return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
        field: 'limit',
        reason: 'Limit must be at least 1',
        suggestion: `Provide a number between 1 and ${maxLimit}`
      });
    }

    if (limit > maxLimit) {
      return createStructuredError(ErrorCode.LIMIT_EXCEEDED, {
        field: 'limit',
        reason: `Limit exceeds maximum of ${maxLimit}`,
        current_limits: { max_limit: maxLimit },
        suggestion: `Reduce limit to ${maxLimit} or fewer`
      });
    }

    return null;
  }

  /**
   * Validate template name with security checks
   */
  static validateTemplateName(name: string): StructuredError | null {
    try {
      // Use string sanitization with template-appropriate length limit
      const sanitized = sanitizeString(name, 200);
      
      // Template names should be valid identifiers
      if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(sanitized)) {
        return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
          field: 'templateName',
          reason: 'Template name must be alphanumeric with underscores/hyphens, starting with a letter',
          suggestion: 'Use names like "my_template", "daily-note", or "meeting_template"'
        });
      }

      logger.debug({ originalName: name, sanitizedName: sanitized }, 'Template name validated');
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown validation error';
      return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
        field: 'templateName',
        reason: message,
        suggestion: 'Template name should be under 200 characters and avoid special characters'
      });
    }
  }

  /**
   * Validate template content with security and single-block enforcement
   */
  static validateTemplateContent(content: unknown): StructuredError | null {
    if (Array.isArray(content) && content.length > 1) {
      return createStructuredError(ErrorCode.TEMPLATE_INVALID, {
        reason: 'Multiple blocks not allowed',
        suggestion: 'Join multiple lines with newlines in a single block'
      });
    }
    
    // Check string content for patterns that create multiple blocks in Logseq
    if (typeof content === 'string') {
      // Use Logseq-specific validation that doesn't HTML-encode
      const logseqResult = validateLogseqBlockContent(content);
      if (logseqResult.error) {
        return createStructuredError(ErrorCode.TEMPLATE_INVALID, {
          reason: `Template content validation failed: ${logseqResult.error.message}`,
          suggestion: 'Remove potentially dangerous elements like scripts, ensure content is properly formatted'
        });
      }
      
      const contentStr = logseqResult.sanitizedContent!.trim();
        
        // Check for headers (# ## ###) which create separate blocks
        const hasHeaders = /^#+\s/m.test(contentStr);
        if (hasHeaders) {
          return createStructuredError(ErrorCode.TEMPLATE_INVALID, {
            reason: 'Headers (# ## ###) create multiple blocks in Logseq',
            suggestion: 'Use bold text (**text**) instead of headers in templates'
          });
        }
        
        // Check for multiple list items which create separate blocks
        const lines = contentStr.split('\n');
        const listItems = lines.filter((line: string) => /^\s*[-*+]\s/.test(line.trim()));
        if (listItems.length > 1) {
          return createStructuredError(ErrorCode.TEMPLATE_INVALID, {
            reason: 'Multiple list items create separate blocks in Logseq',
            suggestion: 'Use single list item with nested content or comma-separated text'
          });
        }
        
        // Check for multiple paragraphs separated by blank lines
        const paragraphs = contentStr.split('\n\n').filter((p: string) => p.trim());
        if (paragraphs.length > 1) {
          return createStructuredError(ErrorCode.TEMPLATE_INVALID, {
            reason: 'Multiple paragraphs separated by blank lines create multiple blocks',
            suggestion: 'Use single paragraph with line breaks (\\n) instead of double line breaks (\\n\\n)'
          });
        }
    }
    
    return null;
  }

  /**
   * Sanitize arbitrary string input for safe processing
   */
  static sanitizeInput(input: string, maxLength = 1000): { error: StructuredError | null; sanitized?: string } {
    try {
      const sanitized = sanitizeString(input, maxLength);
      return { error: null, sanitized };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown validation error';
      return {
        error: createStructuredError(ErrorCode.INVALID_ARGUMENT, {
          field: 'input',
          reason: message,
          suggestion: `Ensure input is under ${maxLength} characters and avoid potentially dangerous content`
        })
      };
    }
  }
}

/**
 * Helper function to validate and sanitize query strings for search operations
 */
export function validateSearchQuery(query: string | undefined): { error: StructuredError | null; sanitized?: string } {
  if (!query) {
    return { error: null, sanitized: undefined };
  }

  try {
    const sanitized = sanitizeString(query, 2000); // Allow longer queries for search
    if (sanitized.length === 0) {
      return {
        error: createStructuredError(ErrorCode.INVALID_ARGUMENT, {
          field: 'query',
          reason: 'Query cannot be empty after sanitization',
          suggestion: 'Provide meaningful search terms'
        })
      };
    }
    return { error: null, sanitized };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown validation error';
    return {
      error: createStructuredError(ErrorCode.INVALID_ARGUMENT, {
        field: 'query',
        reason: message,
        suggestion: 'Keep search query under 2000 characters and avoid special characters'
      })
    };
  }
}