/**
 * Template Update Operations
 * Focused operations for updating existing templates
 */

import { logger } from '../../utils/system/logger.js';
import { ErrorCode, createStructuredError } from '../../utils/system/errors.js';
import { SecureValidationHelpers } from '../../utils/validation.js';
import type { LogseqClient } from '../../logseq-client.js';
import type { EditParams } from '../../validation/schemas.js';
import { isLogseqPage, type LogseqPage } from '../../schemas/types.js';
import type { BlockNode } from '../../parsers/index.js';
import { markdownToBlocks } from '../../parsers/index.js';

/**
 * Update an existing template
 */
export async function updateTemplate(client: LogseqClient, params: EditParams): Promise<unknown> {
  try {
    // Find existing template
    const allPages = await client.getAllPages();
    if (!Array.isArray(allPages)) {
      return {
        error: createStructuredError(ErrorCode.INTERNAL, {
          error: 'Failed to get pages from client'
        })
      };
    }
    
    const templateName = params.templateName || (Array.isArray(params.target) ? params.target[0] : params.target);
    const template = allPages.find((p: unknown): p is LogseqPage => {
      if (!isLogseqPage(p)) {return false;}
      
      // Match by name or template property
      if (p.name === templateName) {return true;}
      if (p.name && String(p.name).toLowerCase().includes(String(templateName).toLowerCase())) {return true;}
      
      const props = p.properties as Record<string, unknown> | undefined;
      return props?.template === templateName;
    });

    if (!template) {
      return {
        error: createStructuredError(ErrorCode.NOT_FOUND, {
          type: 'template',
          target: templateName,
          suggestion: 'Use create operation to add new templates'
        })
      };
    }

    // Get template content blocks
    const blocks = await client.getPageBlocksTree(String(template.name));
    if (!Array.isArray(blocks)) {
      return {
        error: createStructuredError(ErrorCode.INTERNAL, {
          error: 'Failed to get template blocks'
        })
      };
    }

    // Find template root (with template::) and content blocks (backward-compat)
    const templateRoot = blocks.find((b: unknown) => {
      const bo = b as Record<string, unknown>;
      return typeof bo?.content === 'string' && /\btemplate::/i.test(String(bo.content));
    }) as Record<string, unknown> | undefined;

    const contentBlocks = blocks.filter((block: unknown) => {
      if (!(block && typeof block === 'object' && 'content' in block)) {return false;}
      const blockContent = (block as { content?: string }).content;
      return blockContent && !/\btemplate::/i.test(blockContent);
    });

    if (contentBlocks.length === 0 && !(templateRoot && Array.isArray(templateRoot.children) && templateRoot.children.length > 0)) {
      return {
        error: createStructuredError(ErrorCode.NOT_FOUND, {
          type: 'template content',
          target: templateName,
          suggestion: 'Template has no content blocks to update'
        })
      };
    }

    // Parse new content into a single-root tree and sanitize
    const parse = params.control?.parseMarkdown ?? true;
    const roots: BlockNode[] = parse && params.content
      ? markdownToBlocks(String(params.content))
      : (params.content ? [{ text: String(params.content), children: [] }] : []);

    let singleRoot: BlockNode | null = null;
    if (roots.length === 0) {
      singleRoot = { text: '', children: [] };
    } else if (roots.length === 1) {
      singleRoot = roots[0];
    } else {
      const [first, ...rest] = roots;
      singleRoot = { text: first.text, children: [...(first.children || []), ...rest] };
    }

    const sanitizeNode = (n: BlockNode): BlockNode => {
      const v = SecureValidationHelpers.validateAndSanitizeBlockContent(n.text || '', true);
      const text = v.sanitizedContent || (n.text || '');
      return { text, children: (n.children || []).map(sanitizeNode) };
    };
    const safeRoot = sanitizeNode(singleRoot);

    if (params.dryRun) {
      return {
        action: 'update_template',
        template: templateName,
        current_blocks: contentBlocks.length,
        new_root_text: safeRoot.text,
        new_children_count: (safeRoot.children || []).length,
        single_block_enforced: true,
        dry_run: true
      };
    }

    // Determine template root, or create one if legacy
    let rootUuid: string | undefined;
    if (templateRoot && typeof templateRoot.uuid === 'string') {
      rootUuid = templateRoot.uuid as string;
    } else {
      const created = await client.callApi('logseq.Editor.insertBlock', [
        String(template.name),
        `template:: ${templateName}`,
        { sibling: false }
      ]);
      if (created && typeof created === 'object' && 'uuid' in created) {
        rootUuid = String((created as { uuid: unknown }).uuid);
      } else if (typeof created === 'string') {
        rootUuid = created;
      }
    }

    if (!rootUuid) {
      return { error: createStructuredError(ErrorCode.INTERNAL, { error: 'Failed to determine template root' }) };
    }

    // Remove existing children under template
    if (templateRoot && Array.isArray(templateRoot.children)) {
      for (const child of templateRoot.children as Array<Record<string, unknown>>) {
        const uuid = typeof child.uuid === 'string' ? child.uuid : undefined;
        if (uuid) {
          await client.callApi('logseq.Editor.removeBlock', [uuid]);
        }
      }
    } else {
      for (const b of contentBlocks as Array<Record<string, unknown>>) {
        const uuid = typeof b.uuid === 'string' ? String(b.uuid) : undefined;
        if (uuid) {
          await client.callApi('logseq.Editor.removeBlock', [uuid]);
        }
      }
    }

    // Insert new content as children of the template root
    const { insertBlockTree } = await import('../blocks/insert-tree.js');
    const children: BlockNode[] = [];
    if (safeRoot.text && safeRoot.text.trim().length > 0) {
      children.push({ text: safeRoot.text, children: safeRoot.children || [] });
    } else {
      children.push(...(safeRoot.children || []));
    }
    if (children.length > 0) {
      await insertBlockTree(client, rootUuid, { parent_block_id: rootUuid }, children);
    }

    const placeholders = extractPlaceholdersInTree(safeRoot);

    return {
      template_name: templateName,
      template_page: template.name,
      updated_root: rootUuid,
      content_children: children.length,
      placeholders,
      single_block_enforced: true
    };
  } catch (error) {
    logger.error({ params, error }, 'Failed to update template');
    return {
      error: createStructuredError(ErrorCode.INTERNAL, {
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}

/**
 * Extract template placeholders from content
 */
function extractPlaceholders(content: string): string[] {
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const placeholders: string[] = [];
  let match;
  
  while ((match = placeholderRegex.exec(content)) !== null) {
    if (!placeholders.includes(match[1])) {
      placeholders.push(match[1]);
    }
  }
  
  return placeholders;
}

function extractPlaceholdersInTree(node: BlockNode): string[] {
  const set = new Set<string>();
  const addAll = (text: string) => {
    for (const p of extractPlaceholders(text)) {
      set.add(p);
    }
  };
  const walk = (n: BlockNode) => {
    if (n.text) {
      addAll(n.text);
    }
    for (const c of n.children || []) {
      walk(c);
    }
  };
  walk(node);
  return Array.from(set);
}
