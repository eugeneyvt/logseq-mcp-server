import type { LogseqBlock } from '../../schemas/base-types.js';

/**
 * Extract template placeholders from blocks (e.g., {{variable}}, <%variable%>)
 */
export function extractTemplatePlaceholders(blocks: readonly LogseqBlock[]): string[] {
  const placeholders = new Set<string>();

  const extractFromContent = (content: string) => {
    // Match Logseq template syntax: {{variable}} or <%variable%>
    const matches = content.match(/(\{\{[^}]+\}\}|<%[^%]+%>)/g);
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
 * Check if a block (and its children) contains a reference to a specific page
 */
export function checkBlockForPageReference(block: LogseqBlock, targetPageName: string): boolean {
  if (block.content) {
    const content = block.content;
    const target = targetPageName;

    // Check for various Logseq page link formats
    const referencePatterns = [
      `[[${target}]]`, // Standard page link
      `[[${target.toLowerCase()}]]`, // Lowercase version
      `[${target}]`, // Alternative link format
      `#${target}`, // Tag format
      `#[[${target}]]`, // Tagged page link
    ];

    // Also check for partial matches in hierarchical pages like KB/Dev/Generic
    const pathParts = target.split('/');
    if (pathParts.length > 1) {
      // Check if any part of the path matches
      referencePatterns.push(...pathParts.map((part) => `[[${part}]]`));
      referencePatterns.push(...pathParts.map((part) => `#${part}`));
    }

    // Check all patterns (case-insensitive)
    const contentLower = content.toLowerCase();
    const targetLower = target.toLowerCase();

    for (const pattern of referencePatterns) {
      if (contentLower.includes(pattern.toLowerCase())) {
        return true;
      }
    }

    // Also check for exact text mentions (more permissive)
    if (contentLower.includes(targetLower)) {
      return true;
    }
  }

  // Recursively check children
  if (block.children) {
    return block.children.some((child) => checkBlockForPageReference(child, targetPageName));
  }

  return false;
}

/**
 * Find all references to a page in blocks and return detailed reference information
 */
export function findPageReferences(
  blocks: readonly LogseqBlock[],
  targetPageName: string,
  _sourcePage: string
): Array<{ blockId: string | number; content: string; referenceType: string }> {
  const references: Array<{ blockId: string | number; content: string; referenceType: string }> =
    [];

  const processBlock = (block: LogseqBlock) => {
    if (block.content) {
      const content = block.content;
      const target = targetPageName.toLowerCase();
      const contentLower = content.toLowerCase();

      // Check for different types of references
      if (contentLower.includes(`[[${target}]]`)) {
        references.push({
          blockId: block.uuid || String(block.id),
          content: content.substring(0, 200), // Truncate for readability
          referenceType: 'page-link',
        });
      } else if (contentLower.includes(target)) {
        references.push({
          blockId: block.uuid || String(block.id),
          content: content.substring(0, 200),
          referenceType: 'mention',
        });
      }
    }

    // Process children
    if (block.children) {
      block.children.forEach(processBlock);
    }
  };

  blocks.forEach(processBlock);
  return references;
}
