/**
 * Edit Tool (Thin Handler)
 * Unified Edit Tool Implementation - Create, modify, append, move, and transform content
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { LogseqClient } from '../../logseq-client.js';
import type { ToolResult } from '../../types.js';
import { editToolSchema } from './schema.js';
import { handleEditRequest } from './handler.js';

/**
 * Create the unified edit tool
 */
export function createEditTool(client: LogseqClient): {
  tool: Tool;
  handler: (args: unknown) => Promise<ToolResult>;
} {
  const tool: Tool = {
    name: 'edit',
    description: 'Create, modify, append, move content across all types. Supports pages, blocks, templates (single-block enforced), properties, relations, tasks with precise positioning and validation.\n\nBlock Operations:\n- Create: Use page name as target + position for placement\n- Update/Move: Use block UUID as target (required)\n- Position: Specify after_block_id, before_block_id, or parent_block_id\n\nProperty Operations:\n- Use propertyKey and propertyValue parameters (not content)\n- Target can be page name or block UUID\n- Example: {"type": "properties", "operation": "create", "target": "My Page", "propertyKey": "tags", "propertyValue": ["project", "important"]}\n\nBulk Operations: Pass array of targets for batch processing.',
    inputSchema: editToolSchema
  };

  const handler = async (args: unknown): Promise<ToolResult> => {
    return handleEditRequest(client, args);
  };

  return {
    tool,
    handler
  };
}