import type { LogseqClient } from '../../logseq-client.js';
import { PageNameSchema, ErrorCode } from '../../schemas/logseq.js';
import { normalizeJournalPageName, findJournalPage, looksLikeDate } from '../../utils/date-formats.js';
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
      const foundPageName = await findJournalPage(
        dateVariations,
        async (name: string) => {
          const testPage = await client.getPage(name);
          return !!testPage;
        }
      );

      if (foundPageName) {
        page = await client.getPage(foundPageName);
        actualPageName = foundPageName;
        logger.info({ 
          originalName: originalPageName, 
          foundName: foundPageName 
        }, 'Found journal page with date format conversion');
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
      logger.debug({ pageId: page.id, blockCount: blocks?.length || 0 }, 'Retrieved blocks by page ID');
    } catch (error) {
      logger.warn({ pageId: page.id, error }, 'Failed to get page blocks by ID, trying by name');
      try {
        blocks = await client.getPageBlocksTree(actualPageName);
        logger.debug({ pageName: actualPageName, blockCount: blocks?.length || 0 }, 'Retrieved blocks by page name');
      } catch (nameError) {
        logger.warn({ pageName: actualPageName, error: nameError }, 'Failed to get page blocks by name');
        // Continue without blocks if both attempts fail
      }
    }

    pageCache.set(actualPageName, page);
    logger.info({ pageName: actualPageName, blockCount: blocks?.length || 0 }, 'Page retrieved successfully');

    const pageData = {
      ...page,
      blocks: blocks || []
    };

    // If we converted the date format, include a warning
    const response = actualPageName !== originalPageName 
      ? {
          ok: true,
          data: pageData,
          warning: {
            message: `Date format converted from "${originalPageName}" to "${actualPageName}"`,
            hint: `For future requests, please use the Logseq journal format: "${actualPageName}". This follows the pattern "MMM do, yyyy" (e.g., "Aug 20th, 2025").`
          }
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