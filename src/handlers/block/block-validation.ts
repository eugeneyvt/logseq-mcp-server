import { validateAndNormalizeBlockContent } from '../../utils/formatting.js';
import type { BlockValidationResult } from './block-types.js';

/**
 * Validate block content with enhanced error reporting
 */
export function validateBlockContent(content: string): BlockValidationResult {
  const validation = validateAndNormalizeBlockContent(content);
  return {
    isValid: validation.isValid,
    normalized: validation.normalized,
    errors: validation.errors || [],
  };
}

/**
 * Validate multiple blocks and return detailed results
 */
export function validateMultipleBlocks(
  items: Array<{ content: string }>
): Array<{ content: string; validation: BlockValidationResult }> {
  return items.map((item) => ({
    ...item,
    validation: validateBlockContent(item.content),
  }));
}

/**
 * Check if any blocks have validation errors
 */
export function hasValidationErrors(
  validationResults: Array<{ validation: BlockValidationResult }>
): boolean {
  return validationResults.some((item) => !item.validation.isValid);
}

/**
 * Get validation error messages for invalid blocks
 */
export function getValidationErrorMessages(
  validationResults: Array<{ content: string; validation: BlockValidationResult }>
): string[] {
  return validationResults
    .filter((item) => !item.validation.isValid)
    .map(
      (item) => `Block "${item.content.substring(0, 50)}...": ${item.validation.errors.join(', ')}`
    );
}

/**
 * Get normalized content if autofix is enabled
 */
export function getNormalizedContent(
  content: string,
  validation: BlockValidationResult,
  autofixFormat?: boolean
): string {
  if (autofixFormat && validation.normalized) {
    return validation.normalized;
  }
  return content;
}
