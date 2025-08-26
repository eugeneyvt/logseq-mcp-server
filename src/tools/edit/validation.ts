/**
 * Edit Tool Validation Module
 * Contains parameter validation and input sanitization for edit operations
 */

import { ErrorCode, createStructuredError } from '../../utils/system/errors.js';
import { SecureValidationHelpers } from '../../utils/validation.js';
import type { EditParams as BaseEditParams } from '../../validation/schemas.js';

// Internal type for single target operations
export type SingleTargetEditParams = Omit<BaseEditParams, 'target'> & { target: string };

/**
 * Validate edit parameters based on type and operation
 */
export function validateEditParams(params: BaseEditParams): ReturnType<typeof createStructuredError> | null {
  // Validate target(s) based on type
  const targets = Array.isArray(params.target) ? params.target : [params.target];
  
  // Disallow using template property when type is not 'template'
  if (params.type !== 'template' && params.content) {
    const contentStr = Array.isArray(params.content)
      ? params.content.map((c) => String(c)).join('\n')
      : String(params.content);
    if (/\btemplate::/i.test(contentStr)) {
      return createStructuredError(ErrorCode.INVALID_COMBINATION, {
        field: 'content',
        reason: 'template:: property is only allowed for template operations',
        suggestion: 'Use type "template" to create or modify templates, or remove the template:: property from content'
      });
    }
  }

  for (const target of targets) {
    switch (params.type) {
      case 'page': {
        const pageError = SecureValidationHelpers.validatePageName(target);
        if (pageError) {
          return pageError;
        }
        break;
      }

      case 'block': {
        // For block creation, allow page names as target (will be resolved later)
        // For other operations, require block UUIDs
        if (params.operation === 'create') {
          // Allow either page name or block UUID for block creation
          const pageError = SecureValidationHelpers.validatePageName(target);
          const blockError = SecureValidationHelpers.validateBlockUuid(target);
          if (pageError && blockError) {
            return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
              field: 'target',
              reason: 'Block creation target must be a page name or block UUID',
              suggestion: 'Use page name for new blocks, or block UUID for positioning within existing block tree'
            });
          }
        } else {
          // For update/move operations, require block UUID
          const blockError = SecureValidationHelpers.validateBlockUuid(target);
          if (blockError) {
            return blockError;
          }
        }
        break;
      }

      case 'template': {
        const pageError = SecureValidationHelpers.validatePageName(target);
        if (pageError) {
          return pageError;
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

  // Validate operation-specific requirements
  switch (params.operation) {
    case 'create':
      // For templates: allow either content OR templateName + variables
      if (params.type === 'template') {
        if (!params.content && !params.templateName) {
          return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
            field: 'content',
            reason: 'Either content or templateName required for template creation',
            suggestion: 'Provide content parameter for new templates, or templateName + variables for template instantiation'
          });
        }
      }
      // For other types: content required (except page, properties, and relations with 2+ targets)
      else if (!params.content && params.type !== 'page' && params.type !== 'properties') {
        // Relations can use target array instead of content
        if (params.type === 'relations' && Array.isArray(params.target) && params.target.length >= 2) {
          // Relations with target array don't need content
        } else {
          return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
            field: 'content',
            reason: 'Content required for create operations',
            suggestion: params.type === 'relations' 
              ? 'Provide either content parameter or two targets in array [source, target]'
              : 'Provide content parameter'
          });
        }
      }
      break;
      
    case 'update':
      // Content not required for properties (uses propertyKey/propertyValue)
      // Content not required for tasks (uses taskState for state transitions)
      if (!params.content && params.type !== 'properties' && params.type !== 'tasks') {
        return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
          field: 'content',
          reason: 'Content required for update operations',
          suggestion: 'Provide content parameter'
        });
      }
      break;
      
    case 'move':
      if (!params.position) {
        return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
          field: 'position',
          reason: 'Position required for move operations',
          suggestion: 'Provide position with after_block_id, before_block_id, or parent_block_id'
        });
      }
      break;
    case 'remove':
      if (params.confirmDestroy !== true) {
        return createStructuredError(ErrorCode.VALIDATION_ERROR, {
          field: 'confirmDestroy',
          reason: 'confirmDestroy must be explicitly set to true for remove operations',
          suggestion: 'Add confirmDestroy: true to confirm deletion'
        });
      }
      break;
  }

  // Type-specific validation
  switch (params.type) {
    case 'properties':
      if (params.operation === 'create' || params.operation === 'update') {
        if (!params.propertyKey) {
          return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
            field: 'propertyKey',
            reason: 'Property key required for property operations',
            suggestion: 'Provide propertyKey parameter'
          });
        }
        if (params.propertyValue === undefined) {
          return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
            field: 'propertyValue',
            reason: 'Property value required for create/update property operations',
            suggestion: 'Provide propertyValue parameter'
          });
        }
      }
      break;

    case 'template':
      if (params.operation === 'create' && !params.templateName) {
        return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
          field: 'templateName',
          reason: 'Template name required for template creation',
          suggestion: 'Provide templateName parameter'
        });
      }

      // For template instantiation (templateName provided without new content), require explicit target page
      if (params.templateName && !params.content) {
        const t = Array.isArray(params.target) ? params.target[0] : params.target;
        if (!t || typeof t !== 'string' || t.trim().length === 0) {
          return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
            field: 'target',
            reason: 'Target page is required for inserting a template',
            suggestion: 'Specify the page name to append the template to'
          });
        }
      }

      // Enforce single-block template rule
      // Relax strict rejection: parsing will normalize to a single-root structure in entities
      // Still validate content for safety if provided
      if (params.content && (params.operation === 'create' || params.operation === 'update')) {
        const contentStr = String(params.content);
        const contentValidation = SecureValidationHelpers.validateAndSanitizeBlockContent(contentStr, true);
        if (contentValidation.error) {
          return contentValidation.error;
        }
      }
      break;

    case 'block':
      if (params.operation === 'create' && params.position) {
        // Validate position parameters
        const posKeys = ['after_block_id', 'before_block_id', 'parent_block_id'];
        const providedKeys = posKeys.filter(key => params.position![key as keyof typeof params.position]);
        if (providedKeys.length > 1) {
          return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
            field: 'position',
            reason: 'Only one position parameter allowed',
            suggestion: 'Use either after_block_id, before_block_id, or parent_block_id'
          });
        }
      }
      break;

    case 'tasks':
      if (params.operation === 'create' && !params.taskState) {
        return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
          field: 'taskState',
          reason: 'Task state required for task creation',
          suggestion: 'Provide taskState parameter (TODO, DOING, DONE, etc.)'
        });
      }
      if (params.operation === 'update' && !params.taskState) {
        return createStructuredError(ErrorCode.INVALID_ARGUMENT, {
          field: 'taskState',
          reason: 'Task state required for task status updates',
          suggestion: 'Provide taskState parameter (TODO, DOING, DONE, etc.)'
        });
      }
      break;
  }

  return null;
}

/**
 * Process and validate content, splitting into blocks if needed
 */
export function processContent(content: string, parseMarkdown: boolean): string[] {
  if (!content) {return [];}
  
  // If parsing markdown, split into individual blocks
  if (parseMarkdown) {
    // Parse markdown content into separate blocks
    const lines = content.split('\n');
    const blocks: string[] = [];
    let currentBlock = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // New block indicators
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || 
          trimmed.match(/^\d+\.\s/) || trimmed.startsWith('#')) {
        if (currentBlock.trim()) {
          blocks.push(currentBlock.trim());
        }
        currentBlock = line;
      } else {
        currentBlock += (currentBlock ? '\n' : '') + line;
      }
    }
    
    if (currentBlock.trim()) {
      blocks.push(currentBlock.trim());
    }
    
    return blocks.length > 0 ? blocks : [content];
  }
  
  // Return as single block
  return [content];
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

  // Handle stringified propertyValue
  if (typeof processed.propertyValue === 'string') {
    try {
      processed.propertyValue = JSON.parse(processed.propertyValue);
    } catch {
      // Not JSON, keep as string
    }
  }

  return processed;
}

/**
 * Extract placeholders from template content for validation
 */
export function extractPlaceholders(content: string): string[] {
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const placeholders: string[] = [];
  let match;
  
  while ((match = placeholderRegex.exec(content)) !== null) {
    const placeholder = match[1].trim();
    if (!placeholders.includes(placeholder)) {
      placeholders.push(placeholder);
    }
  }
  
  return placeholders;
}
