/**
 * Template Creation Operations
 * Focused operations for creating new templates
 */

import { logger } from '../../utils/system/logger.js';
import { ErrorCode, createStructuredError } from '../../utils/system/errors.js';
import { formatError } from '../../utils/error-formatting.js';
import { SecureValidationHelpers } from '../../utils/validation.js';
import { markdownToBlocks } from '../../parsers/index.js';
import type { BlockNode } from '../../parsers/index.js';
import type { LogseqClient } from '../../logseq-client.js';
import type { EditParams } from '../../validation/schemas.js';

/**
 * Create a new template (enforces single-block rule)
 */
export async function createTemplate(client: LogseqClient, params: EditParams): Promise<unknown> {
  try {
    // Handle two scenarios:
    // 1. Template Definition: Creating new template (requires content)
    // 2. Template Instantiation: Using existing template with variables (requires templateName)
    
    if (params.templateName && !params.content) {
      // Scenario 2: Template Instantiation
      return await instantiateTemplate(client, params);
    }
    
    // Scenario 1: Template Definition - build a single-root tree (one root block with optional nested children)
    let templateContent: string;
    
    if (!params.content) {
      return {
        error: createStructuredError(ErrorCode.INVALID_ARGUMENT, {
          reason: 'Content required for template definition',
          suggestion: 'Provide content to define a new template, or templateName + variables to instantiate existing template'
        })
      };
    }
    
    if (Array.isArray(params.content)) {
      if (params.content.length > 1) {
        return {
          error: createStructuredError(ErrorCode.TEMPLATE_INVALID, {
            reason: 'Multi-block content rejected - Templates must be single blocks only',
            suggestion: 'Join multiple blocks with newlines in a single block. Use \\ for line breaks instead of separate blocks.',
            block_count: params.content.length
          })
        };
      }
      templateContent = params.content[0] || '';
    } else {
      templateContent = String(params.content || '');
    }
    
    // Parse provided markdown into a block tree; allow nested blocks under a single root
    const parse = params.control?.parseMarkdown ?? true;
    const roots: BlockNode[] = parse && templateContent
      ? markdownToBlocks(templateContent)
      : (templateContent ? [{ text: templateContent, children: [] }] : []);

    // Normalize to a single-root construction: if multiple roots, wrap by using first as root and others as its children
    let singleRoot: BlockNode | null = null;
    if (roots.length === 0) {
      singleRoot = { text: '', children: [] };
    } else if (roots.length === 1) {
      singleRoot = roots[0];
    } else {
      const [first, ...rest] = roots;
      singleRoot = { text: first.text, children: [...(first.children || []), ...rest] };
    }

    // Sanitize block texts for safety
    const sanitizeNode = (n: BlockNode): BlockNode => {
      const validation = SecureValidationHelpers.validateAndSanitizeBlockContent(n.text || '', true);
      const text = validation.sanitizedContent || (n.text || '');
      return {
        text,
        children: (n.children || []).map(sanitizeNode)
      };
    };
    const safeRoot = sanitizeNode(singleRoot);
    
    if (params.dryRun) {
      return { 
        action: 'create_template', 
        name: params.target,
        content: templateContent,
        single_block_enforced: true,
        dry_run: true 
      };
    }
    
    // Determine template name
    const actualTemplateName = params.templateName || (Array.isArray(params.target) ? params.target[0] : params.target);
    let templatePageName = actualTemplateName;
    if (!templatePageName.toLowerCase().includes('template')) {
      templatePageName = `${actualTemplateName} Template`;
    }
    
    logger.debug({
      templateName: actualTemplateName,
      templatePageName,
      content: templateContent
    }, 'Creating template');

    // Create template page
    await client.callApi('logseq.Editor.createPage', [templatePageName]);

    // Ensure we don't leave an initial empty block: replace it with the template root
    const existing = await client.getPageBlocksTree(templatePageName);
    let rootUuid: string | undefined;
    if (Array.isArray(existing) && existing.length > 0) {
      const first = existing[0] as Record<string, unknown>;
      const firstUuid = typeof first.uuid === 'string' ? first.uuid : undefined;
      const firstContent = typeof first.content === 'string' ? first.content : '';
      if (firstUuid && (!firstContent || firstContent.trim().length === 0)) {
        // Update the empty first block to become the template root (property only)
        await client.callApi('logseq.Editor.updateBlock', [firstUuid, `template:: ${actualTemplateName}`]);
        rootUuid = firstUuid;
      }
    }
    if (!rootUuid) {
      // Insert new root block
      const created = await client.callApi('logseq.Editor.insertBlock', [
        templatePageName,
        `template:: ${actualTemplateName}`,
        { sibling: false }
      ]);
      if (created && typeof created === 'object' && 'uuid' in created) {
        rootUuid = String((created as { uuid: unknown }).uuid);
      } else if (typeof created === 'string') {
        rootUuid = created;
      }
    }

    // Insert template content as children of the template root (single-root enforcement)
    if (rootUuid && (safeRoot.text || (safeRoot.children && safeRoot.children.length))) {
      // If the root has its own text, insert it as first child under template root
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
    }

    // Extract placeholders for reporting
    const placeholders = extractPlaceholdersInTree(safeRoot);
    
    return {
      template_name: actualTemplateName,
      template_page: templatePageName,
      block_uuid: rootUuid,
      content: safeRoot.text,
      placeholders: placeholders,
      single_block_enforced: true
    };
  } catch (error) {
    logger.error({ params, error }, 'Failed to create template');
    return {
      error: createStructuredError(ErrorCode.INTERNAL, {
        error: formatError(error)
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

// Removed old sanitize/normalize helpers now that single-root parsing handles structure

/**
 * Instantiate an existing template with variable substitution
 */
async function instantiateTemplate(client: LogseqClient, params: EditParams): Promise<unknown> {
  const templateName = params.templateName!;
  
  try {
    // Delegate to insertTemplate (append-only semantics)
    const { insertTemplate } = await import('./insert.js');
    return await insertTemplate(client, params);
  } catch (error) {
    logger.error({ templateName, params, error }, 'Failed to instantiate template');
    return {
      error: createStructuredError(ErrorCode.INTERNAL, {
        error: formatError(error)
      })
    };
  }
}
