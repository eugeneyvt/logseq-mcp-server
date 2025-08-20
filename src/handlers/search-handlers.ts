import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { LogseqClient } from '../logseq-client.js';
import type { LogseqBlock } from '../schemas/base-types.js';
import {
  SearchParamsSchemaV2,
  ErrorCode,
  type SearchParamsV2,
} from '../schemas/logseq.js';
import { logger } from '../utils/logger.js';
import { createResponse, createErrorResponse, type ToolResult } from './common.js';

/**
 * Create search-related tools and handlers
 */
export function createSearchHandlers(client: LogseqClient): {
  tools: Tool[];
  handlers: Record<string, (args: unknown) => Promise<ToolResult>>;
} {
  const tools: Tool[] = [
    {
      name: 'search',
      description: 'Search blocks and pages with intelligent wildcard handling. Supports multiple query types: "*" for all pages, "empty" for empty pages, page:"PageName" for specific page blocks, and normal text for content search.',
      inputSchema: {
        type: 'object',
        properties: {
          q: { 
            type: 'string', 
            description: 'Search query. Use "*" for all pages, "empty" for empty pages, page:"Aug 20th, 2025" for specific page blocks, or normal text for content search' 
          },
          scope: {
            type: 'string',
            enum: ['blocks', 'pages', 'all'],
            default: 'all',
            description: 'Search scope: "blocks" for block content, "pages" for page names, "all" for both',
          },
          cursor: { type: 'string', description: 'Pagination cursor' },
          limit: { type: 'number', default: 20, maximum: 100, description: 'Result limit' },
        },
        required: ['q'],
      },
    },
  ];

  const handlers = {
    search: async (args: unknown): Promise<ToolResult> => {
      try {
        const params = SearchParamsSchemaV2.parse(args) as SearchParamsV2;
        logger.info({ query: params.q, scope: params.scope }, 'Searching');

        // Handle common AI wildcard patterns intelligently
        let results: Array<{ type: string; id: string | number; content?: string; name?: string; page?: string; properties?: Record<string, unknown>; reason?: string }> = [];
        
        if (params.q === '*' || params.q === 'all' || params.q === 'everything') {
          // Return all pages when user searches for "*" or "all"
          logger.info('Wildcard search detected - returning all pages');
          const allPages = await client.getAllPages();
          if (allPages && Array.isArray(allPages)) {
            results = allPages.map((page) => ({
              type: 'page',
              id: page.id,
              name: page.name,
              journal: page.journal || false,
              properties: page.properties || {},
            }));
          }
        } else if (params.q.toLowerCase().includes('empty') || params.q.toLowerCase().includes('no content') || params.q.toLowerCase().includes('blank')) {
          // Find empty pages when user searches for "empty" or "no content"
          logger.info('Empty page search detected');
          const allPages = await client.getAllPages();
          if (allPages && Array.isArray(allPages)) {
            const emptyPages = [];
            // Check first 50 pages for emptiness to avoid performance issues
            const pagesToCheck = allPages.slice(0, 50);
            
            for (const page of pagesToCheck) {
              try {
                const blocks = await client.getPageBlocksTree(page.name);
                if (!blocks || blocks.length === 0) {
                  emptyPages.push({
                    type: 'page',
                    id: page.id,
                    name: page.name,
                    journal: page.journal || false,
                    properties: page.properties || {},
                    reason: 'No blocks found'
                  });
                } else {
                  // Check if all blocks are empty
                  const nonEmptyBlocks = blocks.filter(block => {
                    const content = block.content || '';
                    return content.trim().length > 0;
                  });
                  if (nonEmptyBlocks.length === 0) {
                    emptyPages.push({
                      type: 'page',
                      id: page.id,
                      name: page.name,
                      journal: page.journal || false,
                      properties: page.properties || {},
                      reason: 'All blocks are empty'
                    });
                  }
                }
              } catch (error) {
                // Skip pages with access errors
                continue;
              }
            }
            results = emptyPages;
          }
        } else {
          // Normal search logic
          try {
            // Perform actual search using Logseq API
            if (params.scope === 'pages' || params.scope === 'all') {
              try {
                const allPages = await client.getAllPages();
                if (allPages && Array.isArray(allPages)) {
                  const pageResults = allPages.filter(page => 
                    page.name.toLowerCase().includes(params.q.toLowerCase()) ||
                    (page.properties && JSON.stringify(page.properties).toLowerCase().includes(params.q.toLowerCase()))
                  );
                  
                  results = results.concat(
                    pageResults.map((page) => ({
                      type: 'page',
                      id: page.id,
                      name: page.name,
                      journal: page.journal || false,
                      properties: page.properties || {},
                    }))
                  );
                }
              } catch (error) {
                logger.warn({ error }, 'Page search failed');
              }
            }

            if (params.scope === 'blocks' || params.scope === 'all') {
              try {
                // Handle page-specific search
                if (params.q.startsWith('page:"') && params.q.includes('"')) {
                  const match = params.q.match(/^page:"([^"]+)"/);
                  if (match) {
                    const pageName = match[1];
                    logger.debug({ pageName }, 'Searching for page');
                    
                    // Find page by name (case-insensitive)
                    const allPages = await client.getAllPages();
                    const targetPage = allPages.find(p => 
                      p.name.toLowerCase() === pageName.toLowerCase() ||
                      p.originalName?.toLowerCase() === pageName.toLowerCase()
                    );
                    
                    if (targetPage) {
                      // Get page blocks
                      let blocks = null;
                      try {
                        blocks = await client.getPageBlocksTree(targetPage.id);
                      } catch (error) {
                        try {
                          blocks = await client.getPageBlocksTree(targetPage.name);
                        } catch (nameError) {
                          // Continue without blocks if both attempts fail
                        }
                      }
                      
                      if (blocks && blocks.length > 0) {
                        // Flatten nested blocks
                        const flattenBlocks = (blockList: readonly LogseqBlock[]): LogseqBlock[] => {
                          let result: LogseqBlock[] = [];
                          for (const block of blockList) {
                            result.push(block);
                            if (block.children && block.children.length > 0) {
                              result = result.concat(flattenBlocks(block.children));
                            }
                          }
                          return result;
                        };
                        
                        const allBlocks = flattenBlocks(blocks);
                        const blockResults = allBlocks.map((block) => ({
                          type: 'block',
                          id: block.uuid || String(block.id),
                          content: block.content || '',
                          page: targetPage.name,
                          properties: block.properties || {},
                        }));
                        results = results.concat(blockResults);
                      }
                    }
                  }
                } else {
                  // Regular search using Logseq API
                  const searchResults = await client.callApi<{
                    blocks: Array<{
                      'block/uuid': string;
                      'block/content': string;
                      'block/page': number;
                    }>;
                    pages: string[];
                  }>('logseq.App.search', [params.q]);
                  
                  if (searchResults?.blocks) {
                    results = results.concat(
                      searchResults.blocks.map((block) => ({
                        type: 'block',
                        id: block['block/uuid'],
                        content: block['block/content'] || '',
                        page: `Page ${block['block/page']}`,
                        properties: {},
                      }))
                    );
                  }
                }
              } catch (error) {
                logger.warn({ error }, 'Block search failed');
              }
            }
          } catch (error) {
            logger.warn({ error }, 'Search operation partially failed');
            // Continue with partial results
          }
        }

        // Apply limit and pagination
        const limit = Math.min(params.limit || 20, 100);
        const startIndex = params.cursor ? parseInt(params.cursor, 10) || 0 : 0;
        const endIndex = startIndex + limit;
        const paginatedResults = results.slice(startIndex, endIndex);
        
        const hasMore = results.length > endIndex;
        const nextCursor = hasMore ? endIndex.toString() : undefined;

        logger.info(
          { 
            query: params.q, 
            totalResults: results.length, 
            returnedResults: paginatedResults.length,
            hasMore 
          }, 
          'Search completed'
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                createResponse({
                  results: paginatedResults,
                  totalCount: results.length,
                  hasMore,
                  nextCursor,
                  query: params.q,
                  scope: params.scope,
                }),
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.error({ error }, 'Search failed');
        const response = createErrorResponse(ErrorCode.INTERNAL, `Search failed: ${error}`);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      }
    },
  };

  return { tools, handlers };
}