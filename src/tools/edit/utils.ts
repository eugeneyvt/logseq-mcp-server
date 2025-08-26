/**
 * Edit Tool Utilities Module
 * Shared utility functions for edit operations
 */

import type { LogseqClient } from '../../logseq-client.js';
import { logger } from '../../utils/system/logger.js';
import { parseMarkdownToLogseqStringBlocks } from '../../parsers/index.js';
import type { ToolResult } from '../../types.js';
import type { EditParams } from '../../validation/schemas.js';

/**
 * Resolve target to block UUID (handles both page names and block UUIDs)
 */
export async function resolveTarget(client: LogseqClient, target: string): Promise<string> {
  // If target looks like a UUID (length >= 32, contains hyphens), assume it's already a block UUID
  if (target.length >= 32 && target.includes('-')) {
    return target;
  }
  
  // Try to resolve as page name - get the page's first block
  try {
    const page = await client.getPage(target);
    if (page) {
      const blocks = await client.getPageBlocksTree(target);
      if (blocks && blocks.length > 0) {
        const firstBlock = blocks[0];
        return (firstBlock && typeof firstBlock === 'object' && 'uuid' in firstBlock) ? String((firstBlock as { uuid: unknown }).uuid) : target;
      }
    }
  } catch {
    // If page doesn't exist, assume target is already a block UUID
  }
  
  return target;
}

/**
 * Resolve block target for positioning operations
 */
export async function resolveBlockTarget(client: LogseqClient, target: string): Promise<string> {
  // First try as UUID
  if (target.length >= 32 && target.includes('-')) {
    return target;
  }
  
  // Try as page name
  try {
    const page = await client.getPage(target);
    if (page) {
      // Return page name for block creation on page
      return target;
    }
  } catch {
    // Continue to try as UUID
  }
  
  return target;
}

/**
 * Process content with optional markdown parsing
 */
export function processContentForMarkdown(content: string, parseMarkdown: boolean): string[] {
  if (!parseMarkdown) {
    return [content];
  }
  
  try {
    const blocks = parseMarkdownToLogseqStringBlocks(content);
    return blocks.filter(block => block.trim().length > 0);
  } catch (error) {
    logger.warn({ error }, 'Failed to parse markdown, using content as single block');
    return [content];
  }
}

/**
 * Generate state hash for idempotency checking
 */
export async function generateStateHash(client: LogseqClient, params: EditParams): Promise<string> {
  const stateData = {
    type: params.type,
    operation: params.operation,
    target: params.target,
    content: String(params.content || '').substring(0, 100) // First 100 chars for hash
  };
  return JSON.stringify(stateData);
}

/**
 * Idempotency entry interface
 */
export interface IdempotencyEntry {
  params: EditParams;
  result: unknown;
  timestamp: number;
  stateHash: string;
}

// Idempotency store (in-memory for now, could be moved to persistent storage)
const idempotencyStore = new Map<string, IdempotencyEntry>();

/**
 * Check if operation was already performed (idempotency)
 */
export function checkIdempotency(key: string, currentParams: EditParams): unknown | null {
  const entry = idempotencyStore.get(key);
  if (!entry) {
    return null;
  }
  
  // Check if entry is still valid (1 hour TTL)
  const now = Date.now();
  if (now - entry.timestamp > 3600000) {
    idempotencyStore.delete(key);
    return null;
  }
  
  // Verify parameters match (simple comparison)
  const currentState = {
    type: currentParams.type,
    operation: currentParams.operation,
    target: currentParams.target,
    content: String(currentParams.content || '').substring(0, 100)
  };
  const currentStateHash = JSON.stringify(currentState);
  
  if (entry.stateHash === currentStateHash) {
    logger.info({ key }, 'Returning cached idempotent result');
    return entry.result;
  }
  
  return null;
}

/**
 * Store result for idempotency checking
 */
export function storeIdempotencyResult(key: string, params: EditParams, result: unknown): void {
  const stateData = {
    type: params.type,
    operation: params.operation,
    target: params.target,
    content: String(params.content || '').substring(0, 100)
  };
  
  const entry: IdempotencyEntry = {
    params,
    result,
    timestamp: Date.now(),
    stateHash: JSON.stringify(stateData)
  };
  
  idempotencyStore.set(key, entry);
  logger.debug({ key }, 'Stored idempotency result');
}

/**
 * Create error result for tool responses
 */
export function createErrorResult(error: unknown): ToolResult {
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        error: {
          code: (error && typeof error === 'object' && 'code' in error) ? String((error as { code: unknown }).code) : 'UNKNOWN',
          message: (error && typeof error === 'object' && 'message' in error) ? String((error as { message: unknown }).message) : String(error),
          hint: (error && typeof error === 'object' && 'hint' in error) ? String((error as { hint: unknown }).hint) : '',
          details: (error && typeof error === 'object' && 'details' in error) ? (error as { details: unknown }).details : null
        }
      }, null, 2)
    }]
  };
}