import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { LogseqClient } from '../logseq-client.js';
import {
  BuildGraphMapParamsSchema,
  SuggestPlacementParamsSchema,
  BatchParamsSchema,
  ErrorCode,
  type GraphMap,
  type PlacementSuggestion,
  type BatchParams,
} from '../schemas/logseq.js';
import { logger } from '../utils/logger.js';
import { createResponse, createErrorResponse, type ToolResult } from './common.js';
import { createSystemHandlers } from './system-handlers.js';
import { createPageHandlers } from './page-handlers.js';
import { createBlockHandlers } from './block-handlers.js';
import { createSearchHandlers } from './search-handlers.js';

/**
 * Cache for graph map
 */
let graphMapCache: GraphMap | null = null;
let graphMapCacheTime = 0;
const GRAPH_MAP_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Create graph and context-aware tools and handlers
 */
export function createGraphHandlers(client: LogseqClient): {
  tools: Tool[];
  handlers: Record<string, (args: unknown) => Promise<ToolResult>>;
} {
  const tools: Tool[] = [
    {
      name: 'build_graph_map',
      description: 'Build or refresh the graph structure map for context-aware operations',
      inputSchema: {
        type: 'object',
        properties: {
          refresh: { type: 'boolean', default: false, description: 'Force refresh cache' },
        },
      },
    },
    {
      name: 'suggest_placement',
      description: 'Get AI-powered suggestions for where to place new content. Analyzes existing graph structure to recommend optimal page names and locations based on content topic and existing patterns.',
      inputSchema: {
        type: 'object',
        properties: {
          intent: { type: 'string', description: 'Intent or purpose of the content (e.g., "meeting notes", "project planning", "learning resource")' },
          title: { type: 'string', description: 'Content title or topic (e.g., "Q2 Marketing Strategy", "React Learning Notes")' },
          keywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'Relevant keywords for context matching (e.g., ["javascript", "frontend", "tutorial"])',
          },
          preferBranch: { type: 'string', description: 'Preferred branch or namespace (e.g., "Projects/", "Learning/", "Work/")' },
          control: {
            type: 'object',
            properties: {
              dryRun: { type: 'boolean', default: false },
              strict: { type: 'boolean', default: true },
              idempotencyKey: { type: 'string' },
              maxOps: { type: 'number', default: 100 },
              autofixFormat: { type: 'boolean', default: true },
            },
          },
        },
        required: ['intent', 'title'],
      },
    },
    {
      name: 'plan_content',
      description: 'Generate AI-powered content planning with structured outline and optimal placement suggestions',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Content title' },
          outline: {
            type: 'array',
            items: { type: 'string' },
            description: 'Content outline points',
          },
          intent: { type: 'string', description: 'Content intent or purpose' },
          control: {
            type: 'object',
            properties: {
              dryRun: { type: 'boolean', default: false },
              strict: { type: 'boolean', default: true },
              idempotencyKey: { type: 'string' },
              maxOps: { type: 'number', default: 100 },
              autofixFormat: { type: 'boolean', default: true },
            },
          },
        },
        required: ['title'],
      },
    },
    {
      name: 'batch',
      description: 'Execute multiple Logseq operations atomically. All operations succeed or all fail together. Use for complex multi-step operations requiring consistency.',
      inputSchema: {
        type: 'object',
        properties: {
          ops: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                operation: { type: 'string', description: 'Operation name' },
                args: { type: 'object', description: 'Operation arguments' },
              },
              required: ['operation', 'args'],
            },
            description: 'Operations to execute',
          },
          atomic: { type: 'boolean', default: true, description: 'Execute atomically' },
          control: {
            type: 'object',
            properties: {
              dryRun: { type: 'boolean', default: false },
              strict: { type: 'boolean', default: true },
              idempotencyKey: { type: 'string' },
              maxOps: { type: 'number', default: 100 },
              autofixFormat: { type: 'boolean', default: true },
            },
          },
        },
        required: ['ops'],
      },
    },
  ];

  const handlers = {
    build_graph_map: async (args: unknown): Promise<ToolResult> => {
      try {
        const params = BuildGraphMapParamsSchema.parse(args);
        const shouldRefresh = params.refresh || !graphMapCache || 
          Date.now() - graphMapCacheTime > GRAPH_MAP_CACHE_TTL;

        if (!shouldRefresh && graphMapCache) {
          logger.debug('Returning cached graph map');
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  createResponse({ 
                    ...graphMapCache,
                    cached: true,
                    cacheAge: Date.now() - graphMapCacheTime,
                  }), 
                  null, 
                  2
                ),
              },
            ],
          };
        }

        logger.info('Building graph map');

        // Build basic graph structure
        const pages = await client.getAllPages();
        const pageMap = new Map();
        const namespaces = new Set<string>();
        const tags = new Set<string>();

        // Ensure pages is iterable and not null/undefined
        if (!pages || !Array.isArray(pages)) {
          logger.warn('getAllPages returned null, undefined, or non-array result');
          graphMapCache = {
            pages: [],
            generatedAt: Date.now(),
            stats: {
              totalPages: 0,
              journalPages: 0,
              taggedPages: 0,
            },
          };
          graphMapCacheTime = Date.now();

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(createResponse(graphMapCache), null, 2),
              },
            ],
          };
        }

        for (const page of pages) {
          pageMap.set(page.name, {
            id: page.id,
            name: page.name,
            journal: page['journal?'] || false,
            properties: page.properties || {},
          });

          // Extract namespaces (pages with '/' in name)
          if (page.name.includes('/')) {
            const namespace = page.name.split('/')[0];
            namespaces.add(namespace);
          }

          // Extract tags from properties
          if (page.properties?.tags) {
            const pageTags = Array.isArray(page.properties.tags) 
              ? page.properties.tags 
              : [page.properties.tags];
            pageTags.forEach((tag: unknown) => tags.add(String(tag)));
          }
        }

        graphMapCache = {
          pages: Array.from(pageMap.values()),
          generatedAt: Date.now(),
          stats: {
            totalPages: pages.length,
            journalPages: pages.filter(p => p['journal?']).length,
            taggedPages: Array.from(tags).length,
          },
        };
        graphMapCacheTime = Date.now();

        logger.info({ 
          pageCount: pages.length, 
          namespaceCount: namespaces.size,
          tagCount: tags.size 
        }, 'Graph map built successfully');

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(createResponse(graphMapCache), null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error({ error }, 'Failed to build graph map');
        const response = createErrorResponse(ErrorCode.INTERNAL, `Failed to build graph map: ${error}`);
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

    suggest_placement: async (args: unknown): Promise<ToolResult> => {
      try {
        const params = SuggestPlacementParamsSchema.parse(args);
        logger.debug({ intent: params.intent, title: params.title }, 'Suggesting placement');

        // Ensure graph map is available
        if (!graphMapCache || Date.now() - graphMapCacheTime > GRAPH_MAP_CACHE_TTL) {
          await handlers.build_graph_map({ refresh: true });
        }

        const suggestions: PlacementSuggestion[] = [];

        // Basic placement logic based on namespaces and keywords
        if (params.preferBranch) {
          suggestions.push({
            suggestedPage: `${params.preferBranch}/${params.title}`,
            confidence: 0.9,
            reasoning: 'Matches preferred branch',
            alternatives: [],
          });
        }

        // Suggest based on keywords
        if (params.keywords && graphMapCache?.pages) {
          for (const keyword of params.keywords) {
            const matchingPages = (Array.isArray(graphMapCache.pages) ? graphMapCache.pages : [])
              .filter(page => page.name.toLowerCase().includes(keyword.toLowerCase()));
            
            if (matchingPages.length > 0) {
              suggestions.push({
                suggestedPage: `${keyword}/${params.title}`,
                confidence: 0.7,
                reasoning: `Related to existing pages with '${keyword}'`,
                alternatives: [],
              });
            }
          }
        }

        // Default suggestion
        if (suggestions.length === 0) {
          suggestions.push({
            suggestedPage: params.title,
            confidence: 0.5,
            reasoning: 'No specific placement found, standalone page',
            alternatives: [],
          });
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(createResponse({ suggestions }), null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error({ error }, 'Failed to suggest placement');
        const response = createErrorResponse(ErrorCode.INTERNAL, `Failed to suggest placement: ${error}`);
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

    plan_content: async (): Promise<ToolResult> => {
      const response = createErrorResponse(
        ErrorCode.INTERNAL,
        'plan_content not yet implemented',
        'This method is planned for future implementation'
      );
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    },

    batch: async (args: unknown): Promise<ToolResult> => {
      try {
        const params = BatchParamsSchema.parse(args) as BatchParams;
        logger.debug({ operationCount: params.ops.length }, 'Executing batch operations');

        if (params.control?.dryRun) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  createResponse({
                    action: 'would_execute_batch',
                    operationCount: params.ops.length,
                    operations: params.ops.map(op => ({ operation: op.operation, argsKeys: Object.keys(op.args) })),
                  }),
                  null,
                  2
                ),
              },
            ],
          };
        }

        // Create all handlers
        const systemModule = createSystemHandlers(client);
        const pageModule = createPageHandlers(client);
        const blockModule = createBlockHandlers(client);
        const searchModule = createSearchHandlers(client);
        
        // Combine all handlers for execution
        const allHandlers = {
          ...systemModule.handlers,
          ...pageModule.handlers,
          ...blockModule.handlers,
          ...searchModule.handlers,
          // Note: we exclude graph handlers to prevent recursive batch calls
        };

        const results: Array<{ operation: string; success: boolean; result?: unknown; error?: string }> = [];
        const errors: string[] = [];

        // Execute operations
        for (let i = 0; i < params.ops.length; i++) {
          const op = params.ops[i];
          
          try {
            const handler = allHandlers[op.operation];
            if (!handler) {
              const error = `Unknown operation: ${op.operation}`;
              errors.push(error);
              results.push({ operation: op.operation, success: false, error });
              
              // If atomic mode and we hit an error, stop execution
              if (params.atomic) {
                break;
              }
              continue;
            }

            logger.debug({ operation: op.operation, opIndex: i }, 'Executing batch operation');
            const result = await handler(op.args);
            
            results.push({ operation: op.operation, success: true, result });
            logger.debug({ operation: op.operation, opIndex: i }, 'Batch operation completed successfully');
            
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            errors.push(`Operation ${op.operation}: ${errorMsg}`);
            results.push({ operation: op.operation, success: false, error: errorMsg });
            
            // If atomic mode and we hit an error, stop execution
            if (params.atomic) {
              logger.warn({ operation: op.operation, error: errorMsg }, 'Atomic batch operation failed, stopping execution');
              break;
            }
            
            logger.warn({ operation: op.operation, error: errorMsg }, 'Batch operation failed, continuing with next');
          }
        }

        // Check if we should fail the entire batch in atomic mode
        if (params.atomic && errors.length > 0) {
          const response = createErrorResponse(
            ErrorCode.INTERNAL,
            `Batch operation failed (atomic mode): ${errors[0]}`,
            `${errors.length} operation(s) failed. In atomic mode, all operations must succeed.`
          );
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(response, null, 2),
              },
            ],
          };
        }

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.length - successCount;

        logger.info({ 
          totalOperations: params.ops.length, 
          successCount, 
          failureCount,
          atomic: params.atomic 
        }, 'Batch operations completed');

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                createResponse({
                  results,
                  summary: {
                    total: params.ops.length,
                    successful: successCount,
                    failed: failureCount,
                    atomic: params.atomic,
                  },
                  errors: errors.length > 0 ? errors : undefined,
                }),
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.error({ error }, 'Failed to execute batch operations');
        const response = createErrorResponse(ErrorCode.INTERNAL, `Failed to execute batch: ${error}`);
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

// Export the cache variables for use in other modules
export { graphMapCache, graphMapCacheTime };