import type { List, ListItem } from 'mdast';
import type { ParsedBlock, ParseConfig } from './markdown-types.js';
import { extractLogseqSyntax, nodeToMarkdown } from './markdown-utils.js';

/**
 * Process list items with proper nesting and task list support
 */
export function processListItems(
  listNode: List,
  parentLevel = 0,
  config: ParseConfig = {}
): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];

  listNode.children.forEach((listItem: ListItem) => {
    const isTaskList = listItem.checked !== null && listItem.checked !== undefined;
    const level = parentLevel;

    // Extract main content
    let itemContent = '';
    const childBlocks: ParsedBlock[] = [];

    listItem.children.forEach((child) => {
      if (child.type === 'paragraph') {
        itemContent += child.children.map((n) => nodeToMarkdown(n, config)).join('');
      } else if (child.type === 'list') {
        // Nested list
        childBlocks.push(
          ...processListItems(
            child as List,
            Math.min(level + 1, config.maxNestingLevel || 10),
            config
          )
        );
      } else {
        itemContent += nodeToMarkdown(child, config);
      }
    });

    if (itemContent.trim()) {
      const logseqSyntax = extractLogseqSyntax(itemContent);

      const block: ParsedBlock = {
        content: itemContent.trim(),
        type: 'list',
        level: Math.min(level, config.maxNestingLevel || 10),
      };

      if (isTaskList || Object.keys(logseqSyntax).length > 0) {
        block.metadata = {};
        if (isTaskList) {
          block.metadata.taskList = true;
          block.metadata.checked = listItem.checked ?? undefined;
        }
        if (Object.keys(logseqSyntax).length > 0) {
          block.metadata.logseqSyntax = logseqSyntax;
        }
      }

      blocks.push(block);
    }

    // Add nested blocks
    blocks.push(...childBlocks);
  });

  return blocks;
}
