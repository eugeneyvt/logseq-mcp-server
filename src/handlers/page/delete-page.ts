import type { LogseqClient } from '../../logseq-client.js';
import { PageNameSchema } from '../../schemas/logseq.js';
import { logger } from '../../utils/logger.js';
import { pageCache } from '../../utils/cache.js';
import { createResponse, createErrorResponse, type ToolResult } from '../common.js';
import { ErrorCode } from '../../schemas/logseq.js';

export async function handleDeletePage(client: LogseqClient, args: unknown): Promise<ToolResult> {
  try {
    const params = args as {
      name: string;
      confirmDestroy?: boolean;
      control?: {
        dryRun?: boolean;
        backupBefore?: boolean;
      };
    };
    const pageName = PageNameSchema.parse(params.name);

    // Safety check: require explicit confirmation for destructive operations
    if (!params.confirmDestroy && !params.control?.dryRun) {
      const response = createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Destructive operation requires explicit confirmation',
        'Set confirmDestroy: true to proceed with page deletion. Use control.dryRun: true to preview the operation first.'
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

    if (params.control?.dryRun) {
      // Get page info for dry run preview
      let pageInfo;
      try {
        const page = await client.getPage(pageName);
        const blocks = page ? await client.getPageBlocksTree(pageName) : null;
        pageInfo = {
          exists: !!page,
          blockCount: blocks ? blocks.length : 0,
          hasContent: !!(blocks && blocks.length > 0),
        };
      } catch (error) {
        pageInfo = { exists: false, blockCount: 0, hasContent: false };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              createResponse({
                dryRun: true,
                action: 'would_delete_page',
                pageName,
                pageInfo,
                warning: 'This operation will permanently delete the page and all its content',
                safetyNote: 'Set confirmDestroy: true to proceed with actual deletion',
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
