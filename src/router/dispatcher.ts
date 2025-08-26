/**
 * Request Dispatcher
 * Central routing system for MCP tool requests with performance monitoring and error handling
 */

import type { LogseqClient } from '../logseq-client.js';
import type { ToolResult } from '../types.js';
import { logger } from '../utils/system/logger.js';
import { createStructuredError, ErrorCode } from '../utils/system/errors.js';
import { formatError } from '../utils/error-formatting.js';
import { withPerformanceMonitoring } from "../utils/performance/monitoring.js"

/**
 * Tool handler function type
 */
export type ToolHandler = (args: unknown) => Promise<ToolResult>;

/**
 * Tool registry entry
 */
export interface ToolEntry {
  name: string;
  description: string;
  handler: ToolHandler;
  schema: object;
}

/**
 * Request dispatcher for handling tool calls with comprehensive routing
 */
export class RequestDispatcher {
  private readonly tools = new Map<string, ToolEntry>();
  private readonly client: LogseqClient;

  constructor(client: LogseqClient) {
    this.client = client;
  }

  /**
   * Register a tool with the dispatcher
   */
  registerTool(entry: ToolEntry): void {
    if (this.tools.has(entry.name)) {
      logger.warn({ toolName: entry.name }, 'Tool already registered, overwriting');
    }
    
    this.tools.set(entry.name, entry);
    logger.debug({ toolName: entry.name }, 'Tool registered');
  }

  /**
   * Get all registered tools
   */
  getTools(): ToolEntry[] {
    return Array.from(this.tools.values());
  }

  /**
   * Dispatch a tool request with comprehensive error handling and monitoring
   */
  async dispatch(toolName: string, args: unknown): Promise<ToolResult> {
    logger.debug({ toolName, hasArgs: !!args }, 'Dispatching tool request');

    // Check if tool exists
    const tool = this.tools.get(toolName);
    if (!tool) {
      logger.warn({ toolName, availableTools: Array.from(this.tools.keys()) }, 'Tool not found');
      throw createStructuredError(
        ErrorCode.NOT_FOUND,
        { 
          target: toolName,
          type: 'tool'
        },
        `Tool "${toolName}" not found`,
        'Use one of the available tools from the list'
      );
    }

    try {
      // Execute with performance monitoring
      const monitoredHandler = withPerformanceMonitoring(
        `tool.${toolName}`,
        tool.handler
      );
      const result = await monitoredHandler(args ?? {});

      logger.info({ toolName }, 'Tool request completed successfully');
      return result;

    } catch (error) {
      logger.error(
        { 
          toolName, 
          error: formatError(error)
        }, 
        'Tool request failed'
      );

      // Re-throw structured errors as-is
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }

      // Wrap other errors
      throw createStructuredError(
        ErrorCode.INTERNAL,
        { 
          target: toolName,
          type: 'tool'
        },
        `Tool "${toolName}" failed: ${formatError(error)}`
      );
    }
  }

  /**
   * Get tool information
   */
  getToolInfo(toolName: string): ToolEntry | null {
    return this.tools.get(toolName) ?? null;
  }

  /**
   * Check if a tool is registered
   */
  hasTool(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * Get tool count
   */
  getToolCount(): number {
    return this.tools.size;
  }
}