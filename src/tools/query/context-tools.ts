import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LogseqClient } from '../../logseq-client.js';

export function createContextTools(client: LogseqClient) {
  const tools: Tool[] = [
    {
      name: 'logseq_get_current_graph',
      description: 'Get information about the currently open Logseq graph',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'logseq_get_current_page',
      description: 'Get the currently open page in Logseq',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'logseq_get_current_block',
      description: 'Get the currently focused block in Logseq',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ];

  const handlers = {
    logseq_get_current_graph: async () => {
      try {
        const graph = await client.getCurrentGraph();

        return {
          content: [
            {
              type: 'text' as const,
              text: `Current graph information:\n${JSON.stringify(graph, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Failed to get current graph: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    },

    logseq_get_current_page: async () => {
      try {
        const page = await client.getCurrentPage();

        if (!page) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No page is currently open in Logseq.',
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text:
                `Currently open page:\n` +
                `Name: ${page.name}\n` +
                `ID: ${page.id}\n` +
                `Journal: ${page['journal?'] || false}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Failed to get current page: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    },

    logseq_get_current_block: async () => {
      try {
        const block = await client.getCurrentBlock();

        if (!block) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No block is currently focused in Logseq.',
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text:
                `Currently focused block:\n` +
                `ID: ${block.id}\n` +
                `Content: ${block.content}\n` +
                `Page: ${block.page?.name || 'Unknown'}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Failed to get current block: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    },
  };

  return { tools, handlers };
}