import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { LogseqClient } from '../logseq-client.js';
import { ErrorCode } from '../schemas/logseq.js';
import { logger } from '../utils/logger.js';
import { createResponse, createErrorResponse, type ToolResult } from './common.js';

/**
 * Cache for graph map
 */
const graphMapCache: Record<string, unknown> | null = null;
const graphMapCacheTime = 0;

/**
 * Create system-related tools and handlers
 */
export function createSystemHandlers(client: LogseqClient): {
  tools: Tool[];
  handlers: Record<string, (args: unknown) => Promise<ToolResult>>;
} {
  const tools: Tool[] = [
    {
      name: 'get_system_info',
      description: 'Get system information including Logseq version and graph status',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ];

  const handlers = {
    get_system_info: async (): Promise<ToolResult> => {
      try {
        const [graph, userConfigs] = await Promise.all([
          client.getCurrentGraph(),
          client.getUserConfigs().catch(() => null),
        ]);

        const systemInfo = {
          graph: graph || 'Unknown',
          userConfigs: userConfigs || {},
          serverVersion: '1.0.2',
          cacheStatus: {
            graphMap: !!graphMapCache,
            graphMapAge: graphMapCache ? Date.now() - graphMapCacheTime : null,
          },
        };

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(createResponse(systemInfo), null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error({ error }, 'Failed to get system info');
        const response = createErrorResponse(
          ErrorCode.INTERNAL,
          `Failed to get system info: ${error}`
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