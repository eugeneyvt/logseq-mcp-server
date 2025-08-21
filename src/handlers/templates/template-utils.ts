import type { LogseqBlock } from '../../schemas/base-types.js';

/**
 * Extract template placeholders from blocks (e.g., {{variable}}, <%variable%>)
 */
export function extractTemplatePlaceholders(blocks: readonly LogseqBlock[]): string[] {
  const placeholders = new Set<string>();

  const extractFromContent = (content: string) => {
    // Match all template syntax: {{variable}}, <%variable%>, or {variable}
    const matches = content.match(/(\{\{[^}]+\}\}|<%[^%]+%>|\{[^{}]+\})/g);
    if (matches) {
      matches.forEach((match) => placeholders.add(match));
    }
  };

  const processBlock = (block: LogseqBlock) => {
    if (block.content) {
      extractFromContent(block.content);
    }
    if (block.children) {
      block.children.forEach(processBlock);
    }
  };

  blocks.forEach(processBlock);
  return Array.from(placeholders);
}

/**
 * Extract template placeholders from content strings
 */
export function extractTemplatePlaceholdersFromContent(contents: string[]): string[] {
  const placeholders = new Set<string>();

  const extractFromContent = (content: string) => {
    // Match all template syntax: {{variable}}, <%variable%>, or {variable}
    const matches = content.match(/(\{\{[^}]+\}\}|<%[^%]+%>|\{[^{}]+\})/g);
    if (matches) {
      matches.forEach((match) => placeholders.add(match));
    }
  };

  contents.forEach(extractFromContent);
  return Array.from(placeholders);
}

/**
 * Substitute template variables in block content
 */
export function substituteTemplateVariables(
  blocks: readonly LogseqBlock[],
  variables: Record<string, unknown>
): string[] {
  const processedContent: string[] = [];

  const processBlock = (block: LogseqBlock) => {
    if (block.content) {
      let content = block.content;

      // Replace template variables - support both {variable} and {{variable}} formats
      Object.entries(variables).forEach(([key, value]) => {
        const patterns = [
          new RegExp(`\\{\\{${key}\\}\\}`, 'g'), // {{variable}} - standard Logseq
          new RegExp(`<%${key}%>`, 'g'), // <%variable%> - alternative
          new RegExp(`\\{${key}\\}`, 'g'), // {variable} - simple format
        ];

        patterns.forEach((pattern) => {
          content = content.replace(pattern, String(value));
        });
      });

      processedContent.push(content);
    }

    // Process children recursively
    if (block.children) {
      block.children.forEach(processBlock);
    }
  };

  blocks.forEach(processBlock);
  return processedContent;
}

/**
 * Normalize template placeholders to proper Logseq syntax
 */
export function normalizeTemplatePlaceholders(content: string): string {
  // Convert {variable} to {{variable}} for Logseq template syntax
  return content.replace(/\{([^{}]+)\}/g, '{{$1}}');
}
