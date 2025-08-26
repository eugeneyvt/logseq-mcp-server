import type { Root, List, ListItem, Table, TableRow, TableCell } from 'mdast';
import { normalizeTaskMarker } from './normalize.js';
import type { LogseqBlock, MdNode } from './types.js';

export function mdastToLogseqBlocks(tree: Root): LogseqBlock[] {
  const blocks: LogseqBlock[] = [];
  let currentTextBlock: LogseqBlock | null = null;

  const flush = () => {
    if (currentTextBlock && currentTextBlock.content.trim()) {
      blocks.push(currentTextBlock);
    }
    currentTextBlock = null;
  };

  for (const node of tree.children) {
    switch (node.type) {
      case 'heading': {
        flush();
        const depth = (node as unknown as { depth?: number }).depth ?? 1;
        const title = extractTextContent(node as unknown as MdNode);
        currentTextBlock = { content: `${'#'.repeat(Math.max(1, Math.min(6, depth)))} ${title}`, children: [] };
        break;
      }
      case 'paragraph':
      case 'code':
      case 'blockquote':
      case 'thematicBreak': {
        const part = extractTextContent(node as unknown as MdNode);
        if (!currentTextBlock) {
          currentTextBlock = { content: part, children: [] };
        } else {
          currentTextBlock.content += (currentTextBlock.content.trim().length ? '\n\n' : '') + part;
        }
        break;
      }
      case 'list': {
        const listBlocks = convertListToBlocks(node as List);
        if (currentTextBlock) {
          if (!currentTextBlock.children) {
            currentTextBlock.children = [];
          }
          currentTextBlock.children.push(...listBlocks);
        } else {
          blocks.push(...listBlocks);
        }
        break;
      }
      default: {
        const text = extractTextContent(node as unknown as MdNode);
        if (text.trim()) {
          if (!currentTextBlock) {
            currentTextBlock = { content: text, children: [] };
          } else {
            currentTextBlock.content += (currentTextBlock.content.trim().length ? '\n\n' : '') + text;
          }
        }
      }
    }
  }

  flush();
  return blocks;
}

export function convertListToBlocks(listNode: List): LogseqBlock[] {
  const blocks: LogseqBlock[] = [];
  for (const item of listNode.children) {
    if (item.type === 'listItem') {
      const block = convertListItemToBlock(item);
      if (block) {
        blocks.push(block);
      }
    }
  }
  return blocks;
}

export function convertListItemToBlock(item: ListItem): LogseqBlock | null {
  let content = '';
  const children: LogseqBlock[] = [];
  for (const child of item.children) {
    if (child.type === 'paragraph') {
      content = extractTextContent(child as unknown as MdNode);
    } else if (child.type === 'list') {
      const nestedBlocks = convertListToBlocks(child);
      children.push(...nestedBlocks);
    }
  }
  if (!content.trim()) {
    return null;
  }
  if (item.checked !== null && item.checked !== undefined) {
    content = content.replace(/^\s*(?:[*_`]+)?\[(?:\s|x|X)?\](?:[*_`]+)?\s*/, '');
    content = (item.checked ? 'DONE ' : 'TODO ') + content;
  } else {
    content = normalizeTaskMarker(content);
  }
  const block: LogseqBlock = { content };
  if (children.length > 0) {
    block.children = children;
  }
  return block;
}

export function extractTextContent(node: MdNode): string {
  if (node.type === 'text') {
    return String(node.value ?? '');
  }
  if (node.type === 'code') {
    return '```' + (node.lang || '') + '\n' + String(node.value ?? '') + '\n```';
  }
  if (node.type === 'inlineCode') {
    return '`' + String(node.value ?? '') + '`';
  }
  if (node.type === 'blockquote') {
    return (node.children || [])
      .map((child) => extractTextContent(child as MdNode))
      .join('\n')
      .split('\n')
      .map((line: string) => '> ' + line)
      .join('\n');
  }
  if (node.type === 'emphasis') {
    const children = (node.children || []).map((child) => extractTextContent(child as MdNode)).join('');
    return '*' + children + '*';
  }
  if (node.type === 'strong') {
    const children = (node.children || []).map((child) => extractTextContent(child as MdNode)).join('');
    return '**' + children + '**';
  }
  if (node.type === 'link') {
    const text = (node.children || []).map((child) => extractTextContent(child as MdNode)).join('');
    return `[${text}](${(node as unknown as { url?: string }).url ?? ''})`;
  }
  if (node.type === 'image') {
    const alt = (node as unknown as { alt?: string }).alt ? (node as unknown as { alt?: string }).alt : '';
    return `![${alt}](${(node as unknown as { url?: string }).url})`;
  }
  if (node.type === 'table') {
    return tableToText(node as unknown as Table);
  }
  if (node.type === 'thematicBreak') {
    return '---';
  }
  if (node.type === 'break' || node.type === 'hardBreak') {
    return '\n';
  }
  if (node.type === 'math') {
    return `$$\n${node.value}\n$$`;
  }
  if (node.type === 'inlineMath') {
    return `$${node.value}$`;
  }
  if (node.type === 'html') {
    const val = String(node.value || '');
    return val.replace(/<[^>]+>/g, '');
  }
  if (node.children) {
    return (node.children as unknown[]).map((child) => extractTextContent(child as MdNode)).join('');
  }
  return String(node.value ?? '');
}

export function tableToText(table: Table): string {
  const rows = table.children as TableRow[];
  const toRow = (r: TableRow) => {
    const cells = (r.children as TableCell[]).map((c) => c.children.map((ch) => extractTextContent(ch as unknown as MdNode)).join(''));
    return `| ${cells.join(' | ')} |`;
  };
  const lines = rows.map(toRow);
  if (lines.length > 1) {
    const colCount = (rows[0].children as TableCell[]).length;
    const sep = `| ${Array(colCount).fill('---').join(' | ')} |`;
    return [lines[0], sep, ...lines.slice(1)].join('\n');
  }
  return lines.join('\n');
}
