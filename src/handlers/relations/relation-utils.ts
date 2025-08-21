import type { LogseqClient } from '../../logseq-client.js';
import type { LogseqBlock } from '../../schemas/base-types.js';

/**
 * Build link content with optional context
 */
export function buildLinkContent(targetPage: string, linkText?: string, context?: string): string {
  let content = `[[${targetPage}]]`;

  if (linkText) {
    content = `${linkText} [[${targetPage}]]`;
  }

  if (context) {
    content += ` - ${context}`;
  }

  return content;
}

/**
 * Build backlink content
 */
export function buildBacklinkContent(sourcePage: string, linkText?: string): string {
  const relationText = linkText ? `Referenced by` : 'Related to';
  return `${relationText}: [[${sourcePage}]]`;
}

/**
 * Remove link references from blocks
 */
export async function removeLinkReferences(
  client: LogseqClient,
  blocks: readonly LogseqBlock[],
  targetPage: string
): Promise<number> {
  let removedCount = 0;
  const targetLower = targetPage.toLowerCase();

  const processBlock = async (block: LogseqBlock) => {
    if (block.content && block.uuid) {
      const content = block.content;
      const contentLower = content.toLowerCase();

      // Check if this block contains a reference to the target page
      if (contentLower.includes(`[[${targetLower}]]`)) {
        try {
          // Remove the specific link references
          const updatedContent = content.replace(
            new RegExp(`\\[\\[${targetPage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\]`, 'gi'),
            ''
          );

          // Clean up any extra whitespace or formatting
          const cleanedContent = updatedContent.replace(/\s+/g, ' ').trim();

          // If the block still has meaningful content, update it; otherwise delete it
          if (cleanedContent && cleanedContent !== '-') {
            await client.callApi('logseq.Editor.updateBlock', [block.uuid, cleanedContent]);
          } else {
            await client.callApi('logseq.Editor.removeBlock', [block.uuid]);
          }

          removedCount++;
        } catch (error) {
          // Skip blocks that can't be updated
        }
      }
    }

    // Process children recursively
    if (block.children) {
      for (const child of block.children) {
        await processBlock(child);
      }
    }
  };

  for (const block of blocks) {
    await processBlock(block);
  }

  return removedCount;
}

/**
 * Extract outgoing links from blocks
 */
export function extractOutgoingLinks(blocks: readonly LogseqBlock[]): string[] {
  const links = new Set<string>();

  const processBlock = (block: LogseqBlock) => {
    if (block.content) {
      // Enhanced pattern matching for various link formats
      const patterns = [
        /\[\[([^\]]+)\]\]/g, // [[PageName]]
        /#\[\[([^\]]+)\]\]/g, // #[[PageName]]
        /#([A-Za-z0-9/\-_]+)/g, // #PageName or #KB/Dev/Generic
      ];

      patterns.forEach((pattern) => {
        const matches = block.content!.match(pattern);
        if (matches) {
          matches.forEach((match) => {
            let pageName = '';
            if (match.startsWith('[[') && match.endsWith(']]')) {
              pageName = match.slice(2, -2).trim();
            } else if (match.startsWith('#[[') && match.endsWith(']]')) {
              pageName = match.slice(3, -2).trim();
            } else if (match.startsWith('#')) {
              pageName = match.slice(1).trim();
            }

            if (pageName && pageName.length > 0) {
              links.add(pageName);
            }
          });
        }
      });
    }

    if (block.children) {
      block.children.forEach(processBlock);
    }
  };

  blocks.forEach(processBlock);
  return Array.from(links);
}

/**
 * Find all pages that link to the target page
 */
export async function findBacklinksToPage(
  client: LogseqClient,
  targetPageName: string,
  allPages: readonly unknown[]
): Promise<string[]> {
  const backlinks: string[] = [];

  // Check a reasonable number of pages to avoid performance issues
  const pagesToCheck = allPages.slice(0, 50);

  for (const page of pagesToCheck) {
    const pageObj = page as { name: string; id: unknown };
    if (pageObj.name === targetPageName) {
      continue;
    } // Skip self

    try {
      const blocks = await client.getPageBlocksTree(pageObj.name);
      if (blocks && blocks.length > 0) {
        const outgoingLinks = extractOutgoingLinks(blocks);
        if (outgoingLinks.some((link) => link.toLowerCase() === targetPageName.toLowerCase())) {
          backlinks.push(pageObj.name);
        }
      }
    } catch (error) {
      // Skip pages we can't access
      continue;
    }
  }

  return backlinks;
}

/**
 * Identify clusters of related pages
 */
export function identifyClusters(
  connections: Array<{ page: string; connectionType: string; strength: number }>
): Array<{ name: string; pages: string[]; centralityScore: number }> {
  // Simple clustering: group pages by connection patterns
  // For now, create clusters based on pages with multiple connections
  const pageConnectionCounts = new Map<string, number>();
  connections.forEach((conn) => {
    pageConnectionCounts.set(conn.page, (pageConnectionCounts.get(conn.page) || 0) + conn.strength);
  });

  // Pages with high connection counts become cluster centers
  const clusterCenters = Array.from(pageConnectionCounts.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3) // Top 3 cluster centers
    .map(([page]) => page);

  return clusterCenters.map((center) => ({
    name: `${center}-cluster`,
    pages: [center],
    centralityScore: pageConnectionCounts.get(center) || 0,
  }));
}
