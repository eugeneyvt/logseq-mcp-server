import { ValidationError } from '../../errors/index.js';

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeString(input: string, maxLength = 10000): string {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string');
  }

  if (input.length > maxLength) {
    throw new ValidationError(`Input exceeds maximum length of ${maxLength} characters`);
  }

  // Remove or escape potentially dangerous characters
  return input
    .replace(/[<>'"&]/g, (char) => {
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
    })
    .trim();
}

/**
 * Validate and sanitize page names
 */
export function validatePageName(name: string): string {
  if (typeof name !== 'string') {
    throw new ValidationError('Page name must be a string');
  }

  if (name.length > 1000) {
    throw new ValidationError('Page name exceeds maximum length of 1000 characters');
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    throw new ValidationError('Page name cannot be empty');
  }

  // Check for invalid characters BEFORE sanitization (excluding forward slash which is supported for nested pages)
  if (/[<>:"\\|?*]/.test(trimmed)) {
    throw new ValidationError('Page name contains invalid characters');
  }

  // Check for reserved names
  const reserved = [
    'CON',
    'PRN',
    'AUX',
    'NUL',
    'COM1',
    'COM2',
    'COM3',
    'COM4',
    'COM5',
    'COM6',
    'COM7',
    'COM8',
    'COM9',
    'LPT1',
    'LPT2',
    'LPT3',
    'LPT4',
    'LPT5',
    'LPT6',
    'LPT7',
    'LPT8',
    'LPT9',
  ];
  if (reserved.includes(trimmed.toUpperCase())) {
    throw new ValidationError('Page name is reserved');
  }

  // Only escape HTML entities for output
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
 * Validate UUID format
 */
export function validateUUID(uuid: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(uuid)) {
    throw new ValidationError('Invalid UUID format');
  }

  return uuid.toLowerCase();
}

/**
 * Validate and sanitize block content
 */
export function validateBlockContent(content: string): string {
  if (typeof content !== 'string') {
    throw new ValidationError('Block content must be a string');
  }

  if (content.length > 50000) {
    throw new ValidationError('Block content exceeds maximum length of 50000 characters');
  }

  // Check for potential script injection BEFORE sanitization
  if (/<script|javascript:|data:/.test(content.toLowerCase())) {
    throw new ValidationError('Block content contains potentially dangerous elements');
  }

  // Sanitize and return
  return content
    .replace(/[<>'"&]/g, (char) => {
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
    })
    .trim();
}

/**
 * Validate property keys
 */
export function validatePropertyKey(key: string): string {
  const sanitized = sanitizeString(key, 100);

  // Property keys should be alphanumeric with underscores and hyphens
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(sanitized)) {
    throw new ValidationError(
      'Property key must be alphanumeric with underscores/hyphens, starting with a letter'
    );
  }

  return sanitized;
}