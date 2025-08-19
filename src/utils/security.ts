import { ValidationError } from '../errors/index.js';

/**
 * Security utility functions for input validation and sanitization
 */

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

  // Check for invalid characters BEFORE sanitization
  if (/[<>:"/\\|?*]/.test(trimmed)) {
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

/**
 * Rate limiting by IP/client identifier
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  clientId: string,
  maxRequests = 100,
  windowMs = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();

  let entry = rateLimitStore.get(clientId);

  if (!entry || entry.resetTime <= now) {
    entry = { count: 0, resetTime: now + windowMs };
    rateLimitStore.set(clientId, entry);
  }

  // Clean up old entries periodically
  if (Math.random() < 0.01) {
    // 1% chance
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime <= now) {
        rateLimitStore.delete(key);
      }
    }
  }

  const allowed = entry.count < maxRequests;

  if (allowed) {
    entry.count++;
  }

  return {
    allowed,
    remaining: Math.max(0, maxRequests - entry.count),
    resetTime: entry.resetTime,
  };
}

/**
 * Validate API token format
 */
export function validateApiToken(token: string): boolean {
  // Basic validation - token should be alphanumeric with dots, underscores, hyphens
  const tokenRegex = /^[a-zA-Z0-9._-]+$/;

  if (!tokenRegex.test(token)) {
    return false;
  }

  // Token should be reasonably long
  if (token.length < 8) {
    return false;
  }

  return true;
}

/**
 * Sanitize error messages to prevent information disclosure
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Remove file paths and other sensitive information
    return error.message
      .replace(/\/[^\s]+/g, '[PATH]') // Remove file paths
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]') // Remove IP addresses
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]') // Remove emails
      .replace(/\b[a-f0-9]{8,}\b/gi, '[HASH]'); // Remove potential hashes/tokens (8+ hex chars)
  }

  return 'An error occurred';
}

/**
 * Content Security Policy headers for HTTP responses
 */
export const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'none'; object-src 'none';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
} as const;

/**
 * Validate configuration values for security
 */
export function validateConfig(config: Record<string, unknown>): void {
  // Check for insecure configurations
  if (typeof config.apiUrl === 'string') {
    if (
      config.apiUrl.startsWith('http://') &&
      !config.apiUrl.includes('localhost') &&
      !config.apiUrl.includes('127.0.0.1')
    ) {
      throw new ValidationError('API URL should use HTTPS in production');
    }
  }

  if (typeof config.debug === 'boolean' && config.debug) {
    console.warn('Debug mode is enabled - ensure this is intentional for production');
  }
}
