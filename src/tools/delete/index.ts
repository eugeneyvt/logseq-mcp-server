/**
 * Delete Tool (Thin Handler)
 * Remove content with comprehensive safety controls and impact analysis
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { LogseqClient } from '../../logseq-client.js';
import type { ToolResult } from '../../types.js';
import { deleteToolSchema } from './schema.js';
import { handleDeleteRequest } from './handler.js';

/**
 * Create the unified delete tool
 */
export function createDeleteTool(client: LogseqClient): {
  tool: Tool;
  handler: (args: unknown) => Promise<ToolResult>;
} {
  const tool: Tool = {
    name: 'delete',
    description: 'Remove content with comprehensive safety controls and impact analysis. Supports pages, blocks, templates, properties, relations, tasks with confirmation requirements and soft delete options.',
    inputSchema: deleteToolSchema
  };

  const handler = async (args: unknown): Promise<ToolResult> => {
    return handleDeleteRequest(client, args);
  };

  return {
    tool,
    handler
  };
}