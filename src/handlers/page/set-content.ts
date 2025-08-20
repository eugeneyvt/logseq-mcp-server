import type { LogseqClient } from '../../logseq-client.js';
import { SetPageContentParamsSchema, ErrorCode, type SetPageContentParams } from '../../schemas/logseq.js';
import { validatePageName, validateAndNormalizeBlockContent } from '../../utils/formatting.js';
import { logger } from '../../utils/logger.js';
import { pageCache } from '../../utils/cache.js';
import { createResponse, createErrorResponse, type ToolResult } from '../common.js';
import { parseMarkdownToBlocks } from '../../utils/markdown-parser.js';
import { createBlocksFromParsed } from '../../utils/block-creator.js';

export async function handleSetPageContent(client: LogseqClient, args: unknown): Promise<ToolResult> {
  try {
    const params = SetPageContentParamsSchema.parse(args) as SetPageContentParams;
    const { control } = params;

    logger.debug({ pageName: params.name }, 'Setting page content');

    const nameValidation = validatePageName(params.name);
    if (!nameValidation.isValid && control?.strict !== false) {
      const response = createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        `Invalid page name: ${nameValidation.errors.join(', ')}`
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

    const contentValidation = validateAndNormalizeBlockContent(params.content);
    if (!contentValidation.isValid && control?.strict !== false) {
      const response = createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        `Invalid content format: ${contentValidation.errors.join(', ')}`
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

    if (control?.dryRun) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              createResponse({
                action: 'would_set_content',
                page: params.name,
                contentLength: params.content.length,
              }),
              null,
              2
            ),
          },
        ],
      };
    }

    const normalizedContent = control?.autofixFormat ? (contentValidation.normalized || params.content) : params.content;
    
    // Get the page to ensure it exists
    const page = await client.getPage(params.name);
    if (!page) {
      const response = createErrorResponse(
        ErrorCode.NOT_FOUND,
        `Page "${params.name}" not found. Use ensure_page to create it first.`
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

    // Get existing blocks to clear them
    const existingBlocks = await client.getPageBlocksTree(params.name);
    
    // Clear existing content by deleting all blocks
    if (existingBlocks && existingBlocks.length > 0) {
      for (const block of existingBlocks) {
        try {
          await client.callApi('logseq.Editor.removeBlock', [block.uuid || block.id]);
        } catch (error) {
          logger.warn({ blockId: block.id, error }, 'Failed to remove existing block');
        }
      }
    }

    // Parse markdown and create blocks using utility functions
    const parsedBlocks = parseMarkdownToBlocks(normalizedContent);
    const createdBlocks = await createBlocksFromParsed(client, params.name, parsedBlocks);

    const result = {
      action: 'content_set',
      page: params.name,
      blocksCleared: existingBlocks?.length || 0,
      blocksCreated: createdBlocks.filter(b => b.success).length,
      blocksFailed: createdBlocks.filter(b => !b.success).length,
      contentLength: normalizedContent.length,
      blockStructure: createdBlocks.map(b => ({ 
        type: b.type, 
        success: b.success,
        ...(b.level && { level: b.level })
      }))
    };

    pageCache.delete(params.name);
    logger.info({ pageName: params.name }, 'Page content set successfully');

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(createResponse(result), null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error({ error }, 'Failed to set page content');
    const response = createErrorResponse(ErrorCode.INTERNAL, `Failed to set page content: ${error}`);
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