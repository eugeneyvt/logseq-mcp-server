import type { ParsedBlock } from './markdown-types.js';
import { DEFAULT_CONFIG } from './markdown-config.js';
import { validateMarkdownContent } from './markdown-validation.js';
import { parseMarkdownToBlocks } from './markdown-parser-core.js';

/**
 * Parse content with specific focus on preserving Logseq syntax
 */
export function parseLogseqMarkdown(content: string): ParsedBlock[] {
  const config = DEFAULT_CONFIG;

  const validated = validateMarkdownContent(content, config);
  return parseMarkdownToBlocks(validated, config);
}
