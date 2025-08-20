import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LogseqClient } from '../logseq-client.js';
import { PageNameSchema, CreatePageParamsSchema } from '../schemas/logseq.js';

export function createPageTools(client: LogseqClient) {
  const tools: Tool[] = [
    {
      name: 'logseq_list_pages',
      description: 'List all pages in the Logseq graph',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'logseq_get_page',
      description: 'Get information about a specific page by name',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The name of the page to retrieve',
          },
        },
        required: ['name'],
      },
    },
    {
      name: 'logseq_get_page_content',
      description: 'Get the full content of a page as markdown',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The name of the page to get content for',
          },
        },
        required: ['name'],
      },
    },
    {
      name: 'logseq_create_page',
      description: 'Create a new page in the Logseq graph',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The name of the page to create',
          },
          content: {
            type: 'string',
            description: 'Optional initial content for the page',
          },
          properties: {
            type: 'object',
            description: 'Optional properties for the page',
          },
        },
        required: ['name'],
      },
    },
    {
      name: 'logseq_delete_page',
      description: 'Delete a page from the Logseq graph (use with caution)',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The name of the page to delete',
          },
        },
        required: ['name'],
      },
    },
  ];

  const handlers = {
    logseq_list_pages: async () => {
      const pages = await client.getAllPages();
      const pageList = pages.map((page) => ({
        name: page.name,
        originalName: page.originalName,
        journal: page.journal || false,
        id: page.id,
      }));

      return {
        content: [
          {
            type: 'text' as const,
            text:
              `Found ${pages.length} pages:\n\n` +
              pageList
                .map((page) => `- ${page.name}${page.journal ? ' (journal)' : ''}`)
                .join('\n'),
          },
        ],
      };
    },

    logseq_get_page: async (args: any) => {
      const name = PageNameSchema.parse(args.name);
      const page = await client.getPage(name);

      if (!page) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Page "${name}" not found.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text:
              `Page: ${page.name}\n` +
              `ID: ${page.id}\n` +
              `Journal: ${page.journal || false}\n` +
              `Properties: ${JSON.stringify(page.properties || {}, null, 2)}`,
          },
        ],
      };
    },

    logseq_get_page_content: async (args: any) => {
      const name = PageNameSchema.parse(args.name);
      const blocks = await client.getPageBlocksTree(name);

      if (!blocks || blocks.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Page "${name}" has no content or does not exist.`,
            },
          ],
        };
      }

      const formatBlocks = (blocks: readonly any[], level = 0): string => {
        return blocks
          .map((block) => {
            const indent = '  '.repeat(level);
            const bullet = level === 0 ? '-' : '  -';
            let content = `${indent}${bullet} ${block.content}`;

            if (block.children && block.children.length > 0) {
              content += '\n' + formatBlocks(block.children, level + 1);
            }

            return content;
          })
          .join('\n');
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: `# ${name}\n\n${formatBlocks(blocks)}`,
          },
        ],
      };
    },

    logseq_create_page: async (args: any) => {
      const params = CreatePageParamsSchema.parse(args);

      // Check if page already exists
      const existing = await client.getPage(params.name);
      if (existing) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Page "${params.name}" already exists.`,
            },
          ],
        };
      }

      const page = await client.createPage(params.name, params.properties);

      // If content is provided, add it to the page
      if (params.content) {
        await client.insertBlock(params.name, params.content);
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `Successfully created page "${page.name}" with ID ${page.id}.`,
          },
        ],
      };
    },

    logseq_delete_page: async (args: any) => {
      const name = PageNameSchema.parse(args.name);

      // Check if page exists
      const page = await client.getPage(name);
      if (!page) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Page "${name}" does not exist.`,
            },
          ],
        };
      }

      await client.deletePage(name);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Successfully deleted page "${name}".`,
          },
        ],
      };
    },
  };

  return { tools, handlers };
}
