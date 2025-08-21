import type { ParseConfig } from './markdown-types.js';
import { DEFAULT_CONFIG } from './markdown-config.js';

/**
 * Validate and clean markdown content before parsing
 */
export function validateMarkdownContent(
  content: string,
  config: ParseConfig = DEFAULT_CONFIG
): string {
  let cleaned = content;

  if (config.sanitizeHtml) {
    // Remove or sanitize potentially dangerous HTML
    cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    cleaned = cleaned.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
    cleaned = cleaned.replace(/javascript:/gi, '');
    cleaned = cleaned.replace(/on\w+\s*=/gi, '');
  }

  // Normalize line endings
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Remove excessive blank lines (more than 2 consecutive)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}
