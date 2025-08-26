import type { BlockNode, LogseqBlock, ParsedBlock, RenderMode } from './types.js';
import { parseMarkdownToLogseqBlocks } from './index.js';

export function logseqBlocksToStrings(blocks: LogseqBlock[]): string[] {
  const result: string[] = [];
  function flatten(block: LogseqBlock) {
    result.push(block.content);
    if (block.children) {
      block.children.forEach(flatten);
    }
  }
  blocks.forEach(flatten);
  return result.filter((s) => s.trim().length > 0);
}

export function markdownToBlocks(markdown: string): BlockNode[] {
  const logseqBlocks = parseMarkdownToLogseqBlocks(markdown);
  const toNode = (b: LogseqBlock): BlockNode => ({ text: b.content, children: (b.children || []).map(toNode) });
  return logseqBlocks.map(toNode);
}

export function renderBlocksFromMarkdown(
  markdown: string,
  mode: RenderMode,
  toBlocks: (md: string) => { text: string; children: { text: string; children: never[] }[] }[]
): BlockNode[] {
  const roots = toBlocks(markdown) as unknown as BlockNode[];
  if (mode === 'readable') {
    return roots;
  }
  const lines: string[] = [];
  const walk = (nodes: BlockNode[]) => {
    for (const n of nodes) {
      if (n.text && n.text.trim()) {
        lines.push(n.text.trim());
      }
      if (n.children && n.children.length) {
        walk(n.children);
      }
    }
  };
  walk(roots);
  const text = lines.join('\n');
  return [{ text, children: [] }];
}

export function parseMarkdownToBlocks(content: string): ParsedBlock[] {
  if (!content || content.trim().length === 0) {
    return [];
  }
  const logseqBlocks = parseMarkdownToLogseqBlocks(content);
  return logseqBlocks.map((block) => ({
    content: block.content,
    type: 'text',
    children: block.children?.map((child) => ({ content: child.content, type: 'text' })),
  }));
}
