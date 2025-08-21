import type { Heading, List, Table, TableCell, Image, Node } from 'mdast';
import type { ParsedBlock, ParseConfig } from './markdown-types.js';
import { nodeToMarkdown } from './markdown-utils.js';
import { processListItems } from './markdown-list-processor.js';

type LogseqSyntax = {
  pageLinks?: string[];
  blockRefs?: string[];
  tags?: string[];
  properties?: Record<string, string>;
};

/**
 * Handle heading nodes
 */
export function handleHeading(
  node: Node,
  nodeContent: string,
  logseqSyntax: LogseqSyntax
): ParsedBlock {
  const headingNode = node as Heading;
  const block: ParsedBlock = {
    content: nodeContent,
    type: 'heading',
    level: headingNode.depth,
  };

  if (Object.keys(logseqSyntax).length > 0) {
    block.metadata = { logseqSyntax };
  }

  return block;
}

/**
 * Handle list nodes
 */
export function handleList(node: Node, config: ParseConfig): ParsedBlock[] {
  return processListItems(node as List, 0, config);
}

/**
 * Handle code nodes
 */
export function handleCode(
  node: Node,
  nodeContent: string,
  logseqSyntax: LogseqSyntax
): ParsedBlock | null {
  const codeNode = node as { lang?: string };
  if (!nodeContent.trim()) {
    return null;
  }

  const block: ParsedBlock = {
    content: nodeContent.trim(),
    type: 'code',
    level: 0,
  };

  // Always add metadata for code blocks to include language (even if empty)
  block.metadata = {
    language: codeNode.lang || '',
  };
  if (Object.keys(logseqSyntax).length > 0) {
    block.metadata.logseqSyntax = logseqSyntax;
  }

  return block;
}

/**
 * Handle table nodes
 */
export function handleTable(
  node: Node,
  nodeContent: string,
  logseqSyntax: LogseqSyntax
): ParsedBlock {
  const tableNode = node as Table;
  const headers =
    tableNode.children[0]?.children.map((cell: TableCell) =>
      nodeToMarkdown(cell, {
        allowHtml: true,
        preserveLogseqSyntax: true,
        sanitizeHtml: true,
        maxNestingLevel: 10,
      }).trim()
    ) || [];

  const block: ParsedBlock = {
    content: nodeContent,
    type: 'table',
    level: 0,
  };

  if (headers.length > 0 || Object.keys(logseqSyntax).length > 0) {
    block.metadata = {};
    if (headers.length > 0) {
      block.metadata.tableHeaders = headers;
    }
    if (Object.keys(logseqSyntax).length > 0) {
      block.metadata.logseqSyntax = logseqSyntax;
    }
  }

  return block;
}

/**
 * Handle blockquote nodes
 */
export function handleBlockquote(nodeContent: string, logseqSyntax: LogseqSyntax): ParsedBlock {
  const block: ParsedBlock = {
    content: nodeContent,
    type: 'blockquote',
    level: 0,
  };

  if (Object.keys(logseqSyntax).length > 0) {
    block.metadata = { logseqSyntax };
  }

  return block;
}

/**
 * Handle image nodes
 */
export function handleImage(
  node: Node,
  nodeContent: string,
  logseqSyntax: LogseqSyntax
): ParsedBlock {
  const imageNode = node as Image;
  const block: ParsedBlock = {
    content: nodeContent,
    type: 'image',
    level: 0,
  };

  if (imageNode.url || imageNode.alt || Object.keys(logseqSyntax).length > 0) {
    block.metadata = {};
    if (imageNode.url) {
      block.metadata.url = imageNode.url;
    }
    if (imageNode.alt) {
      block.metadata.alt = imageNode.alt;
    }
    if (Object.keys(logseqSyntax).length > 0) {
      block.metadata.logseqSyntax = logseqSyntax;
    }
  }

  return block;
}

/**
 * Handle thematic break nodes
 */
export function handleThematicBreak(): ParsedBlock {
  return {
    content: '---',
    type: 'thematic_break',
    level: 0,
  };
}

/**
 * Handle HTML nodes
 */
export function handleHtml(
  nodeContent: string,
  logseqSyntax: LogseqSyntax,
  config: ParseConfig
): ParsedBlock | null {
  if (!config.allowHtml || !nodeContent.trim()) {
    return null;
  }

  const block: ParsedBlock = {
    content: nodeContent.trim(),
    type: 'html',
    level: 0,
  };

  if (Object.keys(logseqSyntax).length > 0) {
    block.metadata = { logseqSyntax };
  }

  return block;
}

/**
 * Handle paragraph nodes (including image-only paragraphs)
 */
export function handleParagraph(
  node: Node,
  nodeContent: string,
  logseqSyntax: LogseqSyntax
): ParsedBlock | null {
  if (!nodeContent.trim()) {
    return null;
  }

  // Check if this paragraph contains only an image
  const paragraphNode = node as { children?: Array<{ type: string; url?: string; alt?: string }> };
  if (paragraphNode.children?.length === 1 && paragraphNode.children[0].type === 'image') {
    const imageNode = paragraphNode.children[0];
    const block: ParsedBlock = {
      content: nodeContent.trim(),
      type: 'image',
      level: 0,
    };

    if (imageNode.url || imageNode.alt || Object.keys(logseqSyntax).length > 0) {
      block.metadata = {};
      if (imageNode.url) {
        block.metadata.url = imageNode.url;
      }
      if (imageNode.alt) {
        block.metadata.alt = imageNode.alt;
      }
      if (Object.keys(logseqSyntax).length > 0) {
        block.metadata.logseqSyntax = logseqSyntax;
      }
    }

    return block;
  } else {
    // Regular paragraph
    const block: ParsedBlock = {
      content: nodeContent.trim(),
      type: 'paragraph',
      level: 0,
    };

    if (Object.keys(logseqSyntax).length > 0) {
      block.metadata = { logseqSyntax };
    }

    return block;
  }
}

/**
 * Handle default/unknown node types
 */
export function handleDefault(nodeContent: string, logseqSyntax: LogseqSyntax): ParsedBlock | null {
  if (!nodeContent.trim()) {
    return null;
  }

  const block: ParsedBlock = {
    content: nodeContent.trim(),
    type: 'paragraph',
    level: 0,
  };

  if (Object.keys(logseqSyntax).length > 0) {
    block.metadata = { logseqSyntax };
  }

  return block;
}
