import type { ParseConfig } from './markdown-types.js';
import { purify } from './markdown-config.js';

/**
 * Extract Logseq-specific syntax from text
 */
export function extractLogseqSyntax(text: string) {
  const pageLinks = Array.from(text.matchAll(/\[\[([^\]]+)\]\]/g)).map((m) => m[1]);
  const blockRefs = Array.from(text.matchAll(/\(\(([^)]+)\)\)/g)).map((m) => m[1]);
  const tags = Array.from(text.matchAll(/#([\w-]+)/g)).map((m) => m[1]);
  const properties: Record<string, string> = {};

  // Extract properties (key:: value)
  const propertyMatches = text.matchAll(/^([\w-]+)::\s*(.+)$/gm);
  for (const match of propertyMatches) {
    properties[match[1]] = match[2].trim();
  }

  const hasAny =
    pageLinks.length > 0 ||
    blockRefs.length > 0 ||
    tags.length > 0 ||
    Object.keys(properties).length > 0;

  if (!hasAny) {
    return {};
  }

  return {
    pageLinks: pageLinks.length > 0 ? pageLinks : undefined,
    blockRefs: blockRefs.length > 0 ? blockRefs : undefined,
    tags: tags.length > 0 ? tags : undefined,
    properties: Object.keys(properties).length > 0 ? properties : undefined,
  };
}

/**
 * Convert mdast node to markdown string representation with comprehensive support
 */
export function nodeToMarkdown(node: unknown, config: ParseConfig = {}): string {
  const typedNode = node as {
    type: string;
    value?: string;
    children?: unknown[];
    depth?: number;
    lang?: string;
    url?: string;
    alt?: string;
    title?: string;
    ordered?: boolean;
    checked?: boolean;
  };

  switch (typedNode.type) {
    case 'text': {
      return typedNode.value || '';
    }

    case 'emphasis': {
      return `*${(typedNode.children || []).map((n: unknown) => nodeToMarkdown(n, config)).join('')}*`;
    }

    case 'strong': {
      return `**${(typedNode.children || []).map((n: unknown) => nodeToMarkdown(n, config)).join('')}**`;
    }

    case 'delete': {
      // Strikethrough
      return `~~${(typedNode.children || []).map((n: unknown) => nodeToMarkdown(n, config)).join('')}~~`;
    }

    case 'inlineCode': {
      return `\`${typedNode.value || ''}\``;
    }

    case 'code': {
      const language = typedNode.lang || '';
      return `\`\`\`${language}\n${typedNode.value || ''}\n\`\`\``;
    }

    // Math support - check if node has math value
    case 'math': {
      return `$$\n${typedNode.value || ''}\n$$`;
    }

    case 'inlineMath': {
      return `$${typedNode.value || ''}$`;
    }

    case 'link': {
      const linkText = (typedNode.children || [])
        .map((n: unknown) => nodeToMarkdown(n, config))
        .join('');
      return `[${linkText}](${typedNode.url || ''})`;
    }

    case 'image': {
      return `![${typedNode.alt || ''}](${typedNode.url || ''}${typedNode.title ? ` "${typedNode.title}"` : ''})`;
    }

    case 'heading': {
      const headingText = (typedNode.children || [])
        .map((n: unknown) => nodeToMarkdown(n, config))
        .join('');
      return '#'.repeat(typedNode.depth || 1) + ' ' + headingText;
    }

    case 'paragraph': {
      return (typedNode.children || []).map((n: unknown) => nodeToMarkdown(n, config)).join('');
    }

    case 'blockquote': {
      const quoteContent = (typedNode.children || [])
        .map((n: unknown) => nodeToMarkdown(n, config))
        .join('\n');
      return quoteContent
        .split('\n')
        .map((line: string) => `> ${line}`)
        .join('\n');
    }

    case 'list': {
      return (typedNode.children || [])
        .map((item: unknown, index: number) => {
          const marker = typedNode.ordered ? `${index + 1}.` : '-';
          const itemContent = nodeToMarkdown(item, config);
          return `${marker} ${itemContent}`;
        })
        .join('\n');
    }

    case 'listItem': {
      const itemText = (typedNode.children || [])
        .map((n: unknown) => nodeToMarkdown(n, config))
        .join('\n');
      // For task lists, don't include the checkbox in the content - it's handled in metadata
      return itemText;
    }

    case 'table': {
      const tableNode = typedNode as { children?: Array<{ children?: unknown[] }> };
      const headers =
        (tableNode.children?.[0]?.children || []).map((cell: unknown) =>
          nodeToMarkdown(cell, config).trim()
        ) || [];
      const headerRow = `| ${headers.join(' | ')} |`;
      const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;

      const bodyRows = (tableNode.children || []).slice(1).map((row: unknown) => {
        const cells =
          (row as { children?: unknown[] }).children?.map((cell: unknown) =>
            nodeToMarkdown(cell, config).trim()
          ) || [];
        return `| ${cells.join(' | ')} |`;
      });

      return [headerRow, separatorRow, ...bodyRows].join('\n');
    }

    case 'tableRow':
    case 'tableCell': {
      return (typedNode.children || []).map((n: unknown) => nodeToMarkdown(n, config)).join('');
    }

    case 'thematicBreak': {
      return '---';
    }

    case 'html': {
      if (config.allowHtml) {
        return config.sanitizeHtml ? purify.sanitize(typedNode.value || '') : typedNode.value || '';
      }
      return '';
    }

    case 'break': {
      return '\n';
    }

    default: {
      if (typedNode.children) {
        return (typedNode.children || []).map((n: unknown) => nodeToMarkdown(n, config)).join('');
      }
      return typedNode.value || '';
    }
  }
}
