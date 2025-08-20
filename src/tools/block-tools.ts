import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LogseqClient } from '../logseq-client.js';
import {
  BlockIdSchema,
  CreateBlockParamsSchema,
  UpdateBlockParamsSchema,
  SetBlockPropertyParamsSchema,
  RemoveBlockPropertyParamsSchema,
} from '../schemas/logseq.js';

export function createBlockTools(client: LogseqClient) {
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
    {
      name: 'logseq_create_block',
      description: 'Create a new block under a page or another block',
      inputSchema: {
        type: 'object',
        properties: {
          parent: {
            type: 'string',
            description: 'The parent page name or block UUID',
          },
          content: {
            type: 'string',
            description: 'The content of the new block',
          },
          properties: {
            type: 'object',
            description: 'Optional properties for the block',
          },
          sibling: {
            type: 'boolean',
            description: 'Whether to insert as a sibling instead of child',
          },
        },
        required: ['parent', 'content'],
      },
    },
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
          key: {
            type: 'string',
            description: 'The property key',
          },
          value: {
            description: 'The property value',
          },
        },
        required: ['blockId', 'key', 'value'],
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
          key: {
            type: 'string',
            description: 'The property key to remove',
          },
        },
        required: ['blockId', 'key'],
      },
    },
  ];

  const handlers = {
    logseq_get_block: async (args: any) => {
      const blockId = BlockIdSchema.parse(args.blockId);
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

    logseq_get_block_properties: async (args: any) => {
      const blockId = BlockIdSchema.parse(args.blockId);
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

    logseq_create_block: async (args: any) => {
      const params = CreateBlockParamsSchema.parse(args);

      const block = await client.insertBlock(params.parent, params.content, {
        properties: params.properties,
        sibling: params.sibling,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text:
              `Successfully created block with ID: ${block.id}\n` +
              `Content: ${block.content}\n` +
              `Parent: ${params.parent}`,
          },
        ],
      };
    },

    logseq_update_block: async (args: any) => {
      const params = UpdateBlockParamsSchema.parse(args);

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

    logseq_remove_block: async (args: any) => {
      const blockId = BlockIdSchema.parse(args.blockId);

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

    logseq_set_block_property: async (args: any) => {
      const params = SetBlockPropertyParamsSchema.parse(args);

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

      await client.upsertBlockProperty(params.blockId, params.key, params.value);

      // Get updated properties
      const updatedProperties = await client.getBlockProperties(params.blockId);

      return {
        content: [
          {
            type: 'text' as const,
            text:
              `Successfully set property "${params.key}" = ${JSON.stringify(params.value)} on block ${params.blockId}\n` +
              `Updated properties: ${JSON.stringify(updatedProperties, null, 2)}`,
          },
        ],
      };
    },

    logseq_remove_block_property: async (args: any) => {
      const params = RemoveBlockPropertyParamsSchema.parse(args);

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

      await client.removeBlockProperty(params.blockId, params.key);

      // Get updated properties
      const updatedProperties = await client.getBlockProperties(params.blockId);

      return {
        content: [
          {
            type: 'text' as const,
            text:
              `Successfully removed property "${params.key}" from block ${params.blockId}\n` +
              `Remaining properties: ${JSON.stringify(updatedProperties, null, 2)}`,
          },
        ],
      };
    },
  };

  return { tools, handlers };
}
