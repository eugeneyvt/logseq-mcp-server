import type { ParseConfig } from './markdown-types.js';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

/**
 * Default configuration for markdown parsing
 */
export const DEFAULT_CONFIG: ParseConfig = {
  allowHtml: true,
  preserveLogseqSyntax: true,
  sanitizeHtml: true,
  maxNestingLevel: 10,
};

/**
 * Set up DOMPurify for server-side usage
 */
const window = new JSDOM('').window;
export const purify = DOMPurify(window);
