import type { StandardResponse, ErrorCode } from '../schemas/logseq.js';

/**
 * Tool result format for MCP
 */
export interface ToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

/**
 * Generate a standard response
 */
export function createResponse<T>(data: T): StandardResponse<T> {
  return { ok: true, data };
}

/**
 * Generate a standard error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  hint?: string
): StandardResponse<never> {
  return { ok: false, error: { code, message, hint } };
}