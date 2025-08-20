import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { LogseqClient } from '../logseq-client.js';
import {
  AppendBlocksParamsSchema,
  UpdateBlockParamsSchemaV2,
  ErrorCode,
  type AppendBlocksParams,
  type UpdateBlockParamsV2
} from '../schemas/logseq.js';
import { validateAndNormalizeBlockContent } from '../utils/formatting.js';
import { logger } from '../utils/logger.js';
import { blockCache } from '../utils/cache.js';
import { createResponse, createErrorResponse, type ToolResult } from './common.js';
import { parseMarkdownToBlocks } from '../utils/markdown-parser.js';
import { createBlocksFromParsed } from '../utils/block-creator.js';

/**
 * Create block-related tools and handlers
 */
export function createBlockHandlers(client: LogseqClient): {
  tools: Tool[];
  handlers: Record<string, (args: unknown) => Promise<ToolResult>>;
} {
  const tools: Tool[] = [
    {
      name: 'append_blocks',
      description: 'Append individual blocks to a page with precise positioning control. Use this for adding specific blocks with custom positioning. For bulk content creation, prefer set_page_content with markdown.',
      inputSchema: {
        type: 'object',
        properties: {
          page: { type: 'string', description: 'Page name' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                content: { type: 'string', description: 'Block content in markdown format. Can include links [[page]], tags #tag, etc.' },
                parentUuid: { type: 'string', description: 'Parent block UUID to create nested structure (optional)' },
                position: { type: 'string', enum: ['first', 'last', 'before', 'after'], description: 'Position relative to parent or reference block' },
                refUuid: { type: 'string', description: 'Reference block UUID for positioning when using before/after' },
              },
              required: ['content'],
            },
            description: 'Array of blocks to append. Each block can have content, positioning, and hierarchy',
          },
          control: {
            type: 'object',
            properties: {
              dryRun: { type: 'boolean', default: false },
              strict: { type: 'boolean', default: true },
              idempotencyKey: { type: 'string' },
              maxOps: { type: 'number', default: 100 },
              autofixFormat: { type: 'boolean', default: true },
            },
          },
        },
        required: ['page', 'items'],
      },
    },
    {
      name: 'update_block',
      description: 'Update block content by UUID',
      inputSchema: {
        type: 'object',
        properties: {
          uuid: { type: 'string', description: 'Block UUID' },
          content: { type: 'string', description: 'New block content' },
          control: {
            type: 'object',
            properties: {
              dryRun: { type: 'boolean', default: false },
              strict: { type: 'boolean', default: true },
              idempotencyKey: { type: 'string' },
              maxOps: { type: 'number', default: 100 },
              autofixFormat: { type: 'boolean', default: true },
            },
          },
        },
        required: ['uuid', 'content'],
      },
    },
    {
      name: 'move_block',
      description: 'Move a block to a new location',
      inputSchema: {
        type: 'object',
        properties: {
          uuid: { type: 'string', description: 'Block UUID to move' },
          newParentUuid: { type: 'string', description: 'New parent block UUID' },
          position: { type: 'string', enum: ['first', 'last', 'before', 'after'] },
          refUuid: { type: 'string', description: 'Reference block UUID for positioning' },
          control: {
            type: 'object',
            properties: {
              dryRun: { type: 'boolean', default: false },
              strict: { type: 'boolean', default: true },
              idempotencyKey: { type: 'string' },
              maxOps: { type: 'number', default: 100 },
              autofixFormat: { type: 'boolean', default: true },
            },
          },
        },
        required: ['uuid', 'newParentUuid'],
      },
    },
  ];

  const handlers = {
    append_blocks: async (args: unknown): Promise<ToolResult> => {
      try {
        const params = AppendBlocksParamsSchema.parse(args) as AppendBlocksParams;
        const { control } = params;

        logger.debug({ page: params.page, itemCount: params.items.length }, 'Appending blocks');

        if (control?.dryRun) {
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
        const validationResults = params.items.map(item => {
          const validation = validateAndNormalizeBlockContent(item.content);
          return { ...item, validation };
        });

        if (control?.strict !== false) {
          const invalidItems = validationResults.filter(item => !item.validation.isValid);
          if (invalidItems.length > 0) {
            const errors = invalidItems.map(item => 
              `Block "${item.content.substring(0, 50)}...": ${item.validation.errors.join(', ')}`
            );
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
        }

        // Combine all content into a single markdown string for parsing
        const combinedContent = validationResults
          .map(item => control?.autofixFormat ? (item.validation.normalized || item.content) : item.content)
          .join('\n\n');

        // Use the enhanced markdown parser instead of regex patterns
        const parsedBlocks = parseMarkdownToBlocks(combinedContent);
        
        // Create blocks using the utility function for consistency with set_page_content
        const createdBlocks = await createBlocksFromParsed(client, params.page, parsedBlocks);

        // Map results to show what was actually created by the enhanced parser
        const results = createdBlocks.map((result) => ({
          success: result.success,
          block: result.block,
          type: result.type || 'unknown',
          level: result.level,
          error: result.error,
          // Include the parsed content that was actually used
          parsedContent: result.content || 'unknown'
        }));

        logger.info({ 
          page: params.page, 
          successCount: results.filter(r => r.success).length,
          totalBlocksCreated: createdBlocks.length,
          originalItemsCount: params.items.length 
        }, 'Blocks appended using enhanced markdown parser');

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(createResponse({ 
                results,
                summary: {
                  originalItems: params.items.length,
                  parsedBlocks: parsedBlocks.length,
                  createdBlocks: createdBlocks.length,
                  successfulBlocks: results.filter(r => r.success).length
                }
              }), null, 2),
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
    },

    update_block: async (args: unknown): Promise<ToolResult> => {
      try {
        const params = UpdateBlockParamsSchemaV2.parse(args) as UpdateBlockParamsV2;
        const { control } = params;

        logger.debug({ uuid: params.uuid }, 'Updating block');

        const contentValidation = validateAndNormalizeBlockContent(params.content);
        if (!contentValidation.isValid && control?.strict !== false) {
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

        if (control?.dryRun) {
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

        const normalizedContent = control?.autofixFormat ? (contentValidation.normalized || params.content) : params.content;
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
    },

    move_block: async (): Promise<ToolResult> => {
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
    },
  };

  return { tools, handlers };
}