import type { ParsedBlock } from './markdown-types.js';

/**
 * Convert parsed blocks back to markdown format
 */
export function blocksToMarkdown(blocks: ParsedBlock[]): string {
  return blocks
    .map((block) => {
      let content = block.content;

      // Handle list items with proper indentation
      if (block.type === 'list' && block.level > 0) {
        const indent = '  '.repeat(block.level);
        content = indent + content;
      }

      return content;
    })
    .join('\n\n');
}
