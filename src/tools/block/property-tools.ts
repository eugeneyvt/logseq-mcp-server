import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LogseqClient } from '../../logseq-client.js';
import { SetBlockPropertyParamsSchema, RemoveBlockPropertyParamsSchema } from '../../schemas/logseq.js';
import { SetBlockPropertyToolArgsSchema, RemoveBlockPropertyToolArgsSchema } from '../../types/tool-arguments.js';

export function createBlockPropertyTools(client: LogseqClient) {
  const tools: Tool[] = [
    {
      name: 'logseq_set_block_property',
      description: 'Set or update a property on a block',
      inputSchema: {
        type: 'object',
        properties: {
          blockId: {
            type: 'string',
            description: 'The UUID of the block',
          },
          property: {
            type: 'string',
            description: 'The property key',
          },
          value: {
            description: 'The property value',
          },
        },
        required: ['blockId', 'property', 'value'],
      },
    },
    {
      name: 'logseq_remove_block_property',
      description: 'Remove a property from a block',
      inputSchema: {
        type: 'object',
        properties: {
          blockId: {
            type: 'string',
            description: 'The UUID of the block',
          },
          property: {
            type: 'string',
            description: 'The property key to remove',
          },
        },
        required: ['blockId', 'property'],
      },
    },
  ];

  const handlers = {
    logseq_set_block_property: async (args: unknown) => {
      const parsed = SetBlockPropertyToolArgsSchema.parse(args);
      const params = SetBlockPropertyParamsSchema.parse(parsed);

      // Check if block exists
      const block = await client.getBlock(params.blockId);
      if (!block) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Block with ID "${params.blockId}" not found.`,
            },
          ],
        };
      }

      await client.upsertBlockProperty(params.blockId, params.property, params.value);

      // Get updated properties
      const updatedProperties = await client.getBlockProperties(params.blockId);

      return {
        content: [
          {
            type: 'text' as const,
            text:
              `Successfully set property "${params.property}" = ${JSON.stringify(params.value)} on block ${params.blockId}\n` +
              `Updated properties: ${JSON.stringify(updatedProperties, null, 2)}`,
          },
        ],
      };
    },

    logseq_remove_block_property: async (args: unknown) => {
      const parsed = RemoveBlockPropertyToolArgsSchema.parse(args);
      const params = RemoveBlockPropertyParamsSchema.parse(parsed);

      // Check if block exists
      const block = await client.getBlock(params.blockId);
      if (!block) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Block with ID "${params.blockId}" not found.`,
            },
          ],
        };
      }

      await client.removeBlockProperty(params.blockId, params.property);

      // Get updated properties
      const updatedProperties = await client.getBlockProperties(params.blockId);

      return {
        content: [
          {
            type: 'text' as const,
            text:
              `Successfully removed property "${params.property}" from block ${params.blockId}\n` +
              `Remaining properties: ${JSON.stringify(updatedProperties, null, 2)}`,
          },
        ],
      };
    },
  };

  return { tools, handlers };
}