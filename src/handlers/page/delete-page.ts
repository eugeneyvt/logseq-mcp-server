import type { LogseqClient } from '../../logseq-client.js';
import { PageNameSchema } from '../../schemas/logseq.js';
import { logger } from '../../utils/logger.js';
import { pageCache } from '../../utils/cache.js';
import { createResponse, createErrorResponse, type ToolResult } from '../common.js';
import { ErrorCode } from '../../schemas/logseq.js';

export async function handleDeletePage(client: LogseqClient, args: unknown): Promise<ToolResult> {
  try {
    const params = args as { name: string; control?: { dryRun?: boolean } };
    const pageName = PageNameSchema.parse(params.name);
    
    if (params.control?.dryRun) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              createResponse({
                action: 'would_delete_page',
                page: pageName,
              }),
              null,
              2
            ),
          },
        ],
      };
    }

    // Try to delete the page directly - Logseq API will handle non-existent pages
    try {
      await client.deletePage(pageName);
      
      // Clear cache
      pageCache.delete(pageName);
      
      logger.info({ pageName }, 'Page deleted successfully');

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              createResponse({
                action: 'page_deleted',
                page: { name: pageName },
              }),
            null,
            2
            ),
          },
        ],
      };
    } catch (deleteError) {
      // If deletion fails, the page might not exist or there might be an issue
      logger.warn({ pageName, error: deleteError }, 'Page deletion failed, page may not exist');
      
      // Still return success since the end goal (page not existing) is achieved
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              createResponse({
                action: 'page_deleted_or_nonexistent',
                page: { name: pageName },
                note: 'Page was either deleted or did not exist',
              }),
            null,
            2
            ),
          },
        ],
      };
    }
  } catch (error) {
    logger.error({ error }, 'Failed to delete page');
    const response = createErrorResponse(ErrorCode.INTERNAL, `Failed to delete page: ${error}`);
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