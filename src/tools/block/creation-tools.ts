import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LogseqClient } from '../../logseq-client.js';
import { CreateBlockParamsSchema } from '../../schemas/logseq.js';
import { CreateBlockToolArgsSchema } from '../../types/tool-arguments.js';

export function createBlockCreationTools(client: LogseqClient) {
  const tools: Tool[] = [
    {
      name: 'logseq_create_block',
      description: 'Create a new block under a page or another block',
      inputSchema: {
        type: 'object',
        properties: {
          page: {
            type: 'string',
            description: 'The parent page name',
          },
          content: {
            type: 'string',
            description: 'The content of the new block',
          },
          properties: {
            type: 'object',
            description: 'Optional properties for the block',
          },
          isPageBlock: {
            type: 'boolean',
            description: 'Whether this is a page block',
            default: false,
          },
        },
        required: ['page', 'content'],
      },
    },
  ];

  const handlers = {
    logseq_create_block: async (args: unknown) => {
      const parsed = CreateBlockToolArgsSchema.parse(args);
      const params = CreateBlockParamsSchema.parse(parsed);

      const block = await client.insertBlock(params.page, params.content, {
        properties: params.properties,
        isPageBlock: params.isPageBlock,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text:
              `Successfully created block with ID: ${block.id}\n` +
              `Content: ${block.content}\n` +
              `Page: ${params.page}`,
          },
        ],
      };
    },
  };

  return { tools, handlers };
}