import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LogseqClient } from '../../logseq-client.js';
import { BlockIdSchema } from '../../schemas/logseq.js';
import { GetBlockToolArgsSchema } from '../../types/tool-arguments.js';

export function createBlockRetrievalTools(client: LogseqClient) {
  const tools: Tool[] = [
    {
      name: 'logseq_get_block',
      description: 'Get a specific block by its UUID',
      inputSchema: {
        type: 'object',
        properties: {
          blockId: {
            type: 'string',
            description: 'The UUID of the block to retrieve',
          },
        },
        required: ['blockId'],
      },
    },
    {
      name: 'logseq_get_block_properties',
      description: 'Get all properties of a specific block',
      inputSchema: {
        type: 'object',
        properties: {
          blockId: {
            type: 'string',
            description: 'The UUID of the block',
          },
        },
        required: ['blockId'],
      },
    },
  ];

  const handlers = {
    logseq_get_block: async (args: unknown) => {
      const parsed = GetBlockToolArgsSchema.parse(args);
      const blockId = BlockIdSchema.parse(parsed.blockId);
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

      return {
        content: [
          {
            type: 'text' as const,
            text:
              `Block ID: ${block.id}\n` +
              `Content: ${block.content}\n` +
              `Page: ${block.page?.name || 'Unknown'}\n` +
              `Properties: ${JSON.stringify(block.properties || {}, null, 2)}\n` +
              `Children: ${block.children?.length || 0} child blocks`,
          },
        ],
      };
    },

    logseq_get_block_properties: async (args: unknown) => {
      const parsed = GetBlockToolArgsSchema.parse(args);
      const blockId = BlockIdSchema.parse(parsed.blockId);
      const properties = await client.getBlockProperties(blockId);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Properties for block ${blockId}:\n${JSON.stringify(properties, null, 2)}`,
          },
        ],
      };
    },
  };

  return { tools, handlers };
}