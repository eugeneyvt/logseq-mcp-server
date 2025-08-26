/**
 * Get Tool Formatting Module
 * Contains response formatting functions for different data types
 */

import type { LogseqClient } from '../../logseq-client.js';
import { logger } from '../../utils/system/logger.js';

export type Format = 'tree' | 'flat';

/**
 * Format blocks according to the specified format and depth
 */
export function formatBlocks(blocks: unknown[], format: Format, depth: number, previewLength: number): unknown[] {
  if (format === 'flat') {
    return flattenBlocks(blocks, previewLength);
  }
  
  // Tree format - maintain hierarchical structure
  return blocks.map(block => formatBlockWithChildren(block, depth, previewLength));
}

/**
 * Flatten blocks recursively to create a flat list
 */
function flattenBlocks(blocks: unknown[], previewLength: number): unknown[] {
  const flattened: unknown[] = [];
  
  function processBlock(block: unknown) {
    if (block && typeof block === 'object') {
      // Add current block (formatted without children)
      flattened.push(formatSingleBlock(block, previewLength));
      
      // Process children recursively
      const children = (block as { children?: unknown[] }).children;
      if (Array.isArray(children)) {
        children.forEach(processBlock);
      }
    }
  }
  
  blocks.forEach(processBlock);
  return flattened;
}

/**
 * Format a single block with preview length limiting
 */
function formatSingleBlock(block: unknown, previewLength: number): unknown {
  if (!(block && typeof block === 'object')) {
    return { uuid: '', content: '', page: null, parent: null };
  }
  const b = block as Record<string, unknown>;
  
  const formatted: Record<string, unknown> = {
    uuid: b.uuid || '',
    content: b.content ? truncateText(String(b.content), previewLength) : '',
    page: b.page,
    parent: b.parent
  };
  
  if (b.properties && Object.keys(b.properties).length > 0) {
    formatted.properties = b.properties;
  }
  
  if (b.createdAt) {formatted.createdAt = b.createdAt;}
  if (b.updatedAt) {formatted.updatedAt = b.updatedAt;}
  
  return formatted;
}

/**
 * Format a block with its children in tree structure
 */
function formatBlockWithChildren(block: unknown, depth: number, previewLength: number): unknown {
  if (!(block && typeof block === 'object')) {
    return { uuid: '', content: '', page: null, parent: null };
  }
  const b = block as Record<string, unknown>;
  
  const formatted = formatSingleBlock(b, previewLength) as Record<string, unknown>;
  
  if (depth > 1 && b.children && Array.isArray(b.children) && b.children.length > 0) {
    formatted.children = b.children.map((child: unknown) => 
      formatBlockWithChildren(child, depth - 1, previewLength)
    );
    formatted.children_count = b.children.length;
  } else if (b.children && Array.isArray(b.children)) {
    formatted.children_count = b.children.length;
  }
  
  return formatted;
}

/**
 * Find child blocks for a given parent UUID
 */
export function findChildBlocks(allBlocks: unknown[], parentUuid: string): unknown[] {
  return allBlocks.filter((block: unknown) => {
    if (!(block && typeof block === 'object' && 'parent' in block)) {
      return false;
    }
    return (block as { parent: unknown }).parent === parentUuid;
  });
}

/**
 * Extract template placeholders from template blocks
 */
export function extractTemplatePlaceholders(blocks: unknown[]): string[] {
  const placeholders = new Set<string>();
  
  for (const block of blocks) {
    const content = (block && typeof block === 'object' && 'content' in block) ? String((block as { content: unknown }).content) : '';
    const matches = content.match(/\{\{([^}]+)\}\}/g);
    
    if (matches) {
      for (const match of matches) {
        const placeholder = match.replace(/^\{\{|\}\}$/g, '').trim();
        placeholders.add(placeholder);
      }
    }
  }
  
  return Array.from(placeholders);
}

/**
 * Get page backlinks - DEPRECATED: Use Relations entity instead
 * @deprecated Use findEntityBacklinks from entities/relations
 */
export async function getPageBacklinks(__client: LogseqClient, _pageName: string): Promise<string[]> {
  logger.warn('getPageBacklinks is deprecated, use Relations entity instead');
  return [];
}

/**
 * Get page outgoing links (pages this page links to)
 */
export async function getPageOutgoingLinks(_client: LogseqClient, pageName: string): Promise<string[]> {
  // TODO: Implement outgoing link extraction
  // This would involve parsing page content for [[link]] patterns
  try {
    // For now, return empty array
    // Real implementation would parse all blocks for [[page]] references
    logger.debug({ pageName }, 'Outgoing link extraction not yet implemented');
    return [];
  } catch (error) {
    logger.warn({ error, pageName }, 'Failed to get outgoing links');
    return [];
  }
}

/**
 * Get related pages within specified depth
 */
export async function getRelatedPages(_client: LogseqClient, pageName: string, _depth: number): Promise<string[]> {
  // TODO: Implement related page discovery
  // This would involve graph traversal to find connected pages
  logger.debug({ pageName }, 'Related pages discovery not yet implemented');
  return [];
}

/**
 * Get tasks from a specific page
 */
export async function getPageTasks(_client: LogseqClient, pageName: string): Promise<unknown[]> {
  try {
    // This is a simplified implementation
    // Real implementation would traverse all blocks looking for task patterns
    logger.debug({ pageName }, 'Page task extraction not fully implemented');
    return [];
  } catch (error) {
    logger.warn({ error, pageName }, 'Failed to get page tasks');
    return [];
  }
}

/**
 * Check if a block is a task block
 */
export function isTaskBlock(block: unknown): boolean {
  const content = (block && typeof block === 'object' && 'content' in block) ? String((block as { content: unknown }).content) : '';
  const taskPattern = /^(TODO|DOING|DONE|WAITING|LATER|NOW|CANCELED)\s/;
  return taskPattern.test(content.trim());
}

/**
 * Format a task block with task-specific properties
 */
export function formatTaskBlock(block: unknown): unknown {
  if (!(block && typeof block === 'object')) {
    return { uuid: '', content: '', task_state: '', page: null };
  }
  const b = block as Record<string, unknown>;
  const content = String(b.content || '');
  
  const taskMatch = content.match(/^(TODO|DOING|DONE|WAITING|LATER|NOW|CANCELED)\s(.*)$/);
  
  if (taskMatch) {
    return {
      ...(formatSingleBlock(block, 500) as Record<string, unknown>),
      task_state: taskMatch[1],
      task_content: taskMatch[2],
      is_task: true
    };
  }
  
  return formatSingleBlock(block, 500);
}

/**
 * Get task state counts from a list of tasks
 */
export function getTaskStateCounts(tasks: unknown[]): Record<string, number> {
  const counts: Record<string, number> = {};
  
  for (const task of tasks) {
    const state = (task && typeof task === 'object' && 'task_state' in task) ? String((task as { task_state: unknown }).task_state) : 'UNKNOWN';
    counts[state] = (counts[state] || 0) + 1;
  }
  
  return counts;
}

/**
 * Get namespace count - DEPRECATED: Use System entity instead
 * @deprecated Use collectSystemInfo from entities/system
 */
export function getNamespaceCount(pages: unknown[]): number {
  logger.warn('getNamespaceCount is deprecated, use System entity instead');
  const namespaces = new Set<string>();
  
  for (const page of pages) {
    const pageName = (page && typeof page === 'object' && 'name' in page) ? String((page as { name: unknown }).name) : '';
    if (pageName.includes('/')) {
      const namespace = pageName.split('/')[0];
      namespaces.add(namespace);
    }
  }
  
  return namespaces.size;
}

/**
 * Get namespaces - DEPRECATED: Use System entity instead
 * @deprecated Use collectSystemInfo from entities/system
 */
export function getNamespaces(pages: unknown[]): Record<string, number> {
  logger.warn('getNamespaces is deprecated, use System entity instead');
  const namespaces: Record<string, number> = {};
  
  for (const page of pages) {
    const pageName = (page && typeof page === 'object' && 'name' in page) ? String((page as { name: unknown }).name) : '';
    if (pageName.includes('/')) {
      const namespace = pageName.split('/')[0];
      namespaces[namespace] = (namespaces[namespace] || 0) + 1;
    } else {
      namespaces['root'] = (namespaces['root'] || 0) + 1;
    }
  }
  
  return namespaces;
}

/**
 * Get average connections - DEPRECATED: Use System entity instead
 * @deprecated Use collectSystemInfo from entities/system
 */
export async function getAverageConnections(__client: LogseqClient, _pages: unknown[]): Promise<number> {
  logger.warn('getAverageConnections is deprecated, use System entity instead');
  // TODO: Implement connection counting
  return 0;
}

/**
 * Calculate graph density - DEPRECATED: Use System entity instead
 * @deprecated Use collectSystemInfo from entities/system
 */
export function calculateGraphDensity(pages: unknown[]): number {
  logger.warn('calculateGraphDensity is deprecated, use System entity instead');
  const totalPages = pages.length;
  if (totalPages < 2) {return 0;}
  
  // Simplified calculation - would need actual link counting
  const maxConnections = totalPages * (totalPages - 1);
  const actualConnections = 0; // TODO: Count actual connections
  
  return actualConnections / maxConnections;
}

/**
 * Get top connected pages - DEPRECATED: Use Relations entity instead
 * @deprecated Use analyzeEntityRelations from entities/relations
 */
export async function getTopConnectedPages(_client: LogseqClient, pages: unknown[]): Promise<unknown[]> {
  logger.warn('getTopConnectedPages is deprecated, use Relations entity instead');
  // TODO: Implement connection counting and ranking
  return pages.slice(0, 10).map(page => ({
    ...(page && typeof page === 'object' ? page as Record<string, unknown> : {}),
    connection_count: 0
  }));
}

/**
 * Get recent activity - DEPRECATED: Use System entity instead
 * @deprecated Use collectSystemInfo from entities/system
 */
export function getRecentActivity(pages: unknown[]): unknown[] {
  logger.warn('getRecentActivity is deprecated, use System entity instead');
  return pages
    .filter(page => (page && typeof page === 'object' && 'updatedAt' in page && (page as { updatedAt: unknown }).updatedAt))
    .sort((a, b) => {
      const aDate = (a && typeof a === 'object' && 'updatedAt' in a) ? new Date(String((a as { updatedAt: unknown }).updatedAt)).getTime() : 0;
      const bDate = (b && typeof b === 'object' && 'updatedAt' in b) ? new Date(String((b as { updatedAt: unknown }).updatedAt)).getTime() : 0;
      return bDate - aDate;
    })
    .slice(0, 10);
}

/**
 * Get page neighborhood (connected pages)
 */
export async function getPageNeighborhood(_client: LogseqClient, pageName: string, _depth: number): Promise<unknown> {
  // TODO: Implement neighborhood discovery
  return {
    center: pageName,
    neighbors: [],
    depth: _depth
  };
}

/**
 * Truncate text to specified length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}