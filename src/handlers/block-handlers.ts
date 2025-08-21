import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { LogseqClient } from '../logseq-client.js';
import type { ToolResult } from './common.js';
import { AppendBlocksParamsSchema, UpdateBlockParamsSchemaV2 } from '../schemas/logseq.js';
import { appendBlocks, updateBlock, moveBlock } from './block/block-operations.js';

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
      description:
        'Append individual blocks to a page with precise positioning control. Use this for adding specific blocks with custom positioning. For bulk content creation, prefer set_page_content with markdown.',
      inputSchema: {
        type: 'object',
        properties: {
          page: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                content: { type: 'string' },
                parentUuid: { type: 'string' },
                position: { type: 'string', enum: ['first', 'last', 'before', 'after'] },
                refUuid: { type: 'string' },
              },
              required: ['content'],
            },
          },
          control: {
            type: 'object',
            properties: {
              dryRun: { type: 'boolean' },
              strict: { type: 'boolean' },
              idempotencyKey: { type: 'string' },
              maxOps: { type: 'number' },
              autofixFormat: { type: 'boolean' },
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
          uuid: { type: 'string' },
          content: { type: 'string' },
          control: {
            type: 'object',
            properties: {
              dryRun: { type: 'boolean' },
              strict: { type: 'boolean' },
              idempotencyKey: { type: 'string' },
              maxOps: { type: 'number' },
              autofixFormat: { type: 'boolean' },
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
      const params = AppendBlocksParamsSchema.parse(args);
      return await appendBlocks(client, {
        ...params,
        control: params.control || {
          dryRun: false,
          strict: true,
          maxOps: 100,
          autofixFormat: true,
        },
      });
    },

    update_block: async (args: unknown): Promise<ToolResult> => {
      const params = UpdateBlockParamsSchemaV2.parse(args);
      return await updateBlock(client, {
        ...params,
        control: params.control || {
          dryRun: false,
          strict: true,
          maxOps: 100,
          autofixFormat: true,
        },
      });
    },

    move_block: async (): Promise<ToolResult> => {
      return await moveBlock();
    },
  };

  return { tools, handlers };
}
