import type { LogseqClient } from '../../logseq-client.js';
import { ErrorCode } from '../../schemas/logseq.js';
import { createResponse, createErrorResponse, type ToolResult } from '../common.js';
import { logger } from '../../utils/logger.js';
import { blockCache } from '../../utils/cache.js';
import { parseMarkdownToBlocks } from '../../utils/markdown-parser.js';
import { createBlocksFromParsed } from '../../utils/block-creator.js';
import type {
  AppendBlocksParams,
  UpdateBlockParamsV2,
  BlockCreationResult,
  BlockOperationSummary,
} from './block-types.js';
import {
  validateBlockContent,
  validateMultipleBlocks,
  hasValidationErrors,
  getValidationErrorMessages,
  getNormalizedContent,
} from './block-validation.js';

/**
 * Append blocks to a page with validation and enhanced markdown parsing
 */
export async function appendBlocks(
  client: LogseqClient,
  params: AppendBlocksParams
): Promise<ToolResult> {
  try {
    logger.debug({ page: params.page, itemCount: params.items.length }, 'Appending blocks');

    if (params.control?.dryRun) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              createResponse({
                action: 'would_append_blocks',
                page: params.page,
                itemCount: params.items.length,
              }),
              null,
              2
            ),
          },
        ],
      };
    }

    // Validate block content if strict mode is enabled
    const validationResults = validateMultipleBlocks(params.items);

    if (params.control?.strict !== false && hasValidationErrors(validationResults)) {
      const errors = getValidationErrorMessages(validationResults);
      const response = createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        `Invalid block content: ${errors.join('; ')}`
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

    // Combine all content into a single markdown string for parsing
    const combinedContent = validationResults
      .map((item) =>
        getNormalizedContent(item.content, item.validation, params.control?.autofixFormat)
      )
      .join('\n\n');

    // Use the enhanced markdown parser instead of regex patterns
    const parsedBlocks = parseMarkdownToBlocks(combinedContent);

    // Create blocks using the utility function for consistency with set_page_content
    const createdBlocks: BlockCreationResult[] = await createBlocksFromParsed(
      client,
      params.page,
      parsedBlocks
    );

    // Map results to show what was actually created by the enhanced parser
    const results = createdBlocks.map((result) => ({
      success: result.success,
      block: result.block,
      type: result.type || 'unknown',
      level: result.level,
      error: result.error,
      // Include the parsed content that was actually used
      parsedContent: result.content || 'unknown',
    }));

    const summary: BlockOperationSummary = {
      originalItems: params.items.length,
      parsedBlocks: parsedBlocks.length,
      createdBlocks: createdBlocks.length,
      successfulBlocks: results.filter((r) => r.success).length,
    };

    logger.info(
      {
        page: params.page,
        successCount: summary.successfulBlocks,
        totalBlocksCreated: summary.createdBlocks,
        originalItemsCount: summary.originalItems,
      },
      'Blocks appended using enhanced markdown parser'
    );

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            createResponse({
              results,
              summary,
            }),
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    logger.error({ error }, 'Failed to append blocks');
    const response = createErrorResponse(ErrorCode.INTERNAL, `Failed to append blocks: ${error}`);
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
 * Update block content by UUID
 */
export async function updateBlock(
  client: LogseqClient,
  params: UpdateBlockParamsV2
): Promise<ToolResult> {
  try {
    logger.debug({ uuid: params.uuid }, 'Updating block');

    const contentValidation = validateBlockContent(params.content);
    if (!contentValidation.isValid && params.control?.strict !== false) {
      const response = createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        `Invalid block content: ${contentValidation.errors.join(', ')}`
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
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              createResponse({
                action: 'would_update_block',
                uuid: params.uuid,
                contentLength: params.content.length,
              }),
              null,
              2
            ),
          },
        ],
      };
    }

    const normalizedContent = getNormalizedContent(
      params.content,
      contentValidation,
      params.control?.autofixFormat
    );

    const result = await client.updateBlock(params.uuid, normalizedContent);

    blockCache.delete(params.uuid);
    logger.info({ uuid: params.uuid }, 'Block updated successfully');

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(createResponse(result), null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error({ error }, 'Failed to update block');
    const response = createErrorResponse(ErrorCode.INTERNAL, `Failed to update block: ${error}`);
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
 * Move block to a new location (placeholder implementation)
 */
export async function moveBlock(): Promise<ToolResult> {
  const response = createErrorResponse(
    ErrorCode.INTERNAL,
    'move_block not yet implemented',
    'This method is planned for future implementation'
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
