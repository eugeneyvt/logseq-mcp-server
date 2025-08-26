/**
 * Search Tool (Thin Handler)
 * Unified Search Tool Implementation - Advanced multi-modal search with filtering and pagination
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { LogseqClient } from '../../logseq-client.js';
import type { ToolResult } from '../../types.js';
import { searchToolSchema } from './schema.js';
import { handleSearchRequest } from './handler.js';

/**
 * Create the unified search tool
 */
export function createSearchTool(client: LogseqClient): {
  tool: Tool;
  handler: (args: unknown) => Promise<ToolResult>;
} {
  const tool: Tool = {
    name: 'search',
    description: 'Advanced search across all Logseq content with filtering, sorting, and pagination. Supports pages, blocks, templates, tasks with sophisticated filters for dates, properties, relationships, and content.',
    inputSchema: searchToolSchema
  };

  const handler = async (args: unknown): Promise<ToolResult> => {
    return handleSearchRequest(client, args);
  };

  return {
    tool,
    handler
  };
}