/**
 * Page Operations
 * Create, update, delete page operations
 */

import { logger } from '../../utils/system/logger.js';
import { ErrorCode, createStructuredError } from '../../utils/system/errors.js';
import { SecureValidationHelpers } from '../../utils/validation.js';
import { parseMarkdownToLogseqBlocks } from '../../parsers/index.js';
import type { LogseqClient } from '../../logseq-client.js';
import type { EditParams } from "../../validation/schemas.js";
import type { PerformanceAwareLogseqClient } from '../../adapters/client.js';

/**
 * Main page edit dispatcher
 */
export async function editPage(client: LogseqClient, params: EditParams): Promise<unknown> {
  switch (params.operation) {
    case 'create':
      return await createPage(client, params);
    case 'update':
      return await updatePage(client, params);
    case 'append':
      return await appendToPage(client, params);
    case 'prepend':
      return await prependToPage(client, params);
    default:
      return {
        error: createStructuredError(ErrorCode.INVALID_COMBINATION, {
          type: 'page',
          operation: params.operation,
          validOps: ['create', 'update', 'append', 'prepend']
        })
      };
  }
}

async function createPage(client: LogseqClient, params: EditParams): Promise<unknown> {
  try {
    const targetName = Array.isArray(params.target) ? params.target[0] : params.target;
    const pageNameError = SecureValidationHelpers.validatePageName(targetName);
    if (pageNameError) {
      return { error: pageNameError };
    }

    if (params.dryRun) {
      return {
        action: 'create_page',
        name: params.target,
        content: params.content,
        dry_run: true
      };
    }

    // Always create page first without embedding content (avoids "content::" property)
    await client.callApi('logseq.Editor.createPage', [targetName]);

    // Remove initial empty block if Logseq created one
    try {
      const initialBlocks = await client.getPageBlocksTree(targetName);
      if (Array.isArray(initialBlocks) && initialBlocks.length > 0) {
        const first = initialBlocks[0] as Record<string, unknown>;
        const firstUuid = typeof first.uuid === 'string' ? first.uuid : undefined;
        const firstContent = typeof first.content === 'string' ? first.content : '';
        if (firstUuid && (!firstContent || firstContent.trim().length === 0)) {
          await client.callApi('logseq.Editor.removeBlock', [firstUuid]);
        }
      }
    } catch {
      // Best-effort cleanup; ignore errors
    }

    // If content provided, insert as block(s) under the page
    if (params.content) {
      const parse = params.control?.parseMarkdown ?? true;
      const contentStr = String(params.content);

      if (parse) {
        // Build recursive block tree and insert under the page
        const { markdownToBlocks } = await import('../../parsers/index.js');
        const roots = markdownToBlocks(contentStr);
        const { insertBlockTree } = await import('../blocks/insert-tree.js');
        await insertBlockTree(client, targetName, { parent_block_id: targetName }, roots);
      } else {
        const contentValidation = SecureValidationHelpers.validateAndSanitizeBlockContent(contentStr, true);
        if (contentValidation.error) {
          return { error: contentValidation.error };
        }
        await client.callApi('logseq.Editor.insertBlock', [
          targetName,
          contentValidation.sanitizedContent,
          { sibling: false }
        ]);
      }
    }

    return {
      page_name: targetName,
      content: params.content,
      created: true
    };
  } catch (error) {
    logger.error({ params, error }, 'Failed to create page');
    return {
      error: createStructuredError(ErrorCode.INTERNAL, {
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}

async function updatePage(client: LogseqClient, params: EditParams): Promise<unknown> {
  // Update page content by replacing existing blocks
  try {
    const parse = params.control?.parseMarkdown ?? true;
    if (params.dryRun) {
      return {
        action: 'update_page',
        name: params.target,
        content: params.content,
        dry_run: true
      };
    }

    // Replace all root blocks on the page if content provided
    if (params.content) {
      const pageName = Array.isArray(params.target) ? params.target[0] : params.target;
      // clear existing blocks
      const blocks = await client.getPageBlocksTree(pageName);
      if (Array.isArray(blocks)) {
        for (const b of blocks) {
          const uuid = b && typeof b === 'object' && 'uuid' in b ? String((b as { uuid: unknown }).uuid) : undefined;
          if (uuid) {
            await client.callApi('logseq.Editor.removeBlock', [uuid]);
          }
        }
      }

      const contentStr = String(params.content);
      if (parse) {
        const { markdownToBlocks } = await import('../../parsers/index.js');
        const { insertBlockTree } = await import('../blocks/insert-tree.js');
        const roots = markdownToBlocks(contentStr);
        await insertBlockTree(client, pageName, { parent_block_id: pageName }, roots);
      } else {
        const contentValidation = SecureValidationHelpers.validateAndSanitizeBlockContent(contentStr, true);
        if (contentValidation.error) {
          return { error: contentValidation.error };
        }
        await client.callApi('logseq.Editor.insertBlock', [
          pageName,
          contentValidation.sanitizedContent,
          { sibling: false }
        ]);
      }
    }

    return {
      page_name: params.target,
      content: params.content,
      updated: true
    };
  } catch (error) {
    logger.error({ params, error }, 'Failed to update page');
    return {
      error: createStructuredError(ErrorCode.INTERNAL, {
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}

async function appendToPage(client: LogseqClient, params: EditParams): Promise<unknown> {
  try {
    if (params.dryRun) {
      return {
        action: 'append_to_page',
        name: params.target,
        content: params.content,
        dry_run: true
      };
    }

    // Ensure page exists
    const pageName = Array.isArray(params.target) ? params.target[0] : params.target;
    const page = await client.getPage(pageName);
    if (!page || typeof page !== 'object') {
      return {
        error: createStructuredError(ErrorCode.NOT_FOUND, {
          type: 'page',
          target: pageName,
          suggestion: 'Create the page first or choose an existing page'
        })
      };
    }

    const parse = params.control?.parseMarkdown ?? true;
    const contentStr = String(params.content || '');

    if (parse) {
      const logseqBlocks = parseMarkdownToLogseqBlocks(contentStr);
      let lastUuid: string | undefined;
      for (const b of logseqBlocks) {
        const target = lastUuid || (Array.isArray(params.target) ? params.target[0] : params.target);
        const created = await client.callApi('logseq.Editor.insertBlock', [
          target,
          b.content,
          lastUuid ? { sibling: true } : { sibling: false }
        ]);
        const uuid = created && typeof created === 'object' && 'uuid' in created ? String((created as { uuid: unknown }).uuid) : undefined;
        if (uuid && b.children && b.children.length) {
          let lastChild: string | undefined;
          for (const c of b.children) {
            const childTarget = lastChild || uuid;
            const createdChild = await client.callApi('logseq.Editor.insertBlock', [
              childTarget,
              c.content,
              lastChild ? { sibling: true } : { sibling: false }
            ]);
            const childUuid = createdChild && typeof createdChild === 'object' && 'uuid' in createdChild ? String((createdChild as { uuid: unknown }).uuid) : undefined;
        if (childUuid) {
          lastChild = childUuid;
        }
          }
        }
        lastUuid = uuid || lastUuid;
      }
      return {
        page_name: params.target,
        appended_blocks: logseqBlocks.length
      };
    }

    const contentValidation = SecureValidationHelpers.validateAndSanitizeBlockContent(contentStr, true);
    if (contentValidation.error) {
      return { error: contentValidation.error };
    }

    // Reuse first empty block if present
    const existing = await client.getPageBlocksTree(pageName);
    let appendedUuid: string | undefined;
    if (Array.isArray(existing) && existing.length > 0) {
      const first = existing[0] as Record<string, unknown>;
      const firstUuid = typeof first.uuid === 'string' ? first.uuid : undefined;
      const firstContent = typeof first.content === 'string' ? first.content : '';
      if (firstUuid && (!firstContent || firstContent.trim().length === 0)) {
        await client.callApi('logseq.Editor.updateBlock', [firstUuid, contentValidation.sanitizedContent]);
        appendedUuid = firstUuid;
      }
    }
    if (!appendedUuid) {
      const result = await client.callApi('logseq.Editor.insertBlock', [
        pageName,
        contentValidation.sanitizedContent,
        { sibling: false }
      ]);
      if (result && typeof result === 'object' && 'uuid' in result) {
        appendedUuid = String((result as { uuid: unknown }).uuid);
      }
    }

    return {
      page_name: pageName,
      appended_block: appendedUuid,
      content: contentValidation.sanitizedContent
    };
  } catch (error) {
    logger.error({ params, error }, 'Failed to append to page');
    return {
      error: createStructuredError(ErrorCode.INTERNAL, {
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}

async function prependToPage(client: LogseqClient, params: EditParams): Promise<unknown> {
  try {
    const targetName = Array.isArray(params.target) ? params.target[0] : params.target;
    
    if (params.dryRun) {
      return {
        action: 'prepend_to_page',
        name: targetName,
        content: params.content,
        dry_run: true
      };
    }

    // Ensure page exists
    const page = await client.getPage(targetName);
    if (!page || typeof page !== 'object') {
      return {
        error: createStructuredError(ErrorCode.NOT_FOUND, {
          type: 'page',
          target: targetName,
          suggestion: 'Create the page first or choose an existing page'
        })
      };
    }

    const parse = params.control?.parseMarkdown ?? true;
    const contentStr = String(params.content || '');

    // Get existing blocks to place before the first
    const blocks = await client.getPageBlocksTree(targetName);
    const firstBlockUuid = Array.isArray(blocks) && blocks.length > 0 && blocks[0] && typeof blocks[0] === 'object' && 'uuid' in blocks[0] 
      ? String((blocks[0] as { uuid: unknown }).uuid) : null;

    if (parse) {
      const logseqBlocks = parseMarkdownToLogseqBlocks(contentStr);
      let anchor = firstBlockUuid || targetName;
      let lastInserted: string | null = null;
      for (const b of logseqBlocks) {
        const created = await client.callApi('logseq.Editor.insertBlock', [
          anchor,
          b.content,
          firstBlockUuid ? { sibling: true, before: true } : { sibling: false }
        ]);
        const uuid = created && typeof created === 'object' && 'uuid' in created ? String((created as { uuid: unknown }).uuid) : undefined;
        if (uuid && b.children && b.children.length) {
          let lastChild: string | undefined;
          for (const c of b.children) {
            const childTarget = lastChild || uuid;
            const createdChild = await client.callApi('logseq.Editor.insertBlock', [
              childTarget,
              c.content,
              lastChild ? { sibling: true } : { sibling: false }
            ]);
            const childUuid = createdChild && typeof createdChild === 'object' && 'uuid' in createdChild ? String((createdChild as { uuid: unknown }).uuid) : undefined;
            if (childUuid) {
              lastChild = childUuid;
            }
          }
        }
        lastInserted = uuid || lastInserted;
        // Subsequent inserts should go after the newly inserted block
        if (lastInserted) {
          anchor = lastInserted;
        }
      }
      return {
        page_name: targetName,
        prepended_blocks: logseqBlocks.length
      };
    }

    const contentValidation = SecureValidationHelpers.validateAndSanitizeBlockContent(contentStr, true);
    if (contentValidation.error) {
      return { error: contentValidation.error };
    }

    const insertOptions = firstBlockUuid 
      ? { sibling: true, before: true }
      : { sibling: false };
    const targetForInsertion = firstBlockUuid || targetName;

    const block = await client.callApi('logseq.Editor.insertBlock', [
      targetForInsertion,
      contentValidation.sanitizedContent,
      insertOptions
    ]);

    return {
      page_name: targetName,
      prepended_block: block && typeof block === 'object' && 'uuid' in block 
        ? String((block as { uuid: unknown }).uuid)
        : undefined,
      content: contentValidation.sanitizedContent
    };
  } catch (error) {
    logger.error({ params, error }, 'Failed to prepend to page');
    return {
      error: createStructuredError(ErrorCode.INTERNAL, {
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}

/**
 * Delete a page
 */
export async function deletePage(
  client: LogseqClient, 
  pageName: string, 
  cascade = false
): Promise<unknown> {
  try {
    const pageNameError = SecureValidationHelpers.validatePageName(pageName);
    if (pageNameError) {
      return { error: pageNameError };
    }

    await client.callApi('logseq.Editor.deletePage', [pageName]);

    return {
      page_name: pageName,
      deleted: true,
      cascade
    };
  } catch (error) {
    logger.error({ pageName, error }, 'Failed to delete page');
    return {
      error: createStructuredError(ErrorCode.INTERNAL, {
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}

/**
 * Page deletion impact analysis
 */
export interface PageDeletionImpact {
  title: string;
  dependencies: string[];
  cascaded_items: Array<{ id: string; type: string; reason: string }>;
  orphaned_references: string[];
  impact_score: number;
}

/**
 * Analyze page deletion impact
 */
export async function analyzePageDeletionImpact(
  perfClient: PerformanceAwareLogseqClient,
  pageName: string,
  cascade = false
): Promise<PageDeletionImpact> {
  
  const page = await perfClient.getPageCached(pageName);
  if (!page) {
    throw new Error(`Page "${pageName}" not found`);
  }

  const impact: PageDeletionImpact = {
    title: pageName,
    dependencies: [],
    cascaded_items: [],
    orphaned_references: [],
    impact_score: 1
  };

  // Get all blocks in the page
  const blocks = await perfClient.getPageBlocksTreeCached(pageName);
  if (blocks && blocks.length > 0) {
    impact.impact_score += blocks.length * 0.1; // Each block adds to impact
    
    if (cascade) {
      blocks.forEach((block) => {
        impact.cascaded_items.push({
          id: String(block.uuid),
          type: 'block',
          reason: 'Child block of deleted page'
        });
      });
    }
  }

  // Find backlinks using Relations entity
  const { findEntityBacklinks } = await import('../relations/operations.js');
  const backlinks = await findEntityBacklinks(perfClient, pageName, 'page');
  const backlinkIds = backlinks.map(rel => rel.sourceId);
  impact.orphaned_references.push(...backlinkIds);
  impact.impact_score += backlinks.length * 0.5; // Backlinks increase impact significantly

  // Check if it's a journal page (higher impact)
  if (page['journal?']) {
    impact.impact_score += 2;
  }

  return impact;
}

/**
 * Archive a page (soft delete)
 */
export async function archivePage(
  client: LogseqClient,
  pageName: string
): Promise<unknown> {
  try {
    const pageNameError = SecureValidationHelpers.validatePageName(pageName);
    if (pageNameError) {
      return { error: pageNameError };
    }

    // Resolve first block UUID to store archive property
    const blocks = await client.getPageBlocksTree(pageName);
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return {
        error: createStructuredError(ErrorCode.GRAPH_CONSISTENCY, {
          type: 'page',
          target: pageName,
          reason: 'Page has no root blocks to attach properties',
          suggestion: 'Open the page in Logseq to initialize it, then retry'
        })
      };
    }
    const first = blocks[0] as Record<string, unknown>;
    const rootUuid = typeof first.uuid === 'string' ? first.uuid : undefined;
    if (!rootUuid) {
      return { error: createStructuredError(ErrorCode.INTERNAL, { error: 'Missing root block uuid' }) };
    }

    await client.callApi('logseq.Editor.upsertBlockProperty', [
      rootUuid,
      'archived',
      true
    ]);

    return {
      page_name: pageName,
      archived: true
    };
  } catch (error) {
    logger.error({ pageName, error }, 'Failed to archive page');
    return {
      error: createStructuredError(ErrorCode.INTERNAL, {
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}
