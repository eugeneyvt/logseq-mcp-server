/**
 * Logseq formatting validation and normalization utilities
 *
 * Implements strict formatting rules from ROADMAP:
 * - One block = one line, starting with `- ` or `TODO ...`
 * - Strict TODO markers: `TODO`, `DOING`, `DONE`, `LATER`, `NOW`, `CANCELED`
 * - Use `[[Page Name]]` for links; auto-close brackets
 * - Block properties: `key:: value` on a single line
 * - Nested blocks: created structurally via parent/child ops, not by raw spaces
 * - Always normalize content (bullets, spacing, casing) before writing
 */

import { logger } from './logger.js';

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

  // Check for forbidden characters
  const forbiddenChars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
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
 * Extract tags and page references from content
 */
export function extractReferences(content: string): {
  pageLinks: string[];
  tags: string[];
  blockRefs: string[];
} {
  const pageLinks: string[] = [];
  const tags: string[] = [];
  const blockRefs: string[] = [];

  // Extract page links [[Page Name]]
  const pageMatches = content.match(/\[\[([^\]]+)\]\]/g);
  if (pageMatches) {
    pageLinks.push(...pageMatches.map((match) => match.slice(2, -2)));
  }

  // Extract tags #tag
  const tagMatches = content.match(/#[a-zA-Z][a-zA-Z0-9_-]*/g);
  if (tagMatches) {
    tags.push(...tagMatches.map((match) => match.slice(1)));
  }

  // Extract block references ((block-uuid))
  const blockMatches = content.match(/\(\(([a-f0-9-]+)\)\)/g);
  if (blockMatches) {
    blockRefs.push(...blockMatches.map((match) => match.slice(2, -2)));
  }

  return { pageLinks, tags, blockRefs };
}

/**
 * Generate a structural outline from flat content
 */
export function parseOutlineStructure(lines: string[]): Array<{
  content: string;
  level: number;
  children: number[];
}> {
  const structure: Array<{
    content: string;
    level: number;
    children: number[];
  }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      continue;
    }

    // Count indentation level (but warn about it since it should be structural)
    const indentMatch = lines[i].match(/^(\s*)/);
    const indentLevel = indentMatch ? Math.floor(indentMatch[1].length / 2) : 0;

    structure.push({
      content: line,
      level: indentLevel,
      children: [],
    });
  }

  // Build parent-child relationships
  for (let i = 0; i < structure.length; i++) {
    const current = structure[i];

    // Find children (next items with higher level)
    for (let j = i + 1; j < structure.length; j++) {
      const next = structure[j];

      if (next.level <= current.level) {
        break; // End of children
      }

      if (next.level === current.level + 1) {
        current.children.push(j);
      }
    }
  }

  return structure;
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
