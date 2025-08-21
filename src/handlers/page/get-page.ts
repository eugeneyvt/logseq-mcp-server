import type { LogseqClient } from '../../logseq-client.js';
import type { LogseqBlock } from '../../schemas/base-types.js';
import { PageNameSchema, ErrorCode } from '../../schemas/logseq.js';
import {
  normalizeJournalPageName,
  findJournalPage,
  looksLikeDate,
} from '../../utils/date-formats.js';
import { logger } from '../../utils/logger.js';
import { pageCache } from '../../utils/cache.js';
import { createResponse, createErrorResponse, type ToolResult } from '../common.js';

export async function handleGetPage(client: LogseqClient, args: unknown): Promise<ToolResult> {
  try {
    const originalPageName = PageNameSchema.parse((args as { name?: unknown })?.name);
    logger.debug({ pageName: originalPageName }, 'Getting page');

    // Try original name first
    let page = await client.getPage(originalPageName);
    let actualPageName = originalPageName;

    // If not found and looks like a date, provide helpful error with correct format
    if (!page && looksLikeDate(originalPageName)) {
      logger.debug({ pageName: originalPageName }, 'Checking for journal date format variations');

      const dateVariations = normalizeJournalPageName(originalPageName);
      const foundPageName = await findJournalPage(dateVariations, async (name: string) => {
        const testPage = await client.getPage(name);
        return !!testPage;
      });

      if (foundPageName) {
        page = await client.getPage(foundPageName);
        actualPageName = foundPageName;
        logger.info(
          {
            originalName: originalPageName,
            foundName: foundPageName,
          },
          'Found journal page with date format conversion'
        );
      }
    }

    if (!page) {
      const hint = looksLikeDate(originalPageName)
        ? 'Date format not recognized. Logseq journal pages typically use format "MMM do, yyyy" (e.g., "Aug 20th, 2025"). Use ensure_page to create a new page.'
        : 'Use ensure_page to create the page first';

      const response = createErrorResponse(
        ErrorCode.NOT_FOUND,
        `Page "${originalPageName}" not found`,
        hint
      );
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    }

    // Get page blocks/content
    let blocks = null;
    try {
      // Try using page ID first, then fall back to name
      blocks = await client.getPageBlocksTree(page.id);
      logger.debug(
        { pageId: page.id, blockCount: blocks?.length || 0 },
        'Retrieved blocks by page ID'
      );
    } catch (error) {
      logger.warn({ pageId: page.id, error }, 'Failed to get page blocks by ID, trying by name');
      try {
        blocks = await client.getPageBlocksTree(actualPageName);
        logger.debug(
          { pageName: actualPageName, blockCount: blocks?.length || 0 },
          'Retrieved blocks by page name'
        );
      } catch (nameError) {
        logger.warn(
          { pageName: actualPageName, error: nameError },
          'Failed to get page blocks by name'
        );
        // Continue without blocks if both attempts fail
      }
    }

    pageCache.set(actualPageName, page);
    logger.info(
      { pageName: actualPageName, blockCount: blocks?.length || 0 },
      'Page retrieved successfully'
    );

    // Gather relationship data (backlinks, outgoing links, related pages)
    const relationshipData = await gatherPageRelationships(client, actualPageName, blocks || []);

    const pageData = {
      ...page,
      blocks: blocks || [],
      ...relationshipData,
    };

    // If we converted the date format, include a warning
    const response =
      actualPageName !== originalPageName
        ? {
            ok: true,
            data: pageData,
            warning: {
              message: `Date format converted from "${originalPageName}" to "${actualPageName}"`,
              hint: `For future requests, please use the Logseq journal format: "${actualPageName}". This follows the pattern "MMM do, yyyy" (e.g., "Aug 20th, 2025").`,
            },
          }
        : createResponse(pageData);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error({ error }, 'Failed to get page');
    const response = createErrorResponse(ErrorCode.INTERNAL, `Failed to get page: ${error}`);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }
}

/**
 * Gather comprehensive relationship data for a page
 */
async function gatherPageRelationships(
  client: LogseqClient,
  pageName: string,
  blocks: readonly LogseqBlock[]
): Promise<{
  backlinks: Array<{ page: string; referenceCount: number }>;
  outgoingLinks: string[];
  relatedPages: Array<{ page: string; score: number; reason: string }>;
  referenceCounts: { incoming: number; outgoing: number; total: number };
}> {
  logger.debug({ pageName }, 'Gathering page relationships');

  try {
    // Get outgoing links from this page's content
    const outgoingLinks = extractOutgoingLinks(blocks);

    // Find backlinks (pages that reference this page)
    const backlinks = await findBacklinks(client, pageName);

    // Generate related pages based on common links and properties
    const relatedPages = await findRelatedPages(client, pageName, outgoingLinks, backlinks);

    const referenceCounts = {
      incoming: backlinks.reduce((sum, bl) => sum + bl.referenceCount, 0),
      outgoing: outgoingLinks.length,
      total: backlinks.reduce((sum, bl) => sum + bl.referenceCount, 0) + outgoingLinks.length,
    };

    return {
      backlinks: backlinks.slice(0, 10), // Limit for performance
      outgoingLinks: outgoingLinks.slice(0, 20), // Limit for performance
      relatedPages: relatedPages.slice(0, 10), // Limit for performance
      referenceCounts,
    };
  } catch (error) {
    logger.warn({ error }, 'Failed to gather relationship data');
    return {
      backlinks: [],
      outgoingLinks: [],
      relatedPages: [],
      referenceCounts: { incoming: 0, outgoing: 0, total: 0 },
    };
  }
}

/**
 * Extract outgoing links from page blocks
 */
function extractOutgoingLinks(blocks: readonly LogseqBlock[]): string[] {
  const links = new Set<string>();

  const processBlock = (block: LogseqBlock) => {
    if (block.content) {
      // Match Logseq page links: [[PageName]]
      const linkMatches = block.content.match(/\[\[([^\]]+)\]\]/g);
      if (linkMatches) {
        linkMatches.forEach((match) => {
          const pageName = match.slice(2, -2); // Remove [[ and ]]
          if (pageName.trim()) {
            links.add(pageName.trim());
          }
        });
      }
    }

    // Process children recursively
    if (block.children) {
      block.children.forEach(processBlock);
    }
  };

  blocks.forEach(processBlock);
  return Array.from(links);
}

/**
 * Find pages that link back to the target page
 */
async function findBacklinks(
  client: LogseqClient,
  targetPageName: string
): Promise<Array<{ page: string; referenceCount: number }>> {
  try {
    const allPages = await client.getAllPages();
    const backlinks: Array<{ page: string; referenceCount: number }> = [];

    // Check first 50 pages for performance (can be increased as needed)
    const pagesToCheck = allPages.slice(0, 50);

    for (const page of pagesToCheck) {
      if (page.name.toLowerCase() === targetPageName.toLowerCase()) {
        continue; // Skip self-references
      }

      try {
        const pageBlocks = await client.getPageBlocksTree(page.name);
        if (pageBlocks && pageBlocks.length > 0) {
          const referenceCount = countPageReferences(pageBlocks, targetPageName);
          if (referenceCount > 0) {
            backlinks.push({
              page: page.name,
              referenceCount,
            });
          }
        }
      } catch (error) {
        // Skip pages with access errors
        continue;
      }
    }

    // Sort by reference count (most references first)
    return backlinks.sort((a, b) => b.referenceCount - a.referenceCount);
  } catch (error) {
    logger.warn({ error }, 'Failed to find backlinks');
    return [];
  }
}

/**
 * Count references to a target page in blocks
 */
function countPageReferences(blocks: readonly LogseqBlock[], targetPageName: string): number {
  let count = 0;
  const target = targetPageName.toLowerCase();

  const processBlock = (block: LogseqBlock) => {
    if (block.content) {
      const content = block.content.toLowerCase();
      // Count [[PageName]] references
      const linkMatches = content.match(/\[\[([^\]]+)\]\]/g);
      if (linkMatches) {
        linkMatches.forEach((match) => {
          const pageName = match.slice(2, -2).toLowerCase();
          if (pageName === target) {
            count++;
          }
        });
      }
    }

    // Process children recursively
    if (block.children) {
      block.children.forEach(processBlock);
    }
  };

  blocks.forEach(processBlock);
  return count;
}

/**
 * Find related pages based on link overlap and shared properties
 */
async function findRelatedPages(
  client: LogseqClient,
  targetPageName: string,
  outgoingLinks: string[],
  backlinks: Array<{ page: string; referenceCount: number }>
): Promise<Array<{ page: string; score: number; reason: string }>> {
  try {
    const relatedPages = new Map<string, { score: number; reasons: string[] }>();

    // Get pages that share outgoing links (similar topics)
    for (const linkedPage of outgoingLinks.slice(0, 10)) {
      // Limit for performance
      try {
        const linkedPageData = await client.getPage(linkedPage);
        if (linkedPageData) {
          const linkedPageBlocks = await client.getPageBlocksTree(linkedPage);
          if (linkedPageBlocks) {
            const sharedLinks = extractOutgoingLinks(linkedPageBlocks);

            // Find pages that both target and linkedPage reference
            for (const sharedLink of sharedLinks.slice(0, 5)) {
              if (sharedLink !== targetPageName && outgoingLinks.includes(sharedLink)) {
                const existing = relatedPages.get(sharedLink) || { score: 0, reasons: [] };
                existing.score += 2;
                existing.reasons.push(`shared-reference-${linkedPage}`);
                relatedPages.set(sharedLink, existing);
              }
            }
          }
        }
      } catch (error) {
        // Skip if we can't access the linked page
        continue;
      }
    }

    // Add backlink sources as related (they find this page relevant)
    for (const backlink of backlinks.slice(0, 10)) {
      const existing = relatedPages.get(backlink.page) || { score: 0, reasons: [] };
      existing.score += backlink.referenceCount;
      existing.reasons.push('backlink-source');
      relatedPages.set(backlink.page, existing);
    }

    // Convert to array and format
    return Array.from(relatedPages.entries())
      .map(([page, data]) => ({
        page,
        score: data.score,
        reason: data.reasons.join(', '),
      }))
      .sort((a, b) => b.score - a.score);
  } catch (error) {
    logger.warn({ error }, 'Failed to find related pages');
    return [];
  }
}
