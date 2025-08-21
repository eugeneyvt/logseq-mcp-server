import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { LogseqClient } from '../../logseq-client.js';
import { SearchParamsSchemaV2, ErrorCode, type SearchParamsV2 } from '../../schemas/logseq.js';
import { logger } from '../../utils/logger.js';
import { createResponse, createErrorResponse, type ToolResult } from '../common.js';
import { executeBasicSearch } from './basic-search.js';
import { executeTemplateSearch } from './template-search.js';
import { executePropertySearch } from './property-search.js';
import { executeAdvancedSearch } from './advanced-search.js';
import { executeGeneralSearch } from './general-search.js';
import { detectSearchType } from './query-detector.js';

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
      description:
        'Enhanced search with intelligent query handling and combined filters. Supports: "*" for all pages, "empty" for empty pages, page:"PageName" for page blocks, templates:* for all templates, template:"name" for specific template, property:key=value for property search, properties:page="PageName" for page properties, backlinks:"PageName" for pages linking to target, references:"PageName" for all references, date:YYYY-MM-DD or date:today/yesterday/last-week for date filtering, and normal text for content search. Combine filters with AND/OR: "property:status=open AND date:last-week", "templates:* OR property:type=template".',
      inputSchema: {
        type: 'object',
        properties: {
          q: {
            type: 'string',
            description:
              'Enhanced search query. Examples: "*" (all pages), "empty" (empty pages), page:"PageName" (page blocks), templates:* (all templates), template:"name" (specific template), property:status=open (property search), properties:page="PageName" (page properties), backlinks:"PageName" (linking pages), references:"PageName" (all references), or normal text search',
          },
          scope: {
            type: 'string',
            enum: ['blocks', 'pages', 'all'],
            default: 'all',
            description:
              'Search scope: "blocks" for block content, "pages" for page names, "all" for both',
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

        // Detect search type and route to appropriate handler
        const searchType = detectSearchType(params.q);
        logger.debug({ query: params.q, searchType }, 'Detected search type');

        let results: Array<Record<string, unknown>> = [];

        // Route to the appropriate search module based on detected type
        switch (searchType) {
          case 'wildcard':
          case 'empty':
            results = await executeBasicSearch(client, params.q);
            break;

          case 'template':
            results = await executeTemplateSearch(client, params.q);
            break;

          case 'property':
            results = await executePropertySearch(client, params.q);
            break;

          case 'backlinks':
          case 'references':
          case 'date':
          case 'combined':
            results = await executeAdvancedSearch(client, params.q, params.scope || 'all');
            break;

          case 'general':
          default:
            results = await executeGeneralSearch(client, params.q, params.scope || 'all');
            break;
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
            hasMore,
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
