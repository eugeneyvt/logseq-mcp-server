import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LogseqClient } from '../utils/logseq-client.js';
import { SearchQuerySchema, DataScriptQuerySchema, PageNameSchema } from '../schemas/logseq.js';

export function createQueryTools(client: LogseqClient) {
  const tools: Tool[] = [
    {
      name: 'logseq_search',
      description: 'Search for content across pages and blocks in the Logseq graph',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query string',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return (default: 50)',
            default: 50,
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'logseq_datascript_query',
      description: 'Execute a DataScript query on the Logseq graph database',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The DataScript query in EDN format',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'logseq_get_backlinks',
      description: 'Find all pages and blocks that reference a specific page',
      inputSchema: {
        type: 'object',
        properties: {
          pageName: {
            type: 'string',
            description: 'The name of the page to find backlinks for',
          },
        },
        required: ['pageName'],
      },
    },
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
    logseq_search: async (args: any) => {
      const query = SearchQuerySchema.parse(args.query);
      const limit = args.limit || 50;

      try {
        // Use DataScript query to search for blocks containing the query string
        // This searches in block content using a case-insensitive approach
        const datascriptQuery = `[:find (pull ?b [*])
                                  :where 
                                  [?b :block/content ?content]
                                  [(clojure.string/lower-case ?content) ?lower-content]
                                  [(clojure.string/includes? ?lower-content "${query.toLowerCase()}")]]`;

        const results = await client.datascriptQuery(datascriptQuery);

        // Limit results
        const limitedResults = results.slice(0, limit);

        if (limitedResults.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No results found for "${query}".`,
              },
            ],
          };
        }

        const formattedResults = limitedResults
          .map((result: any) => {
            const block = result[0]; // DataScript returns arrays
            return (
              `- **Block ID**: ${block.id}\n` +
              `  **Content**: ${block.content}\n` +
              `  **Page**: ${block.page?.name || 'Unknown'}\n`
            );
          })
          .join('\n');

        return {
          content: [
            {
              type: 'text' as const,
              text: `Search results for "${query}" (${limitedResults.length}/${results.length} results):\n\n${formattedResults}`,
            },
          ],
        };
      } catch (error) {
        // Fallback: search through all pages manually
        console.warn('DataScript search failed, falling back to manual search:', error);

        const pages = await client.getAllPages();
        const searchResults: Array<{ page: string; content: string; type: 'page' | 'block' }> = [];

        // Search in page names
        for (const page of pages) {
          if (page.name.toLowerCase().includes(query.toLowerCase())) {
            searchResults.push({
              page: page.name,
              content: `Page name matches: ${page.name}`,
              type: 'page',
            });
          }
        }

        // Search in page content (limited to avoid performance issues)
        const pagesToSearch = pages.slice(0, Math.min(20, pages.length));
        for (const page of pagesToSearch) {
          try {
            const blocks = await client.getPageBlocksTree(page.name);
            const searchInBlocks = (blocks: any[], pageName: string) => {
              for (const block of blocks) {
                if (block.content.toLowerCase().includes(query.toLowerCase())) {
                  searchResults.push({
                    page: pageName,
                    content: block.content,
                    type: 'block',
                  });
                }
                if (block.children) {
                  searchInBlocks(block.children, pageName);
                }
              }
            };
            searchInBlocks(blocks, page.name);
          } catch (error) {
            // Skip pages that can't be read
            continue;
          }

          if (searchResults.length >= limit) {
            break;
          }
        }

        const limitedResults = searchResults.slice(0, limit);

        if (limitedResults.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No results found for "${query}".`,
              },
            ],
          };
        }

        const formattedResults = limitedResults
          .map(
            (result) =>
              `- **${result.type === 'page' ? 'Page' : 'Block'}** in "${result.page}": ${result.content}`
          )
          .join('\n');

        return {
          content: [
            {
              type: 'text' as const,
              text: `Search results for "${query}" (${limitedResults.length} results):\n\n${formattedResults}`,
            },
          ],
        };
      }
    },

    logseq_datascript_query: async (args: any) => {
      const query = DataScriptQuerySchema.parse(args.query);

      try {
        const results = await client.datascriptQuery(query);

        return {
          content: [
            {
              type: 'text' as const,
              text: `DataScript query results (${results.length} items):\n\n${JSON.stringify(results, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text:
                `DataScript query failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
                `Query: ${query}`,
            },
          ],
        };
      }
    },

    logseq_get_backlinks: async (args: any) => {
      const pageName = PageNameSchema.parse(args.pageName);

      try {
        // Use DataScript to find blocks that reference this page
        const query = `[:find (pull ?b [*])
                        :where 
                        [?page :block/name "${pageName}"]
                        [?b :block/refs ?page]]`;

        const results = await client.datascriptQuery(query);

        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No backlinks found for page "${pageName}".`,
              },
            ],
          };
        }

        const formattedResults = results
          .map((result: any) => {
            const block = result[0];
            return (
              `- **Page**: ${block.page?.name || 'Unknown'}\n` +
              `  **Block**: ${block.content}\n` +
              `  **ID**: ${block.id}\n`
            );
          })
          .join('\n');

        return {
          content: [
            {
              type: 'text' as const,
              text: `Backlinks for "${pageName}" (${results.length} references):\n\n${formattedResults}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Failed to get backlinks for "${pageName}": ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    },

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
                `Journal: ${page.journal || false}`,
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
