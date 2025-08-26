/**
 * Page Retrieval Operations
 * Focused retrieval functionality for pages
 */

import { logger } from '../../utils/system/logger.js';
import { ErrorCode, createStructuredError } from '../../utils/system/errors.js';
import { SecureValidationHelpers } from '../../utils/validation.js';
import type { PerformanceAwareLogseqClient } from "../../adapters/client.js";

/**
 * Enhanced page retrieval options
 */
export interface PageRetrievalOptions {
  includeChildren?: boolean;
  includeBacklinks?: boolean;
  includeContent?: boolean;
  includeProperties?: boolean;
  format?: 'tree' | 'flat';
  depth?: number;
  previewLength?: number;
}

/**
 * Safely format date values, handling invalid dates
 */
function formatDateSafely(dateValue: unknown): string | undefined {
  if (!dateValue) {
    return undefined;
  }
  
  try {
    const date = new Date(dateValue as string | number);
    if (isNaN(date.getTime())) {
      return undefined;
    }
    return date.toISOString();
  } catch {
    return undefined;
  }
}

/**
 * Get a specific page by name with enhanced options
 */
export async function getPage(
  perfClient: PerformanceAwareLogseqClient,
  pageName: string,
  options: PageRetrievalOptions = {}
): Promise<unknown> {
  try {
    const pageNameError = SecureValidationHelpers.validatePageName(pageName);
    if (pageNameError) {
      return { error: pageNameError };
    }

    logger.debug({ pageName }, 'Getting page');
    
    const page = await perfClient.getPageCached(pageName);
    
    if (!page) {
      return {
        error: createStructuredError(ErrorCode.NOT_FOUND, {
          type: 'page',
          target: pageName,
          suggestion: 'Check page name or create the page first'
        })
      };
    }

    // Build base page data
    const pageData: Record<string, unknown> = {
      name: page.name,
      id: page.id,
      journal: page['journal?'] || false,
      created: formatDateSafely(page.createdAt),
      updated: formatDateSafely(page.updatedAt)
    };

    // Include properties if requested (default true)
    if (options.includeProperties !== false) {
      pageData.properties = page.properties || {};
    }

    // Include children (blocks) if requested
    if (options.includeChildren) {
      const blocks = await perfClient.getPageBlocksTreeCached(pageName);
      if (blocks) {
        // TODO: Move formatBlocks to entities (currently in tools)
        pageData.blocks = blocks; // Simplified for now
        pageData.block_count = blocks.length;
      }
    }

    // Include content preview if requested (default true)
    if (options.includeContent !== false) {
      const blocks = await perfClient.getPageBlocksTreeCached(pageName);
      if (blocks && blocks.length > 0) {
        const content = blocks.map((b: unknown) => 
          (b && typeof b === 'object' && 'content' in b) ? String((b as { content: unknown }).content) : ''
        ).filter(Boolean).join('\n');
        
        const previewLength = options.previewLength || 500;
        pageData.content_preview = content.slice(0, previewLength);
        pageData.content_truncated = content.length > previewLength;
      }
    }

    // Include backlinks if requested
    if (options.includeBacklinks) {
      // Delegate to Relations entity
      const backlinks = await getPageBacklinks(perfClient, pageName);
      pageData.backlinks = backlinks;
    }

    return pageData;
  } catch (error) {
    logger.error({ pageName, error }, 'Failed to get page');
    return {
      error: createStructuredError(ErrorCode.INTERNAL, {
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}

/**
 * Get multiple pages by names with enhanced options
 */
export async function getPages(
  perfClient: PerformanceAwareLogseqClient,
  pageNames: string[],
  options: PageRetrievalOptions = {}
): Promise<{ data: unknown[]; truncated: boolean }> {
  const results = [];
  let truncated = false;

  for (const pageName of pageNames) {
    const result = await getPage(perfClient, pageName, options);
    results.push(result);
    
    // Check for truncation
    if (result && typeof result === 'object' && 'content_truncated' in result && result.content_truncated) {
      truncated = true;
    }
  }

  return { data: results, truncated };
}

/**
 * Get all available pages
 */
export async function getAllPages(perfClient: PerformanceAwareLogseqClient): Promise<unknown[]> {
  try {
    const pages = await perfClient.getAllPagesCached();
    
    return pages.map(page => ({
      name: page.name,
      uuid: page.uuid,
      properties: page.properties,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
      journalDay: page.journalDay,
      isJournal: page['journal?'] || false
    }));
  } catch (error) {
    logger.error({ error }, 'Failed to get all pages');
    return [];
  }
}

/**
 * Get page backlinks
 */
export async function getPageBacklinks(_client: unknown, _pageName: string): Promise<string[]> {
  // Placeholder implementation
  return [];
}

/**
 * Get page outgoing links
 */
export async function getPageOutgoingLinks(_client: unknown, _pageName: string): Promise<string[]> {
  // Extract [[page]] references from content
  // const linkRegex = /\[\[([^\]]+)\]\]/g;  // TODO: implement link extraction
  const links: string[] = [];
  
  // This would need to fetch page content and extract links
  // Simplified implementation
  return links;
}

/**
 * Get tasks from a page
 */
export async function getPageTasks(_client: unknown, _pageName: string): Promise<unknown[]> {
  // This would extract TODO/DONE items from page blocks
  // Simplified implementation
  return [];
}