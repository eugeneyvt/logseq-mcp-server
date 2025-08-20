import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LogseqClient } from '../../logseq-client.js';
import type { LogseqBlock } from '../../schemas/base-types.js';
import { SearchQuerySchema } from '../../schemas/logseq.js';
import { SearchToolArgsSchema } from '../../types/tool-arguments.js';

interface DataScriptBlock {
  id: string;
  content: string;
  page?: { name: string };
  children?: DataScriptBlock[];
}

export function createSearchTools(client: LogseqClient) {
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
  ];

  const handlers = {
    logseq_search: async (args: unknown) => {
      const parsed = SearchToolArgsSchema.parse(args);
      const query = SearchQuerySchema.parse(parsed.query);
      const limit = parsed.limit || 50;

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
          .map((result: unknown) => {
            const block = (result as unknown[])[0] as DataScriptBlock; // DataScript returns arrays
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
        // Note: Fallback to manual search (error logged elsewhere if needed)

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
            const searchInBlocks = (blocks: readonly LogseqBlock[], pageName: string) => {
              for (const block of blocks) {
                if (block.content?.toLowerCase().includes(query.toLowerCase())) {
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
  };

  return { tools, handlers };
}