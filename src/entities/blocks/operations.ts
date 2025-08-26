/**
 * Block Operations Module
 * Create, update, move, and delete block operations
 */

import { logger } from '../../utils/system/logger.js';
import { ErrorCode, createStructuredError } from '../../utils/system/errors.js';
import { SecureValidationHelpers } from '../../utils/validation.js';
import { markdownToBlocks, renderBlocksFromMarkdown, type RenderMode } from '../../parsers/index.js';
import { insertBlockTree } from './insert-tree.js';
import type { LogseqClient } from '../../logseq-client.js';
import type { EditParams } from "../../validation/schemas.js";
import type { PerformanceAwareLogseqClient } from '../../adapters/client.js';

/**
 * Main block edit dispatcher
 */
export async function editBlock(client: LogseqClient, params: EditParams): Promise<unknown> {
  switch (params.operation) {
    case 'create':
      return await createBlock(client, params);
    case 'update':
      return await updateBlock(client, params);
    case 'move':
      return await moveBlock(client, params);
    case 'append':
      return await appendChildBlock(client, params);
    case 'prepend':
      return await prependChildBlock(client, params);
    default:
      return {
        error: createStructuredError(ErrorCode.INVALID_COMBINATION, {
          type: 'block',
          operation: params.operation,
          validOps: ['create', 'update', 'move', 'append', 'prepend']
        })
      };
  }
}

async function createBlock(client: LogseqClient, params: EditParams): Promise<unknown> {
  try {
    const contentValidation = SecureValidationHelpers.validateAndSanitizeBlockContent(String(params.content || ''), true);
    if (contentValidation.error) {
      return { error: contentValidation.error };
    }

    if (params.dryRun) {
      return {
        action: 'create_block',
        target: params.target,
        content: contentValidation.sanitizedContent,
        dry_run: true
      };
    }

    // Respect position when provided
    let anchor = params.target;
    let opts: { sibling: boolean; before?: boolean } = { sibling: false };
    if (params.position?.after_block_id) {
      anchor = params.position.after_block_id;
      opts = { sibling: true };
    } else if (params.position?.before_block_id) {
      anchor = params.position.before_block_id;
      opts = { sibling: true, before: true };
    } else if (params.position?.parent_block_id) {
      anchor = params.position.parent_block_id;
      opts = { sibling: false };
    }

    const newBlock = await client.callApi('logseq.Editor.insertBlock', [
      anchor,
      contentValidation.sanitizedContent,
      opts
    ]);

    return {
      created_block: newBlock && typeof newBlock === 'object' && 'uuid' in newBlock 
        ? String((newBlock as { uuid: unknown }).uuid)
        : undefined,
      content: contentValidation.sanitizedContent,
      parent: params.target
    };
  } catch (error) {
    logger.error({ params, error }, 'Failed to create block');
    return {
      error: createStructuredError(ErrorCode.INTERNAL, {
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}

async function updateBlock(client: LogseqClient, params: EditParams): Promise<unknown> {
  try {
    const parse = params.control?.parseMarkdown ?? true;
    const contentValidation = SecureValidationHelpers.validateAndSanitizeBlockContent(String(params.content || ''), true);
    if (contentValidation.error) {
      return { error: contentValidation.error };
    }

    if (params.dryRun) {
      return {
        action: 'update_block',
        target: params.target,
        content: contentValidation.sanitizedContent,
        dry_run: true
      };
    }

    if (parse && contentValidation.sanitizedContent) {
      const targetUuid = Array.isArray(params.target) ? params.target[0] : params.target;
      const mode: RenderMode = (params.control?.renderMode as RenderMode) || 'readable';
      const roots = renderBlocksFromMarkdown(
        contentValidation.sanitizedContent,
        mode,
        (md: string) => markdownToBlocks(md) as unknown as { text: string; children: { text: string; children: never[] }[] }[]
      );
      if (roots.length <= 1 && (roots[0]?.children?.length ?? 0) === 0) {
        await client.callApi('logseq.Editor.updateBlock', [targetUuid, roots[0]?.text ?? '']);
        return { updated_block: targetUuid, content: roots[0]?.text ?? '' };
      }
      // Multi-block update: replace current block with first, add children and siblings
      const first = roots[0];
      await client.callApi('logseq.Editor.updateBlock', [targetUuid, first.text]);
      if (first.children && first.children.length > 0) {
        await insertBlockTree(client, targetUuid, { parent_block_id: targetUuid }, first.children);
      }
      if (roots.length > 1) {
        await insertBlockTree(client, targetUuid, { after_block_id: targetUuid }, roots.slice(1));
      }
      return { updated_block: targetUuid, content_blocks: roots.length };
    } else {
      const targetUuid = Array.isArray(params.target) ? params.target[0] : params.target;
      await client.callApi('logseq.Editor.updateBlock', [targetUuid, contentValidation.sanitizedContent]);
      return {
        updated_block: targetUuid,
        content: contentValidation.sanitizedContent
      };
    }
  } catch (error) {
    logger.error({ params, error }, 'Failed to update block');
    return {
      error: createStructuredError(ErrorCode.INTERNAL, {
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}

async function moveBlock(client: LogseqClient, params: EditParams): Promise<unknown> {
  try {
    if (!params.position) {
      return {
        error: createStructuredError(ErrorCode.INVALID_ARGUMENT, {
          field: 'position',
          reason: 'Move operation requires position specification',
          suggestion: 'Provide after_block_id, before_block_id, or parent_block_id'
        })
      };
    }

    if (params.dryRun) {
      return {
        action: 'move_block',
        block: params.target,
        position: params.position,
        dry_run: true
      };
    }

    await client.callApi('logseq.Editor.moveBlock', [params.target, params.position]);

    return {
      moved_block: params.target,
      new_position: params.position
    };
  } catch (error) {
    logger.error({ params, error }, 'Failed to move block');
    return {
      error: createStructuredError(ErrorCode.INTERNAL, {
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}

async function appendChildBlock(client: LogseqClient, params: EditParams): Promise<unknown> {
  try {
    const parse = params.control?.parseMarkdown ?? true;
    if (params.dryRun) {
      return {
        action: 'append_child_block',
        parent: params.target,
        content: params.content,
        dry_run: true
      };
    }

    const contentStr = String(params.content || '');
    if (parse) {
      const roots = markdownToBlocks(contentStr);
      const targetUuid = Array.isArray(params.target) ? params.target[0] : params.target;
      // Insert as children under the target block
      await insertBlockTree(client, targetUuid, { parent_block_id: targetUuid }, roots);
      return {
        created_blocks: roots.length,
        parent: targetUuid
      };
    }

    const contentValidation = SecureValidationHelpers.validateAndSanitizeBlockContent(contentStr, true);
    if (contentValidation.error) {
      return { error: contentValidation.error };
    }

    const newBlock = await client.callApi('logseq.Editor.insertBlock', [
      params.target,
      contentValidation.sanitizedContent,
      { sibling: false }
    ]);

    return {
      created_block: newBlock && typeof newBlock === 'object' && 'uuid' in newBlock 
        ? String((newBlock as { uuid: unknown }).uuid)
        : undefined,
      content: contentValidation.sanitizedContent,
      parent: params.target
    };
  } catch (error) {
    logger.error({ params, error }, 'Failed to append child block');
    return {
      error: createStructuredError(ErrorCode.INTERNAL, {
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}

async function prependChildBlock(client: LogseqClient, params: EditParams): Promise<unknown> {
  try {
    const parse = params.control?.parseMarkdown ?? true;
    if (params.dryRun) {
      return {
        action: 'prepend_child_block',
        parent: params.target,
        content: params.content,
        dry_run: true
      };
    }

    const contentStr = String(params.content || '');
    if (parse) {
      const roots = markdownToBlocks(contentStr);
      const targetUuid = Array.isArray(params.target) ? params.target[0] : params.target;
      // Prepend by inserting each as sibling before the current first child
      await insertBlockTree(client, targetUuid, { parent_block_id: targetUuid }, roots);
      return {
        created_blocks: roots.length,
        parent: targetUuid
      };
    }

    const contentValidation = SecureValidationHelpers.validateAndSanitizeBlockContent(contentStr, true);
    if (contentValidation.error) {
      return { error: contentValidation.error };
    }

    const newBlock = await client.callApi('logseq.Editor.insertBlock', [
      params.target,
      contentValidation.sanitizedContent,
      { sibling: true, before: true }
    ]);

    return {
      created_block: newBlock && typeof newBlock === 'object' && 'uuid' in newBlock 
        ? String((newBlock as { uuid: unknown }).uuid)
        : undefined,
      content: contentValidation.sanitizedContent,
      parent: params.target
    };
  } catch (error) {
    logger.error({ params, error }, 'Failed to prepend child block');
    return {
      error: createStructuredError(ErrorCode.INTERNAL, {
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}

/**
 * Delete a block
 */
export async function deleteBlock(
  client: LogseqClient, 
  blockUuid: string, 
  cascade = false
): Promise<unknown> {
  try {
    const blockUuidError = SecureValidationHelpers.validateBlockUuid(blockUuid);
    if (blockUuidError) {
      return { error: blockUuidError };
    }

    await client.callApi('logseq.Editor.removeBlock', [blockUuid]);

    return {
      deleted_block: blockUuid,
      cascade
    };
  } catch (error) {
    logger.error({ blockUuid, error }, 'Failed to delete block');
    return {
      error: createStructuredError(ErrorCode.INTERNAL, {
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}

/**
 * Block deletion impact analysis
 */
export interface BlockDeletionImpact {
  title: string;
  dependencies: string[];
  cascaded_items: Array<{ id: string; type: string; reason: string }>;
  orphaned_references: string[];
  impact_score: number;
}

/**
 * Analyze block deletion impact
 */
export async function analyzeBlockDeletionImpact(
  perfClient: PerformanceAwareLogseqClient,
  blockUuid: string,
  cascade = false
): Promise<BlockDeletionImpact> {
  
  const block = await perfClient.getBlockCached(blockUuid);
  if (!block) {
    throw new Error(`Block "${blockUuid}" not found`);
  }

  const impact: BlockDeletionImpact = {
    title: (block.content?.slice(0, 50) || 'Empty block') + '...',
    dependencies: [],
    cascaded_items: [],
    orphaned_references: [],
    impact_score: 1
  };

  // Find child blocks
  const parentPage = block.page ? await perfClient.getPageCached(block.page.name) : null;
  if (parentPage) {
    const allBlocks = await perfClient.getPageBlocksTreeCached(parentPage.name);
    const childBlocks = findChildBlocks(allBlocks ? [...allBlocks] : [], blockUuid);
    
    if (childBlocks.length > 0) {
      impact.impact_score += childBlocks.length * 0.2;
      
      if (cascade) {
        childBlocks.forEach(child => {
          impact.cascaded_items.push({
            id: (child as Record<string, unknown>).uuid as string,
            type: 'block',
            reason: 'Child block of deleted block'
          });
        });
      }
    }
  }

  // Find block references using Relations entity
  const { findEntityBacklinks } = await import('../relations/operations.js');
  const references = await findEntityBacklinks(perfClient, blockUuid, 'block');
  const referenceIds = references.map(rel => rel.sourceId);
  impact.orphaned_references.push(...referenceIds);
  impact.impact_score += references.length * 0.3;

  return impact;
}

/**
 * Helper function to find child blocks
 */
function findChildBlocks(allBlocks: unknown[], parentUuid: string): unknown[] {
  return allBlocks.filter(block => {
    const parent = (block as Record<string, unknown>).parent as Record<string, unknown> | undefined;
    return parent?.uuid === parentUuid;
  });
}

/**
 * Archive a block (soft delete)
 */
export async function archiveBlock(
  client: LogseqClient,
  blockUuid: string
): Promise<unknown> {
  try {
    const blockUuidError = SecureValidationHelpers.validateBlockUuid(blockUuid);
    if (blockUuidError) {
      return { error: blockUuidError };
    }

    // Archive by adding archive property
    await client.callApi('logseq.Editor.upsertBlockProperty', [
      blockUuid,
      'archived',
      true
    ]);

    return {
      block_uuid: blockUuid,
      archived: true
    };
  } catch (error) {
    logger.error({ blockUuid, error }, 'Failed to archive block');
    return {
      error: createStructuredError(ErrorCode.INTERNAL, {
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}
