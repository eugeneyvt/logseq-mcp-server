/**
 * Shared Types
 * Common types used across the application
 */

/**
 * Tool result format for MCP
 */
export interface ToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}