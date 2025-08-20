import type { Tool } from '@modelcontextprotocol/sdk/types.js';

import { ValidationError } from '../errors/index.js';
import type { CreatePageParams } from '../schemas/logseq.js';
import { CreatePageParamsSchema, PageNameSchema } from '../schemas/logseq.js';
import type { LogseqClient } from '../logseq-client.js';
import { logger } from '../utils/logger.js';

/**
 * Result type for MCP tool handlers
 */
interface ToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

/**
 * Create page-related MCP tools
 *
 * @param client - The Logseq API client instance
 * @returns Object containing tools and their handlers
 */
export function createPageTools(client: LogseqClient): {
  tools: Tool[];
  handlers: Record<string, (args: unknown) => Promise<unknown>>;
} {
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
    /**
     * List all pages in the Logseq graph
     */
    logseq_list_pages: async (): Promise<ToolResult> => {
      logger.debug('Listing all pages');

      const pages = await client.getAllPages();
      const pageList = Array.from(pages).map((page) => ({
        name: page.name,
        originalName: page.originalName,
        journal: page.journal ?? false,
        id: page.id,
      }));

      logger.info({ count: pages.length }, 'Retrieved pages list');

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

    /**
     * Get information about a specific page
     */
    logseq_get_page: async (args: unknown): Promise<ToolResult> => {
      const validationResult = PageNameSchema.safeParse((args as { name?: unknown })?.name);
      if (!validationResult.success) {
        throw new ValidationError('Invalid page name', validationResult.error.errors);
      }

      const name = validationResult.data;
      logger.debug({ pageName: name }, 'Getting page information');

      const page = await client.getPage(name);

      if (page === null) {
        logger.info({ pageName: name }, 'Page not found');
        return {
          content: [
            {
              type: 'text' as const,
              text: `Page "${name}" not found.`,
            },
          ],
        };
      }

      logger.info({ pageName: name, pageId: page.id }, 'Retrieved page information');

      return {
        content: [
          {
            type: 'text' as const,
            text:
              `Page: ${page.name}\n` +
              `ID: ${page.id}\n` +
              `Journal: ${page.journal ?? false}\n` +
              `Properties: ${JSON.stringify(page.properties ?? {}, null, 2)}`,
          },
        ],
      };
    },

    /**
     * Get the full content of a page formatted as markdown
     */
    logseq_get_page_content: async (args: unknown): Promise<ToolResult> => {
      const validationResult = PageNameSchema.safeParse((args as { name?: unknown })?.name);
      if (!validationResult.success) {
        throw new ValidationError('Invalid page name', validationResult.error.errors);
      }

      const name = validationResult.data;
      logger.debug({ pageName: name }, 'Getting page content');

      const blocks = await client.getPageBlocksTree(name);

      if (blocks.length === 0) {
        logger.info({ pageName: name }, 'Page has no content or does not exist');
        return {
          content: [
            {
              type: 'text' as const,
              text: `Page "${name}" has no content or does not exist.`,
            },
          ],
        };
      }

      /**
       * Format blocks into hierarchical markdown
       */
      const formatBlocks = (blockList: readonly (typeof blocks)[number][], level = 0): string => {
        return blockList
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

      const formattedContent = formatBlocks(blocks);
      logger.info({ pageName: name, blockCount: blocks.length }, 'Retrieved page content');

      return {
        content: [
          {
            type: 'text' as const,
            text: `# ${name}\n\n${formattedContent}`,
          },
        ],
      };
    },

    /**
     * Create a new page in the Logseq graph
     */
    logseq_create_page: async (args: unknown): Promise<ToolResult> => {
      const validationResult = CreatePageParamsSchema.safeParse(args);
      if (!validationResult.success) {
        throw new ValidationError('Invalid create page parameters', validationResult.error.errors);
      }

      const params: CreatePageParams = validationResult.data;
      logger.debug({ pageName: params.name }, 'Creating new page');

      // Check if page already exists
      const existing = await client.getPage(params.name);
      if (existing !== null) {
        logger.info({ pageName: params.name }, 'Page already exists');
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
        logger.debug({ pageName: params.name }, 'Added initial content to page');
      }

      logger.info({ pageName: page.name, pageId: page.id }, 'Successfully created page');

      return {
        content: [
          {
            type: 'text' as const,
            text: `Successfully created page "${page.name}" with ID ${page.id}.`,
          },
        ],
      };
    },

    /**
     * Delete a page from the Logseq graph
     */
    logseq_delete_page: async (args: unknown): Promise<ToolResult> => {
      const validationResult = PageNameSchema.safeParse((args as { name?: unknown })?.name);
      if (!validationResult.success) {
        throw new ValidationError('Invalid page name', validationResult.error.errors);
      }

      const name = validationResult.data;
      logger.debug({ pageName: name }, 'Deleting page');

      // Check if page exists
      const page = await client.getPage(name);
      if (page === null) {
        logger.info({ pageName: name }, 'Page not found for deletion');
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
      logger.info({ pageName: name }, 'Successfully deleted page');

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
