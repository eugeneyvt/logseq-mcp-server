import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { LogseqClient } from '../logseq-client.js';
import {
  BuildGraphMapParamsSchema,
  SuggestPlacementParamsSchema,
  BatchParamsSchema,
  type BatchParams,
} from '../schemas/logseq.js';
import type { ToolResult } from './common.js';
import { createSystemHandlers } from './system-handlers.js';
import { createPageHandlers } from './page-handlers.js';
import { createBlockHandlers } from './block-handlers.js';
import { createSearchHandlers } from './search-handlers.js';
import { buildGraphMap } from './graph/graph-map-builder.js';
import { suggestPlacement, planContent } from './graph/placement-suggester.js';
import { executeBatch } from './graph/batch-executor.js';

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
      description:
        'Get AI-powered suggestions for where to place new content. Analyzes existing graph structure to recommend optimal page names and locations based on content topic and existing patterns.',
      inputSchema: {
        type: 'object',
        properties: {
          intent: {
            type: 'string',
            description:
              'Intent or purpose of the content (e.g., "meeting notes", "project planning", "learning resource")',
          },
          title: {
            type: 'string',
            description:
              'Content title or topic (e.g., "Q2 Marketing Strategy", "React Learning Notes")',
          },
          keywords: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Relevant keywords for context matching (e.g., ["javascript", "frontend", "tutorial"])',
          },
          preferBranch: {
            type: 'string',
            description: 'Preferred branch or namespace (e.g., "Projects/", "Learning/", "Work/")',
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
        required: ['intent', 'title'],
      },
    },
    {
      name: 'plan_content',
      description:
        'Generate AI-powered content planning with structured outline and optimal placement suggestions',
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
      description:
        'Execute multiple Logseq operations atomically. All operations succeed or all fail together. Use for complex multi-step operations requiring consistency.',
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
      const params = BuildGraphMapParamsSchema.parse(args);
      return await buildGraphMap(client, params);
    },

    suggest_placement: async (args: unknown): Promise<ToolResult> => {
      const params = SuggestPlacementParamsSchema.parse(args);
      return await suggestPlacement(client, params);
    },

    plan_content: async (): Promise<ToolResult> => {
      return await planContent();
    },

    batch: async (args: unknown): Promise<ToolResult> => {
      const params = BatchParamsSchema.parse(args) as BatchParams;
      return await executeBatch(client, params, () => {
        const systemModule = createSystemHandlers(client);
        const pageModule = createPageHandlers(client);
        const blockModule = createBlockHandlers(client);
        const searchModule = createSearchHandlers(client);

        return {
          ...systemModule.handlers,
          ...pageModule.handlers,
          ...blockModule.handlers,
          ...searchModule.handlers,
          // Note: we exclude graph handlers to prevent recursive batch calls
        };
      });
    },
  };

  return { tools, handlers };
}
