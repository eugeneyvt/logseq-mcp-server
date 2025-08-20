import { ValidationError } from '../../errors/index.js';

/**
 * Validate DataScript query for basic safety
 */
export function validateDataScriptQuery(query: string): string {
  if (typeof query !== 'string') {
    throw new ValidationError('DataScript query must be a string');
  }

  if (query.length > 10000) {
    throw new ValidationError('DataScript query exceeds maximum length of 10000 characters');
  }

  const trimmed = query.trim();

  // Basic checks for potentially dangerous patterns BEFORE sanitization
  const dangerousPatterns = [/eval\s*\(/i, /function\s*\(/i, /\$\{/, /javascript:/i, /<script/i];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      throw new ValidationError('DataScript query contains potentially dangerous patterns');
    }
  }

  // Ensure query is properly formatted EDN
  if (!trimmed.startsWith('[') || !trimmed.includes(':find')) {
    throw new ValidationError('DataScript query must be properly formatted EDN');
  }

  // Sanitize and return
  return trimmed.replace(/[<>'"&]/g, (char) => {
    switch (char) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      case '&':
        return '&amp;';
      default:
        return char;
    }
  });
}

/**
 * Validate search queries
 */
export function validateSearchQuery(query: string): string {
  if (typeof query !== 'string') {
    throw new ValidationError('Search query must be a string');
  }

  if (query.length > 500) {
    throw new ValidationError('Search query exceeds maximum length of 500 characters');
  }

  const trimmed = query.trim();

  if (trimmed.length === 0) {
    throw new ValidationError('Search query cannot be empty');
  }

  // Check for regex injection patterns, but allow quoted strings with special characters
  if (/[\\^$.*+?{}[\]|()]/.test(trimmed) && !/^".*"$/.test(trimmed)) {
    throw new ValidationError(
      'Search query contains special regex characters. Use quotes for literal search.'
    );
  }

  // Sanitize and return
  return trimmed.replace(/[<>&]/g, (char) => {
    switch (char) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      default:
        return char;
    }
  });
}