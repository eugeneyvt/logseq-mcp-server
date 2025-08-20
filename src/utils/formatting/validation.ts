import { logger } from '../logger.js';

/**
 * Valid TODO markers according to ROADMAP
 */
export const VALID_TODO_MARKERS = ['TODO', 'DOING', 'DONE', 'LATER', 'NOW', 'CANCELED'] as const;

export type TodoMarker = (typeof VALID_TODO_MARKERS)[number];

/**
 * Format validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalized?: string;
}

/**
 * Validate and normalize block content according to Logseq formatting rules
 */
export function validateAndNormalizeBlockContent(
  content: string,
  autofix = true
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  if (!content || content.trim() === '') {
    result.isValid = false;
    result.errors.push('Block content cannot be empty');
    return result;
  }

  let normalized = content;

  // Remove leading/trailing whitespace
  normalized = normalized.trim();

  // Validate and fix TODO markers
  const todoMarkerMatch = normalized.match(
    /^(TODO|DOING|DONE|LATER|NOW|CANCELED|todo|doing|done|later|now|canceled)\s/
  );
  if (todoMarkerMatch) {
    const marker = todoMarkerMatch[1];
    if (!VALID_TODO_MARKERS.includes(marker.toUpperCase() as TodoMarker)) {
      result.errors.push(`Invalid TODO marker: ${marker}`);
      result.isValid = false;
    } else if (marker !== marker.toUpperCase()) {
      if (autofix) {
        normalized = normalized.replace(/^[a-zA-Z]+\s/, marker.toUpperCase() + ' ');
        result.warnings.push(`Normalized TODO marker to uppercase: ${marker.toUpperCase()}`);
      } else {
        result.errors.push(`TODO marker should be uppercase: ${marker}`);
        result.isValid = false;
      }
    }
  }

  // Validate and fix bullet points
  if (normalized.startsWith('-') && !normalized.startsWith('- ')) {
    if (autofix) {
      normalized = normalized.replace(/^-\s*/, '- ');
      result.warnings.push('Normalized bullet point formatting');
    } else {
      result.errors.push('Bullet points must be formatted as "- " (dash followed by space)');
      result.isValid = false;
    }
  }

  // Validate and fix page links - ensure [[Page Name]] format
  const linkMatches = normalized.match(/\[\[([^\]]+)\]\]/g);
  if (linkMatches) {
    for (const match of linkMatches) {
      // Check for unclosed brackets
      if (match.includes('[[[') || match.includes(']]]')) {
        if (autofix) {
          normalized = normalized.replace(/\[\[\[([^\]]+)\]\]\]/g, '[[$1]]');
          result.warnings.push('Fixed triple brackets in page links');
        } else {
          result.errors.push('Page links should use double brackets: [[Page Name]]');
          result.isValid = false;
        }
      }
    }
  }

  // Check for unclosed page links
  const unbalancedBrackets =
    (normalized.match(/\[\[/g) || []).length !== (normalized.match(/\]\]/g) || []).length;
  if (unbalancedBrackets) {
    result.errors.push('Unbalanced page link brackets detected');
    result.isValid = false;
  }

  // Validate block properties format (key:: value)
  const propertyLines = normalized.split('\n').filter((line) => line.includes('::'));
  for (const line of propertyLines) {
    if (!line.match(/^[a-zA-Z][a-zA-Z0-9_-]*::\s+.+$/)) {
      if (autofix) {
        // Try to fix common property formatting issues
        const fixed = line.replace(/::([^\s])/, ':: $1').replace(/\s+::\s+/, ':: ');
        normalized = normalized.replace(line, fixed);
        result.warnings.push(`Fixed property formatting: ${line.trim()}`);
      } else {
        result.errors.push(`Invalid property format: ${line.trim()}. Use "key:: value" format`);
        result.isValid = false;
      }
    }
  }

  // Check for prohibited raw indentation (should be handled structurally)
  const lines = normalized.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^\s+(-|\*|•)/) && i > 0) {
      result.warnings.push(
        'Detected raw indentation. Nested blocks should be created structurally via parent/child relationships, not raw spaces.'
      );
    }
  }

  // Normalize spacing
  if (autofix) {
    // Remove multiple consecutive spaces (except in code blocks)
    normalized = normalized.replace(/  +/g, ' ');

    // Ensure single newline between logical sections
    normalized = normalized.replace(/\n\n+/g, '\n\n');
  }

  result.normalized = normalized;

  if (result.errors.length === 0) {
    result.isValid = true;
  }

  logger.debug(
    {
      originalLength: content.length,
      normalizedLength: normalized.length,
      errors: result.errors,
      warnings: result.warnings,
    },
    'Block content validation completed'
  );

  return result;
}

/**
 * Validate page name according to Logseq rules
 */
export function validatePageName(name: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  if (!name || name.trim() === '') {
    result.errors.push('Page name cannot be empty');
    result.isValid = false;
    return result;
  }

  const normalized = name.trim();

  // Check for forbidden characters (excluding forward slash which is supported for nested pages)
  const forbiddenChars = ['\\', ':', '*', '?', '"', '<', '>', '|'];
  for (const char of forbiddenChars) {
    if (normalized.includes(char)) {
      result.errors.push(`Page name cannot contain character: ${char}`);
      result.isValid = false;
    }
  }

  // Check length limits
  if (normalized.length > 255) {
    result.errors.push('Page name too long (max 255 characters)');
    result.isValid = false;
  }

  // Check for leading/trailing whitespace
  if (name !== normalized) {
    result.warnings.push('Page name has leading/trailing whitespace');
  }

  result.normalized = normalized;
  return result;
}

/**
 * Validate TODO marker transitions
 */
export function validateTodoTransition(fromState: string, toState: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  const validTransitions: Record<string, string[]> = {
    TODO: ['DOING', 'DONE', 'CANCELED', 'LATER'],
    DOING: ['DONE', 'TODO', 'CANCELED'],
    DONE: ['TODO'], // Can reopen
    LATER: ['TODO', 'DOING', 'CANCELED'],
    NOW: ['DOING', 'DONE', 'CANCELED'],
    CANCELED: ['TODO'], // Can reopen
  };

  if (!validTransitions[fromState]?.includes(toState)) {
    result.warnings.push(`Unusual TODO transition: ${fromState} → ${toState}`);
  }

  return result;
}