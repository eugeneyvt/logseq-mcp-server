/**
 * Block Retrieval Operations
 * Focused retrieval functionality for individual blocks and page blocks
 */

import { logger } from '../../utils/system/logger.js';
import { ErrorCode, createStructuredError } from '../../utils/system/errors.js';
import { SecureValidationHelpers } from '../../utils/validation.js';
import type { PerformanceAwareLogseqClient } from "../../adapters/client.js";

/**
 * Find child blocks of a parent block
 */
function findChildBlocks(allBlocks: unknown[], parentUuid: string): unknown[] {
  return allBlocks.filter(block => {
    if (!(block && typeof block === 'object' && 'parent' in block)) {return false;}
    const parent = (block as { parent?: { uuid?: string } }).parent;
    return parent?.uuid === parentUuid;
  });
}

/**
 * Block retrieval options
 */
export interface BlockRetrievalOptions {
  includeChildren?: boolean;
  includeProperties?: boolean;
  format?: 'tree' | 'flat';
  depth?: number;
  previewLength?: number;
}

/**
 * Get a specific block by UUID with enhanced options
 */
export async function getBlock(
  perfClient: PerformanceAwareLogseqClient,
  blockUuid: string,
  options: BlockRetrievalOptions = {}
): Promise<unknown> {
  try {
    const blockUuidError = SecureValidationHelpers.validateBlockUuid(blockUuid);
    if (blockUuidError) {
      return { error: blockUuidError };
    }

    logger.debug({ blockUuid }, 'Getting block');
    
    const block = await perfClient.getBlockCached(blockUuid);
    
    if (!block) {
      return {
        error: createStructuredError(ErrorCode.NOT_FOUND, {
          type: 'block',
          target: blockUuid,
          suggestion: 'Check block UUID or use search to find blocks'
        })
      };
    }

    // Build base block data
    const blockData: Record<string, unknown> = {
      uuid: block.uuid,
      content: block.content,
      page: block.page,
      parent: block.parent,
      format: block.format,
      created: block['created-at'],
      updated: block['updated-at']
    };

    // Include properties if requested (default true)
    if (options.includeProperties !== false) {
      blockData.properties = block.properties || {};
    }

    // Include children if requested
    if (options.includeChildren && block.page?.name) {
      const allBlocks = await perfClient.getPageBlocksTreeCached(block.page.name);
      const childBlocks = findChildBlocks([...allBlocks], blockUuid);
      blockData.children = childBlocks; // TODO: Format according to options
      blockData.children_count = childBlocks.length;
    }

    return blockData;
  } catch (error) {
    logger.error({ blockUuid, error }, 'Failed to get block');
    return {
      error: createStructuredError(ErrorCode.INTERNAL, {
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}

/**
 * Get all blocks for a specific page
 */
export async function getPageBlocks(
  perfClient: PerformanceAwareLogseqClient,
  pageName: string
): Promise<unknown> {
  try {
    const pageNameError = SecureValidationHelpers.validatePageName(pageName);
    if (pageNameError) {
      return { error: pageNameError };
    }

    logger.debug({ pageName }, 'Getting page blocks');
    
    const blocks = await perfClient.getPageBlocksTreeCached(pageName);
    
    return {
      page: pageName,
      blocks: blocks.map(block => ({
        uuid: block.uuid,
        content: block.content,
        properties: block.properties,
        parent: block.parent,
        children: block.children?.map(child => ({
          uuid: child.uuid,
          content: child.content,
          properties: child.properties
        })),
        createdAt: block['created-at'],
        updatedAt: block['updated-at']
      })),
      count: blocks.length
    };
  } catch (error) {
    logger.error({ pageName, error }, 'Failed to get page blocks');
    return {
      error: createStructuredError(ErrorCode.INTERNAL, {
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}

/**
 * Get multiple blocks by UUIDs with enhanced options
 */
export async function getBlocks(
  perfClient: PerformanceAwareLogseqClient,
  blockUuids: string[],
  options: BlockRetrievalOptions = {}
): Promise<{ data: unknown[]; truncated: boolean }> {
  const results = [];
  
  for (const blockUuid of blockUuids) {
    const result = await getBlock(perfClient, blockUuid, options);
    results.push(result);
  }
  
  return { data: results, truncated: false }; // Blocks don't have content truncation like pages
}