import type { ParsedBlock } from './markdown-types.js';
import { extractLogseqSyntax } from './markdown-utils.js';

/**
 * Enhanced fallback parsing for when AST parsing fails
 */
export function parseMarkdownWithFallback(content: string): ParsedBlock[] {
  const lines = content.split('\n');
  const blocks: ParsedBlock[] = [];
  let currentBlock = '';
  let inCodeBlock = false;
  let codeBlockLanguage = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Handle code blocks
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        blocks.push({
          content: `\`\`\`${codeBlockLanguage}\n${currentBlock}\n\`\`\``,
          type: 'code',
          level: 0,
          metadata: { language: codeBlockLanguage },
        });
        currentBlock = '';
        inCodeBlock = false;
        codeBlockLanguage = '';
      } else {
        // Start of code block
        inCodeBlock = true;
        codeBlockLanguage = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      currentBlock += (currentBlock ? '\n' : '') + line;
      continue;
    }

    // Handle other content
    if (!trimmed) {
      if (currentBlock.trim()) {
        blocks.push({
          content: currentBlock.trim(),
          type: 'paragraph',
          level: 0,
        });
        currentBlock = '';
      }
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    const listMatch = trimmed.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
    const taskMatch = trimmed.match(/^(\s*)([-*+])\s+\[([ x])\]\s+(.+)$/);
    const blockquoteMatch = trimmed.match(/^>\s*(.*)$/);

    if (headingMatch) {
      if (currentBlock.trim()) {
        blocks.push({
          content: currentBlock.trim(),
          type: 'paragraph',
          level: 0,
        });
        currentBlock = '';
      }

      const logseqSyntax = extractLogseqSyntax(trimmed);
      blocks.push({
        content: trimmed,
        type: 'heading',
        level: headingMatch[1].length,
        metadata: {
          logseqSyntax: Object.keys(logseqSyntax).length > 0 ? logseqSyntax : undefined,
        },
      });
    } else if (taskMatch) {
      if (currentBlock.trim()) {
        blocks.push({
          content: currentBlock.trim(),
          type: 'paragraph',
          level: 0,
        });
        currentBlock = '';
      }

      const logseqSyntax = extractLogseqSyntax(taskMatch[4]);
      blocks.push({
        content: taskMatch[4].trim(),
        type: 'list',
        level: Math.floor(taskMatch[1].length / 2),
        metadata: {
          taskList: true,
          checked: taskMatch[3] === 'x',
          logseqSyntax: Object.keys(logseqSyntax).length > 0 ? logseqSyntax : undefined,
        },
      });
    } else if (listMatch) {
      if (currentBlock.trim()) {
        blocks.push({
          content: currentBlock.trim(),
          type: 'paragraph',
          level: 0,
        });
        currentBlock = '';
      }

      const logseqSyntax = extractLogseqSyntax(listMatch[3]);
      blocks.push({
        content: listMatch[3].trim(),
        type: 'list',
        level: Math.floor(listMatch[1].length / 2),
        metadata: {
          logseqSyntax: Object.keys(logseqSyntax).length > 0 ? logseqSyntax : undefined,
        },
      });
    } else if (blockquoteMatch) {
      if (currentBlock.trim()) {
        blocks.push({
          content: currentBlock.trim(),
          type: 'paragraph',
          level: 0,
        });
        currentBlock = '';
      }

      const logseqSyntax = extractLogseqSyntax(blockquoteMatch[1]);
      blocks.push({
        content: trimmed,
        type: 'blockquote',
        level: 0,
        metadata: {
          logseqSyntax: Object.keys(logseqSyntax).length > 0 ? logseqSyntax : undefined,
        },
      });
    } else if (trimmed === '---') {
      if (currentBlock.trim()) {
        blocks.push({
          content: currentBlock.trim(),
          type: 'paragraph',
          level: 0,
        });
        currentBlock = '';
      }

      blocks.push({
        content: '---',
        type: 'thematic_break',
        level: 0,
      });
    } else {
      currentBlock += (currentBlock ? '\n' : '') + line;
    }
  }

  // Handle final block
  if (currentBlock.trim()) {
    const logseqSyntax = extractLogseqSyntax(currentBlock);
    blocks.push({
      content: currentBlock.trim(),
      type: 'paragraph',
      level: 0,
      metadata: {
        logseqSyntax: Object.keys(logseqSyntax).length > 0 ? logseqSyntax : undefined,
      },
    });
  }

  return blocks.filter((block) => block.content.trim().length > 0);
}
