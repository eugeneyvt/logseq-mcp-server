/**
 * Template Insertion Operations
 * Focused operations for inserting templates into pages
 */

import { logger } from '../../utils/system/logger.js';
import { ErrorCode, createStructuredError } from '../../utils/system/errors.js';
import type { LogseqClient } from '../../logseq-client.js';
import type { EditParams } from '../../validation/schemas.js';
import { isLogseqPage, type LogseqPage } from '../../schemas/types.js';
import type { BlockNode } from '../../parsers/index.js';
import { SecureValidationHelpers } from '../../utils/validation.js';

/**
 * Insert template into a page
 */
export async function insertTemplate(client: LogseqClient, params: EditParams): Promise<unknown> {
  try {
    const templateName = params.templateName;
    if (!templateName) {
      return {
        error: createStructuredError(ErrorCode.INVALID_ARGUMENT, {
          field: 'templateName',
          reason: 'Template name required for insertion',
          suggestion: 'Provide templateName parameter'
        })
      };
    }

    // Defensive: require explicit target page
    const targetName = String(Array.isArray(params.target) ? params.target[0] : params.target || '').trim();
    if (!targetName) {
      return {
        error: createStructuredError(ErrorCode.INVALID_ARGUMENT, {
          field: 'target',
          reason: 'Target page is required to insert a template',
          suggestion: 'Specify the existing page name to append the template to'
        })
      };
    }

    // Get all pages to find the template
    const allPages = await client.getAllPages();
    if (!Array.isArray(allPages)) {
      return {
        error: createStructuredError(ErrorCode.INTERNAL, {
          error: 'Failed to get pages from client'
        })
      };
    }

    // Find template page
    const templatePage = allPages.find((p: unknown): p is LogseqPage => {
      if (!isLogseqPage(p)) {return false;}
      
      const props = p.properties as Record<string, unknown> | undefined;
      return props?.template === templateName ||
             p.name === templateName ||
             p.name === `${templateName} Template`;
    });

    if (!templatePage) {
      return {
        error: createStructuredError(ErrorCode.NOT_FOUND, {
          type: 'template',
          target: templateName,
          suggestion: 'Create the template first using create operation'
        })
      };
    }

    // Get template blocks
    const blocks = await client.getPageBlocksTree(templatePage.name!);
    if (!Array.isArray(blocks)) {
      return {
        error: createStructuredError(ErrorCode.INTERNAL, {
          error: 'Failed to get template blocks'
        })
      };
    }

    // Find the template root (block with template:: property)
    const templateRoot = blocks.find((b: unknown) => {
      const bo = b as Record<string, unknown>;
      return typeof bo?.content === 'string' && /\btemplate::/i.test(String(bo.content));
    }) as Record<string, unknown> | undefined;

    // Build content nodes: children of the template root; fallback to first non-template block
    let nodes: BlockNode[] = [];
    if (templateRoot && Array.isArray(templateRoot.children) && templateRoot.children.length > 0) {
      const toNode = (blk: Record<string, unknown>): BlockNode => ({
        text: String(blk.content || ''),
        children: Array.isArray(blk.children) ? blk.children.map((c) => toNode(c as Record<string, unknown>)) : []
      });
      nodes = (templateRoot.children as unknown[]).map((c) => toNode(c as Record<string, unknown>));
    } else {
      const contentBlocks = blocks.filter((block: unknown) => {
        const bo = block as Record<string, unknown>;
        return typeof bo?.content === 'string' && !/\btemplate::/i.test(String(bo.content));
      }) as Array<Record<string, unknown>>;
      if (contentBlocks.length > 0) {
        nodes = [{ text: String(contentBlocks[0].content || ''), children: [] }];
      }
    }

    if (nodes.length === 0) {
      return {
        error: createStructuredError(ErrorCode.NOT_FOUND, {
          type: 'template content',
          target: templateName,
          suggestion: 'Template has no content to insert'
        })
      };
    }

    // Apply variable substitutions recursively
    const applyVars = (n: BlockNode): BlockNode => {
      let text = n.text || '';
      if (params.variables && typeof params.variables === 'object') {
        for (const [key, value] of Object.entries(params.variables)) {
          const regex = new RegExp(`\\{\\{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g');
          text = text.replace(regex, String(value));
        }
      }
      // sanitize
      const v = SecureValidationHelpers.validateAndSanitizeBlockContent(text, true);
      const safe = v.sanitizedContent || text;
      return {
        text: safe,
        children: (n.children || []).map(applyVars)
      };
    };
    const safeNodes = nodes.map(applyVars);

    // Ensure target page exists; do not create it implicitly
    const targetPage = await client.getPage(targetName);
    if (!targetPage || typeof targetPage !== 'object') {
      return {
        error: createStructuredError(ErrorCode.NOT_FOUND, {
          type: 'page',
          target: targetName,
          suggestion: 'Create the page first or specify another existing page to append the template to'
        })
      };
    }

    if (params.dryRun) {
      return {
        action: 'insert_template',
        template: templateName,
        target_page: targetName,
        content_blocks: safeNodes.length,
        variables_applied: Object.keys(params.variables || {}).length,
        dry_run: true
      };
    }

    // Determine append position: end of page, avoiding a first empty block
    const pageBlocks = await client.getPageBlocksTree(targetName);
    let firstUuid: string | undefined;
    let firstContent = '';
    let lastRootUuid: string | undefined;
    if (Array.isArray(pageBlocks) && pageBlocks.length > 0) {
      const first = pageBlocks[0] as Record<string, unknown>;
      firstUuid = typeof first.uuid === 'string' ? first.uuid : undefined;
      firstContent = typeof first.content === 'string' ? first.content : '';
      const last = pageBlocks[pageBlocks.length - 1] as Record<string, unknown>;
      lastRootUuid = typeof last.uuid === 'string' ? last.uuid : undefined;
    }

    let insertedRootUuids: string[] = [];
    const { insertBlockTree } = await import('../blocks/insert-tree.js');

    if (firstUuid && (!firstContent || firstContent.trim().length === 0)) {
      // Reuse the initial empty block as the first inserted root
      await client.callApi('logseq.Editor.updateBlock', [firstUuid, safeNodes[0].text]);
      insertedRootUuids.push(firstUuid);
      // Insert children under this block
      if (safeNodes[0].children && safeNodes[0].children.length > 0) {
        await insertBlockTree(client, firstUuid, { parent_block_id: firstUuid }, safeNodes[0].children);
      }
      // Insert remaining nodes as siblings after
      if (safeNodes.length > 1) {
        const rest = safeNodes.slice(1);
        const created = await insertBlockTree(client, firstUuid, { after_block_id: firstUuid }, rest);
        insertedRootUuids = insertedRootUuids.concat(created);
      }
    } else if (lastRootUuid) {
      // Append all nodes after the last root block
      insertedRootUuids = await insertBlockTree(client, lastRootUuid, { after_block_id: lastRootUuid }, safeNodes);
    } else {
      // Fallback: insert under page anchor
      insertedRootUuids = await insertBlockTree(client, targetName, undefined, safeNodes);
    }

    return {
      template_name: templateName,
      target_page: targetName,
      inserted_blocks: insertedRootUuids,
      variables_substituted: Object.keys(params.variables || {}).length
    };
  } catch (error) {
    logger.error({ params, error }, 'Failed to insert template');
    return {
      error: createStructuredError(ErrorCode.INTERNAL, {
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}
