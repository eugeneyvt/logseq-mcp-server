/**
 * Tag Operations
 * CRUD operations for tag management across Logseq content
 */

import type { LogseqClient } from '../../logseq-client.js';
import { logger } from '../../utils/system/logger.js';
import { ErrorCode, createStructuredError } from '../../utils/system/errors.js';
import { extractAllTags, normalizeTag } from './extraction.js';
import { SecureValidationHelpers } from '../../utils/validation.js';

/**
 * Add tags to a page or block
 */
export async function addTags(
  client: LogseqClient, 
  targetId: string, 
  tagsToAdd: string[], 
  options: { 
    method?: 'property' | 'content';
    position?: 'start' | 'end';
  } = {}
): Promise<{ success: boolean; addedTags: string[]; error?: unknown }> {
  try {
    const method = options.method || 'property';
    const normalizedTags = tagsToAdd.map(normalizeTag);
    const resolved = await resolveToBlockUuid(client, targetId);
    if ('error' in resolved) {
      return { success: false, addedTags: [], error: resolved.error };
    }
    const blockUuid = resolved.blockUuid;
    
    if (method === 'property') {
      return await addTagsToProperty(client, blockUuid, normalizedTags);
    } else {
      return await addTagsToContent(client, blockUuid, normalizedTags, options.position || 'end');
    }
  } catch (error) {
    logger.error({ targetId, tagsToAdd, error }, 'Failed to add tags');
    return {
      success: false,
      addedTags: [],
      error: createStructuredError(ErrorCode.INTERNAL, {
        operation: 'add_tags',
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}

/**
 * Remove tags from a page or block
 */
export async function removeTags(
  client: LogseqClient, 
  targetId: string, 
  tagsToRemove: string[], 
  options: { 
    method?: 'property' | 'content' | 'both';
  } = {}
): Promise<{ success: boolean; removedTags: string[]; error?: unknown }> {
  try {
    const method = options.method || 'both';
    const normalizedTags = tagsToRemove.map(normalizeTag);
    const removedTags: string[] = [];
    const resolved = await resolveToBlockUuid(client, targetId);
    if ('error' in resolved) {
      return { success: false, removedTags: [], error: resolved.error };
    }
    const blockUuid = resolved.blockUuid;
    
    if (method === 'property' || method === 'both') {
      const propertyResult = await removeTagsFromProperty(client, blockUuid, normalizedTags);
      removedTags.push(...propertyResult.removedTags);
    }
    
    if (method === 'content' || method === 'both') {
      const contentResult = await removeTagsFromContent(client, blockUuid, normalizedTags);
      removedTags.push(...contentResult.removedTags);
    }
    
    return {
      success: true,
      removedTags: [...new Set(removedTags)] // Remove duplicates
    };
  } catch (error) {
    logger.error({ targetId, tagsToRemove, error }, 'Failed to remove tags');
    return {
      success: false,
      removedTags: [],
      error: createStructuredError(ErrorCode.INTERNAL, {
        operation: 'remove_tags',
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}

/**
 * Replace all tags on a page or block
 */
export async function replaceTags(
  client: LogseqClient, 
  targetId: string, 
  newTags: string[]
): Promise<{ success: boolean; oldTags: string[]; newTags: string[]; error?: unknown }> {
  try {
    const resolved = await resolveToBlockUuid(client, targetId);
    if ('error' in resolved) {
      return { success: false, oldTags: [], newTags: [], error: resolved.error };
    }
    const blockUuid = resolved.blockUuid;
    // First, get current tags
    const currentItem = await getItemById(client, blockUuid);
    if (!currentItem) {
      return {
        success: false,
        oldTags: [],
        newTags: [],
        error: createStructuredError(ErrorCode.NOT_FOUND, {
          target: targetId,
          type: 'item'
        })
      };
    }
    
    const oldTags = extractAllTags(currentItem);
    const normalizedNewTags = newTags.map(normalizeTag);
    
    // Remove all existing tags
    await removeTags(client, blockUuid, oldTags, { method: 'both' });
    
    // Add new tags
    const addResult = await addTags(client, blockUuid, normalizedNewTags, { method: 'property' });
    
    return {
      success: addResult.success,
      oldTags,
      newTags: normalizedNewTags,
      error: addResult.error
    };
  } catch (error) {
    logger.error({ targetId, newTags, error }, 'Failed to replace tags');
    return {
      success: false,
      oldTags: [],
      newTags: [],
      error: createStructuredError(ErrorCode.INTERNAL, {
        operation: 'replace_tags',
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}

/**
 * Get all tags for a specific item
 */
export async function getTagsForItem(
  client: LogseqClient, 
  targetId: string
): Promise<{ tags: string[]; error?: unknown }> {
  try {
    const resolved = await resolveToBlockUuid(client, targetId);
    if ('error' in resolved) {
      return { tags: [], error: resolved.error };
    }
    const item = await getItemById(client, resolved.blockUuid);
    if (!item) {
      return {
        tags: [],
        error: createStructuredError(ErrorCode.NOT_FOUND, {
          target: targetId,
          type: 'item'
        })
      };
    }
    
    return {
      tags: extractAllTags(item)
    };
  } catch (error) {
    logger.error({ targetId, error }, 'Failed to get tags for item');
    return {
      tags: [],
      error: createStructuredError(ErrorCode.INTERNAL, {
        operation: 'get_tags',
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}

/**
 * Private helper functions
 */

async function addTagsToProperty(
  client: LogseqClient, 
  targetId: string, 
  tags: string[]
): Promise<{ success: boolean; addedTags: string[] }> {
  // Get current tags property
  const currentProps = await client.callApi('logseq.Editor.getBlockProperties', [targetId]) as Record<string, unknown>;
  const currentTags = Array.isArray(currentProps?.tags) ? currentProps.tags as string[] : [];
  
  // Merge with new tags (avoid duplicates)
  const allTags = [...new Set([...currentTags, ...tags])];
  
  // Update the tags property
  await client.callApi('logseq.Editor.upsertBlockProperty', [targetId, 'tags', allTags]);
  
  return {
    success: true,
    addedTags: tags.filter(tag => !currentTags.includes(tag))
  };
}

async function addTagsToContent(
  client: LogseqClient, 
  targetId: string, 
  tags: string[], 
  position: 'start' | 'end'
): Promise<{ success: boolean; addedTags: string[] }> {
  // Get current block content
  const block = await client.callApi('logseq.Editor.getBlock', [targetId]) as Record<string, unknown>;
  const currentContent = (block?.content as string) || '';
  const missing: string[] = [];
  for (const t of tags) {
    const ht = new RegExp(`#${t}\\b`, 'i');
    const pr = new RegExp(`\\[\\[${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\]`, 'i');
    if (!ht.test(currentContent) && !pr.test(currentContent)) {
      missing.push(t);
    }
  }
  if (missing.length === 0) {
    return { success: true, addedTags: [] };
  }
  
  // Add hashtags to content
  const hashTags = missing.map(tag => `#${tag}`).join(' ');
  let newContent = position === 'start' 
    ? `${hashTags} ${currentContent}`.trim()
    : `${currentContent} ${hashTags}`.trim();

  // Sanitize combined content
  const v = SecureValidationHelpers.validateAndSanitizeBlockContent(newContent, true);
  newContent = v.sanitizedContent || newContent;
  
  // Update block content
  await client.callApi('logseq.Editor.updateBlock', [targetId, newContent]);
  
  return {
    success: true,
    addedTags: missing
  };
}

async function removeTagsFromProperty(
  client: LogseqClient, 
  targetId: string, 
  tagsToRemove: string[]
): Promise<{ removedTags: string[] }> {
  const currentProps = await client.callApi('logseq.Editor.getBlockProperties', [targetId]) as Record<string, unknown>;
  const currentTags = Array.isArray(currentProps?.tags) ? currentProps.tags as string[] : [];
  
  const filteredTags = currentTags.filter((tag: string) => !tagsToRemove.includes(normalizeTag(tag)));
  const removedTags = currentTags.filter((tag: string) => tagsToRemove.includes(normalizeTag(tag)));
  
  // Update the tags property
  await client.callApi('logseq.Editor.upsertBlockProperty', [targetId, 'tags', filteredTags]);
  
  return { removedTags };
}

async function removeTagsFromContent(
  client: LogseqClient, 
  targetId: string, 
  tagsToRemove: string[]
): Promise<{ removedTags: string[] }> {
  const block = await client.callApi('logseq.Editor.getBlock', [targetId]) as Record<string, unknown>;
  const currentContent = (block?.content as string) || '';
  
  let newContent = currentContent;
  const removedTags: string[] = [];
  
  tagsToRemove.forEach(tag => {
    const hashTagPattern = new RegExp(`#${tag}\\b`, 'gi');
    if (hashTagPattern.test(newContent)) {
      newContent = newContent.replace(hashTagPattern, '').replace(/\s+/g, ' ').trim();
      removedTags.push(tag);
    }
    // Also remove page-ref tags [[tag]]
    const pageTagPattern = new RegExp(`\\[\\[${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\]`, 'gi');
    if (pageTagPattern.test(newContent)) {
      newContent = newContent.replace(pageTagPattern, '').replace(/\s+/g, ' ').trim();
      if (!removedTags.includes(tag)) {
        removedTags.push(tag);
      }
    }
  });
  // Sanitize combined content
  const v = SecureValidationHelpers.validateAndSanitizeBlockContent(newContent, true);
  const safe = v.sanitizedContent || newContent;
  if (safe !== currentContent) {
    await client.callApi('logseq.Editor.updateBlock', [targetId, safe]);
  }
  
  return { removedTags };
}

async function getItemById(client: LogseqClient, targetId: string): Promise<Record<string, unknown> | null> {
  try {
    // Try as block UUID first
    if (targetId.length >= 32 && targetId.includes('-')) {
      const block = await client.callApi('logseq.Editor.getBlock', [targetId]);
      if (block) {
        return block as Record<string, unknown>;
      }
    }
    
    // Try as page name
    const page = await client.getPage(targetId);
    return page ? page as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

/**
 * Resolve page name to first block UUID or validate block UUID
 */
async function resolveToBlockUuid(client: LogseqClient, targetId: string): Promise<{ blockUuid: string } | { error: unknown }> {
  // already a UUID
  if (targetId.length >= 32 && targetId.includes('-')) {
    return { blockUuid: targetId };
  }
  try {
    const page = await client.getPage(targetId);
    if (!page || typeof page !== 'object') {
      return { error: createStructuredError(ErrorCode.NOT_FOUND, { type: 'page', target: targetId, suggestion: 'Specify an existing page or a block UUID' }) };
    }
    const blocks = await client.getPageBlocksTree(targetId);
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return { error: createStructuredError(ErrorCode.GRAPH_CONSISTENCY, { type: 'page', target: targetId, reason: 'Page has no content blocks', suggestion: 'Open the page in Logseq and add a block, then retry' }) };
    }
    const first = blocks[0] as Record<string, unknown>;
    const uuid = typeof first.uuid === 'string' ? first.uuid : undefined;
    if (!uuid) {
      return { error: createStructuredError(ErrorCode.INTERNAL, { error: 'Missing block uuid on first block' }) };
    }
    return { blockUuid: uuid };
  } catch (error) {
    return { error: createStructuredError(ErrorCode.INTERNAL, { error: String(error) }) };
  }
}
