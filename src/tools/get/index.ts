/**
 * Get Tool (Thin Handler)
 * Unified Get Tool Implementation - Retrieve specific content with full details and context
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { LogseqClient } from '../../logseq-client.js';
import type { ToolResult } from '../../types.js';
import { getToolSchema } from './schema.js';
import { handleGetRequest } from './handler.js';

/**
 * Create the unified get tool
 */
export function createGetTool(client: LogseqClient): {
  tool: Tool;
  handler: (args: unknown) => Promise<ToolResult>;
} {
  const tool: Tool = {
    name: 'get',
    description: 'Retrieve specific content with full details and context. Supports pages, blocks, templates, properties, relations, tasks, system info, and graph data with flexible include options.',
    inputSchema: getToolSchema
  };

  const handler = async (args: unknown): Promise<ToolResult> => {
    return handleGetRequest(client, args);
  };

  return {
    tool,
    handler
  };
}