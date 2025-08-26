/**
 * Tool Registry
 * Registration and management of available tools with metadata
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolHandler, ToolEntry } from './dispatcher.js';
import { logger } from '../utils/system/logger.js';
import { formatError } from '../utils/error-formatting.js';

/**
 * Tool factory function type
 */
export type ToolFactory = (client: unknown) => { tool: Tool; handler: ToolHandler };

/**
 * Tool registry for managing available tools and their metadata
 */
export class ToolRegistry {
  private readonly entries = new Map<string, ToolEntry>();
  private readonly factories = new Map<string, ToolFactory>();

  /**
   * Register a tool factory
   */
  registerFactory(name: string, factory: ToolFactory): void {
    if (this.factories.has(name)) {
      logger.warn({ toolName: name }, 'Tool factory already registered, overwriting');
    }
    
    this.factories.set(name, factory);
    logger.debug({ toolName: name }, 'Tool factory registered');
  }

  /**
   * Build all tools using registered factories
   */
  buildTools(client: unknown): ToolEntry[] {
    const entries: ToolEntry[] = [];
    
    for (const [name, factory] of this.factories) {
      try {
        const { tool, handler } = factory(client);
        
        const entry: ToolEntry = {
          name: tool.name,
          description: tool.description || 'No description available',
          handler,
          schema: tool.inputSchema || {}
        };

        entries.push(entry);
        this.entries.set(tool.name, entry);
        
        logger.debug({ toolName: tool.name }, 'Tool built successfully');
      } catch (error) {
        logger.error(
          { 
            factoryName: name, 
            error: formatError(error) 
          }, 
          'Failed to build tool'
        );
        // Continue with other tools
      }
    }

    logger.info({ toolCount: entries.length }, 'All tools built');
    return entries;
  }

  /**
   * Get built tool entry
   */
  getEntry(name: string): ToolEntry | undefined {
    return this.entries.get(name);
  }

  /**
   * Get all built entries
   */
  getAllEntries(): ToolEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Get tool names
   */
  getToolNames(): string[] {
    return Array.from(this.entries.keys());
  }

  /**
   * Check if tool exists
   */
  hasEntry(name: string): boolean {
    return this.entries.has(name);
  }

  /**
   * Clear all entries (for testing)
   */
  clear(): void {
    this.entries.clear();
    this.factories.clear();
  }
}