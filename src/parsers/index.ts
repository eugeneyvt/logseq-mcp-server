// Thin public API wrapper that composes the parser from smaller modules
import { processor } from './processor.js';
import { mdastToLogseqBlocks } from './mdast.js';
import { preprocessTaskMarkersInMarkdown, splitAndNormalizeTasksRecursively } from './normalize.js';
import { logseqBlocksToStrings as _logseqBlocksToStrings, markdownToBlocks as _markdownToBlocks, renderBlocksFromMarkdown as _renderBlocksFromMarkdown, parseMarkdownToBlocks as _parseMarkdownToBlocks } from './transform.js';
export type { LogseqBlock, BlockNode, ParsedBlock, RenderMode, MdNode } from './types.js';

export function parseMarkdownToLogseqBlocks(markdown: string) {
  if (!markdown || typeof markdown !== 'string' || markdown.trim().length === 0) {
    return [];
  }
  try {
    const preprocessed = preprocessTaskMarkersInMarkdown(markdown);
    const tree = processor.parse(preprocessed);
    const blocks = mdastToLogseqBlocks(tree);
    return blocks.flatMap(splitAndNormalizeTasksRecursively);
  } catch (error) {
    console.error('Failed to parse markdown with remark:', error);
    return [{ content: markdown.trim() }];
  }
}

export function parseMarkdownToLogseqStringBlocks(markdown: string): string[] {
  const blocks = parseMarkdownToLogseqBlocks(markdown);
  return _logseqBlocksToStrings(blocks);
}

export const logseqBlocksToStrings = _logseqBlocksToStrings;
export const markdownToBlocks = _markdownToBlocks;
export const renderBlocksFromMarkdown = _renderBlocksFromMarkdown;
export const parseMarkdownToBlocks = _parseMarkdownToBlocks;
