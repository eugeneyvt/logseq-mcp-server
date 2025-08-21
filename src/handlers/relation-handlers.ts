import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { LogseqClient } from '../logseq-client.js';
import { ErrorCode } from '../schemas/logseq.js';
import { logger } from '../utils/logger.js';
import { createResponse, createErrorResponse, type ToolResult } from './common.js';
import { ManageRelationsParamsSchema } from './relations/relation-types.js';
import { createPageLink, removePageLink } from './relations/link-operations.js';
import { analyzePageRelations, getGraphStructure } from './relations/analysis-operations.js';

/**
 * Create relation management tools and handlers
 */
export function createRelationHandlers(client: LogseqClient): {
  tools: Tool[];
  handlers: Record<string, (args: unknown) => Promise<ToolResult>>;
} {
  const tools: Tool[] = [
    {
      name: 'manage_relations',
      description:
        'Comprehensive relationship management for Logseq pages. Operations: create-link (add links between pages), remove-link (remove page links), analyze-relations (get relationship analysis), get-graph-structure (analyze page connectivity). Creates bi-directional references and manages page relationships.',
      inputSchema: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['create-link', 'remove-link', 'analyze-relations', 'get-graph-structure'],
            description:
              'Operation to perform: create-link, remove-link, analyze-relations, or get-graph-structure',
          },
          sourcePage: {
            type: 'string',
            description: 'Source page name',
          },
          targetPage: {
            type: 'string',
            description: 'Target page name (required for create-link and remove-link operations)',
          },
          linkText: {
            type: 'string',
            description: 'Optional text context for the link (e.g., "relates to", "inspired by")',
          },
          context: {
            type: 'string',
            description: 'Optional context text to include with the link',
          },
          depth: {
            type: 'number',
            minimum: 1,
            maximum: 3,
            default: 2,
            description: 'Analysis depth for relation analysis (1-3)',
          },
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
        required: ['operation', 'sourcePage'],
      },
    },
  ];

  const handlers = {
    manage_relations: async (args: unknown): Promise<ToolResult> => {
      try {
        const params = ManageRelationsParamsSchema.parse(args);

        logger.info(
          {
            operation: params.operation,
            sourcePage: params.sourcePage,
            targetPage: params.targetPage,
          },
          'Managing relations'
        );

        // Handle dry run
        if (params.control.dryRun) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  createResponse({
                    success: true,
                    dryRun: true,
                    operation: params.operation,
                    sourcePage: params.sourcePage,
                    targetPage: params.targetPage,
                    message: 'Dry run - no changes were made',
                  }),
                  null,
                  2
                ),
              },
            ],
          };
        }

        // Route to appropriate operation handler
        let result;
        switch (params.operation) {
          case 'create-link':
            result = await createPageLink(client, params);
            break;
          case 'remove-link':
            result = await removePageLink(client, params);
            break;
          case 'analyze-relations':
            result = await analyzePageRelations(client, params);
            break;
          case 'get-graph-structure':
            result = await getGraphStructure(client, params);
            break;
          default:
            result = createErrorResponse(
              ErrorCode.VALIDATION_ERROR,
              `Unknown operation: ${params.operation}`,
              'Supported operations: create-link, remove-link, analyze-relations, get-graph-structure'
            );
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error({ error }, 'Manage relations failed');
        const response = createErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          `Invalid parameters: ${error}`
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
    },
  };

  return { tools, handlers };
}
