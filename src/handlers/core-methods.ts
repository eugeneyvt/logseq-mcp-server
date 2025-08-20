/**
 * Core Methods Implementation (Modular Design)
 *
 * This module consolidates all the modular handlers into the core methods design:
 * - System operations (get_system_info)
 * - Page operations (ensure_page, get_page, set_page_content, set_page_properties)
 * - Block operations (append_blocks, update_block, move_block)
 * - Search operations (search)
 * - Graph/Context operations (build_graph_map, suggest_placement, plan_content, batch)
 *
 * Each category is implemented in its own modular file for better maintainability.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { LogseqClient } from '../logseq-client.js';
import { createSystemHandlers } from './system-handlers.js';
import { createPageHandlers } from './page-handlers.js';
import { createBlockHandlers } from './block-handlers.js';
import { createSearchHandlers } from './search-handlers.js';
import { createGraphHandlers } from './graph-handlers.js';
import type { ToolResult } from './common.js';

/**
 * Create core methods using modular handlers
 */
export function createCoreMethods(client: LogseqClient): {
  tools: Tool[];
  handlers: Record<string, (args: unknown) => Promise<ToolResult>>;
} {
  // Create handlers from modular components
  const systemModule = createSystemHandlers(client);
  const pageModule = createPageHandlers(client);
  const blockModule = createBlockHandlers(client);
  const searchModule = createSearchHandlers(client);
  const graphModule = createGraphHandlers(client);

  // Combine all tools
  const tools: Tool[] = [
    ...systemModule.tools,
    ...pageModule.tools,
    ...blockModule.tools,
    ...searchModule.tools,
    ...graphModule.tools,
  ];

  // Combine all handlers
  const handlers = {
    ...systemModule.handlers,
    ...pageModule.handlers,
    ...blockModule.handlers,
    ...searchModule.handlers,
    ...graphModule.handlers,
  };

  return { tools, handlers };
}