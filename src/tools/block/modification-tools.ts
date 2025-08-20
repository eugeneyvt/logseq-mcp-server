import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LogseqClient } from '../../logseq-client.js';
import { BlockIdSchema, UpdateBlockParamsSchema } from '../../schemas/logseq.js';
import { GetBlockToolArgsSchema, UpdateBlockToolArgsSchema } from '../../types/tool-arguments.js';

export function createBlockModificationTools(client: LogseqClient) {
  const tools: Tool[] = [
    {
      name: 'logseq_update_block',
      description: 'Update the content of an existing block',
      inputSchema: {
        type: 'object',
        properties: {
          blockId: {
            type: 'string',
            description: 'The UUID of the block to update',
          },
          content: {
            type: 'string',
            description: 'The new content for the block',
          },
        },
        required: ['blockId', 'content'],
      },
    },
    {
      name: 'logseq_remove_block',
      description: 'Remove a block from the graph (use with caution)',
      inputSchema: {
        type: 'object',
        properties: {
          blockId: {
            type: 'string',
            description: 'The UUID of the block to remove',
          },
        },
        required: ['blockId'],
      },
    },
  ];

  const handlers = {
    logseq_update_block: async (args: unknown) => {
      const parsed = UpdateBlockToolArgsSchema.parse(args);
      const params = UpdateBlockParamsSchema.parse(parsed);

      // Check if block exists
      const existingBlock = await client.getBlock(params.blockId);
      if (!existingBlock) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Block with ID "${params.blockId}" not found.`,
            },
          ],
        };
      }

      const updatedBlock = await client.updateBlock(params.blockId, params.content);

      return {
        content: [
          {
            type: 'text' as const,
            text:
              `Successfully updated block ${params.blockId}\n` +
              `New content: ${updatedBlock.content}`,
          },
        ],
      };
    },

    logseq_remove_block: async (args: unknown) => {
      const parsed = GetBlockToolArgsSchema.parse(args);
      const blockId = BlockIdSchema.parse(parsed.blockId);

      // Check if block exists
      const block = await client.getBlock(blockId);
      if (!block) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Block with ID "${blockId}" not found.`,
            },
          ],
        };
      }

      await client.removeBlock(blockId);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Successfully removed block ${blockId}`,
          },
        ],
      };
    },
  };

  return { tools, handlers };
}