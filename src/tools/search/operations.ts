/**
 * Search Tool Operations Module
 * Thin orchestration layer that delegates to entity search methods
 */

import { logger } from '../../utils/system/logger.js';
import type { PerformanceAwareLogseqClient } from "../../adapters/client.js";
import type { SearchParams } from '../../validation/schemas.js';

// Import entity search methods
import { searchPages } from '../../entities/pages/search.js';
import { searchBlocks } from '../../entities/blocks/search.js';
import { searchTasks } from '../../entities/tasks/search.js';
import { searchTemplates } from '../../entities/templates/core.js';
import { extractAllTags } from '../../entities/tags/extraction.js';

export interface SearchResult {
  results: unknown[];
  total_found: number;
  has_more: boolean;
  next_cursor?: string;
}


/**
 * Execute search with filtering, sorting, and pagination
 */
export async function executeSearch(
  perfClient: PerformanceAwareLogseqClient,
  params: SearchParams
): Promise<SearchResult> {
  
  // Check cache first for repeated queries (only for first page to avoid pagination issues)
  if (!params.cursor) {
    const cached = perfClient.getCachedSearchResults(
      params.query || '', 
      params.target || 'both', 
      params.limit || 20
    );
    
    if (cached) {
      const limit = params.limit || 20;
      const hasMore = cached.length > limit;
      
      return {
        results: cached.slice(0, limit),
        total_found: cached.length,
        has_more: hasMore,
        next_cursor: hasMore ? String(limit) : undefined
      };
    }
  }

  let results: unknown[] = [];
  
  // Determine what to search and delegate to appropriate entities
  const searchTargetPages = params.target === 'pages' || params.target === 'both';
  const searchTargetBlocks = params.target === 'blocks' || params.target === 'both';
  const searchTargetTasks = params.target === 'tasks';
  const searchTargetTemplates = params.target === 'templates';
  const searchTargetProperties = params.target === 'properties';

  // Delegate to entity search methods
  try {
    if (searchTargetPages) {
      const allPages = await perfClient.getAllPagesCached();
      const pageResults = await searchPages(allPages, params);
      results.push(...pageResults);
    }
    
    if (searchTargetBlocks) {
      const allPages = await perfClient.getAllPagesCached();
      const blockResults = await searchBlocks(perfClient, allPages, params);
      results.push(...blockResults);
    }
    
    if (searchTargetTemplates) {
      const templates = await perfClient.getTemplatesCached();
      const templateResults = await searchTemplates(templates, params);
      results.push(...templateResults);
    }
    
    if (searchTargetTasks) {
      const taskResults = await searchTasks(perfClient, params);
      results.push(...taskResults);
    }

    if (searchTargetProperties) {
      const propResults = await searchProperties(perfClient, params);
      results.push(...propResults);
    }
  } catch (error) {
    logger.error({ error, params }, 'Failed to execute entity search');
    throw error;
  }

  // Apply scope filters first (more efficient to filter early)
  results = applyScopeFilters(results, params);
  
  // Apply filters
  results = applyFilters(results, params);
  
  // Apply sorting
  results = applySorting(results, params);
  
  // Apply pagination
  const limit = params.limit || 20;
  let offset = 0;
  
  // Parse cursor safely
  if (params.cursor) {
    const parsedOffset = parseInt(params.cursor, 10);
    if (!isNaN(parsedOffset) && parsedOffset >= 0) {
      offset = parsedOffset;
    } else {
      logger.warn({ cursor: params.cursor }, 'Invalid cursor value, using offset 0');
    }
  }
  
  // For paginated requests, try to use cached results first
  let fullResults = results;
  if (params.cursor) {
    const cachedResults = perfClient.getCachedSearchResults(
      params.query || '',
      params.target || 'both',
      params.limit || 20
    );
    if (cachedResults && Array.isArray(cachedResults)) {
      fullResults = cachedResults;
      logger.debug({
        cursor: params.cursor,
        cachedCount: fullResults.length,
        freshCount: results.length
      }, 'Using cached results for pagination');
    }
  }
  
  const paginatedResults = fullResults.slice(offset, offset + limit);
  const hasMore = fullResults.length > offset + limit;
  
  // Cache full results for future pagination requests
  if (!params.cursor || !perfClient.getCachedSearchResults(params.query || '', params.target || 'both', params.limit || 20)) {
    perfClient.setCachedSearchResults(
      params.query || '', 
      params.target || 'both', 
      params.limit || 20, 
      fullResults  // Cache full results for pagination
    );
  }
  
  return {
    results: paginatedResults,
    total_found: fullResults.length,
    has_more: hasMore,
    next_cursor: hasMore ? String(offset + limit) : undefined
  };
}

/**
 * Search properties across pages (and blocks) with simple matching.
 * Produces results at property granularity.
 */
async function searchProperties(
  perfClient: PerformanceAwareLogseqClient,
  params: SearchParams
): Promise<unknown[]> {
  const query = (params.query || '').toLowerCase().trim();
  const items: unknown[] = [];

  // Pages
  const pages = await perfClient.getAllPagesCached();
  for (const p of pages as unknown as Array<Record<string, unknown>>) {
    const page = p as Record<string, unknown>;
    const props = (page.properties as Record<string, unknown>) || {};
    for (const [key, value] of Object.entries(props)) {
      const keyStr = String(key).toLowerCase();
      const valStr = typeof value === 'string' ? value.toLowerCase() : JSON.stringify(value).toLowerCase();
      if (!query || keyStr.includes(query) || valStr.includes(query)) {
        items.push({
          type: 'property',
          scope: 'page',
          page_name: page.name,
          page_uuid: page.uuid,
          key,
          value,
          properties: props,
          relevance_score: query ? (keyStr.includes(query) ? 2 : 1) : 0
        });
      }
    }
  }

  // Optionally, we could scan blocks too. Do it only when query present to limit cost.
  if (query) {
    for (const p of pages as unknown as Array<Record<string, unknown>>) {
      const page = p as Record<string, unknown>;
      const blocks = await perfClient.getPageBlocksTreeCached(String(page.name));
      if (!Array.isArray(blocks)) {
        continue;
      }
      for (const b of blocks as unknown as Array<Record<string, unknown>>) {
        const blk = b as Record<string, unknown>;
        const props = (blk.properties as Record<string, unknown>) || {};
        if (!props || Object.keys(props).length === 0) {
          continue;
        }
        for (const [key, value] of Object.entries(props)) {
          const keyStr = String(key).toLowerCase();
          const valStr = typeof value === 'string' ? value.toLowerCase() : JSON.stringify(value).toLowerCase();
          if (keyStr.includes(query) || valStr.includes(query)) {
            items.push({
              type: 'property',
              scope: 'block',
              block_uuid: blk.uuid,
              page_name: page.name,
              key,
              value,
              properties: props,
              relevance_score: keyStr.includes(query) ? 2 : 1
            });
          }
        }
      }
    }
  }

  return items;
}





/**
 * Apply scope filters to results (namespace, pages, etc.)
 */
function applyScopeFilters(results: unknown[], params: SearchParams): unknown[] {
  if (!params.scope) {
    return results;
  }
  
  logger.debug({ 
    scope: params.scope,
    originalCount: results.length 
  }, 'Applying scope filters');
  
  return results.filter(item => {
    const itemObj = item as Record<string, unknown>;
    
    // Get the name to check against namespace (different for different result types)
    let itemName = '';
    if (itemObj.name) {
      itemName = String(itemObj.name); // Pages, templates
    } else if (itemObj.page) {
      itemName = String(itemObj.page); // Blocks
    } else {
      // No name/page property - can't apply namespace filter, exclude it
      return false;
    }
    
    // Namespace filtering - Strict namespace matching only
    if (params.scope!.namespace) {
      const namespace = params.scope!.namespace.trim();
      
      // Normalize namespace to always end with '/'
      const normalizedNamespace = namespace.endsWith('/') ? namespace : namespace + '/';
      
      // Only match items that:
      // 1. Start with the namespace/ (e.g., "projects/ai" matches "projects/")
      // 2. Are exactly the namespace root without slash (e.g., "projects" matches "projects/")
      const isExactNamespaceRoot = itemName === namespace.replace(/\/$/, '');
      const isInNamespace = itemName.startsWith(normalizedNamespace);
      
      
      if (!isExactNamespaceRoot && !isInNamespace) {
        return false;
      }
    }
    
    // Specific page titles filtering
    if (params.scope!.page_titles && Array.isArray(params.scope!.page_titles)) {
      if (!params.scope!.page_titles.includes(itemName)) {
        return false;
      }
    }
    
    // Journal filtering - use actual Logseq journal property
    if (params.scope!.journal === true) {
      // Check if it's a journal page using Logseq's journal? property
      const isJournal = (item as Record<string, unknown>)['journal?'] === true;
      if (!isJournal) {
        return false;
      }
    } else if (params.scope!.journal === false) {
      // Exclude journal pages using Logseq's journal? property
      const isJournal = (item as Record<string, unknown>)['journal?'] === true;
      if (isJournal) {
        return false;
      }
    }
    
    // Tag filtering (if the scope has a specific tag)
    if (params.scope!.tag) {
      const itemTags = extractAllTags(itemObj);
      if (!itemTags.includes(params.scope!.tag.toLowerCase())) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Apply filters to results
 */
function applyFilters(results: unknown[], params: SearchParams): unknown[] {
  if (!params.filter) {return results;}
  
  return results.filter(item => {
    const itemObj = item as Record<string, unknown>;
    const content = String(itemObj.content || itemObj.name || '');
    const properties = (itemObj.properties && typeof itemObj.properties === 'object') ? itemObj.properties as Record<string, unknown> : {};
    const created = itemObj.created || itemObj.createdAt;
    const updated = itemObj.updated || itemObj.updatedAt;
    
    // Length filters
    if (params.filter!.lengthMin !== undefined && content.length < params.filter!.lengthMin) {
      return false;
    }
    if (params.filter!.lengthMax !== undefined && content.length > params.filter!.lengthMax) {
      return false;
    }
    
    // Property filters with enhanced matching
    if (params.filter!.properties_any) {
      const hasAnyProperty = Object.entries(params.filter!.properties_any).some(([key, value]) => {
        return matchesPropertyValueByKey(properties, key, value);
      });
      if (!hasAnyProperty) {return false;}
    }
    
    if (params.filter!.properties_all) {
      const hasAllProperties = Object.entries(params.filter!.properties_all).every(([key, value]) => {
        return matchesPropertyValueByKey(properties, key, value);
      });
      if (!hasAllProperties) {return false;}
    }
    
    // Tag filters - Enhanced to handle different tag sources
    if (params.filter!.tags_any) {
      const itemTags = extractAllTags(itemObj);
      const normalizedRequestedTags = params.filter!.tags_any.map(tag => tag.toLowerCase().trim());
      const normalizedItemTags = itemTags.map(tag => tag.toLowerCase().trim());
      const hasAnyTag = normalizedRequestedTags.some(reqTag => normalizedItemTags.includes(reqTag));
      
      if (!hasAnyTag) {
        return false; // This item doesn't have any of the required tags
      }
    }
    
    if (params.filter!.tags_all) {
      const itemTags = extractAllTags(itemObj);
      const normalizedRequestedTags = params.filter!.tags_all.map(tag => tag.toLowerCase().trim());
      const normalizedItemTags = itemTags.map(tag => tag.toLowerCase().trim());
      const hasAllTags = normalizedRequestedTags.every(reqTag => normalizedItemTags.includes(reqTag));
      
      if (!hasAllTags) {
        return false; // This item doesn't have all the required tags
      }
    }
    
    // Date filters - Fixed comparison logic with proper timestamp handling
    if (params.filter!.createdAfter && created) {
      try {
        // Handle both timestamp numbers and date strings
        const createdTime = typeof created === 'number' ? created : new Date(created as string).getTime();
        const filterTime = new Date(params.filter!.createdAfter).getTime();
        
        if (!isNaN(createdTime) && !isNaN(filterTime)) {
          if (createdTime <= filterTime) {
            return false; // Item was created before or at the filter date
          }
        }
      } catch {
        // Invalid date, skip filter
      }
    }
    
    if (params.filter!.createdBefore && created) {
      try {
        // Handle both timestamp numbers and date strings
        const createdTime = typeof created === 'number' ? created : new Date(created as string).getTime();
        const filterTime = new Date(params.filter!.createdBefore).getTime();
        
        if (!isNaN(createdTime) && !isNaN(filterTime)) {
          if (createdTime >= filterTime) {
            return false; // Item was created after or at the filter date
          }
        }
      } catch {
        // Invalid date, skip filter
      }
    }
    
    if (params.filter!.updatedAfter && updated) {
      try {
        // Handle both timestamp numbers and date strings
        const updatedTime = typeof updated === 'number' ? updated : new Date(updated as string).getTime();
        const filterTime = new Date(params.filter!.updatedAfter).getTime();
        
        if (!isNaN(updatedTime) && !isNaN(filterTime)) {
          if (updatedTime <= filterTime) {
            return false; // Item was updated before or at the filter date
          }
        }
      } catch {
        // Invalid date, skip filter
      }
    }
    
    if (params.filter!.updatedBefore && updated) {
      try {
        // Handle both timestamp numbers and date strings  
        const updatedTime = typeof updated === 'number' ? updated : new Date(updated as string).getTime();
        const filterTime = new Date(params.filter!.updatedBefore).getTime();
        
        if (!isNaN(updatedTime) && !isNaN(filterTime)) {
          if (updatedTime >= filterTime) {
            return false; // Item was updated after or at the filter date
          }
        }
      } catch {
        // Invalid date, skip filter
      }
    }
    
    // Content filters
    if (params.filter!.contains && !content.toLowerCase().includes(params.filter!.contains.toLowerCase())) {
      return false;
    }
    
    if (params.filter!.exclude && content.toLowerCase().includes(params.filter!.exclude.toLowerCase())) {
      return false;
    }
    
    return true;
  });
}

/**
 * Match property value by key with case-insensitive key lookup
 */
function matchesPropertyValueByKey(properties: Record<string, unknown>, filterKey: string, filterValue: unknown): boolean {
  // Try exact key match first
  if (filterKey in properties) {
    return matchesPropertyValue(properties[filterKey], filterValue);
  }
  
  // Try case-insensitive key matching
  const normalizedFilterKey = filterKey.toLowerCase();
  for (const [itemKey, itemValue] of Object.entries(properties)) {
    if (itemKey.toLowerCase() === normalizedFilterKey) {
      return matchesPropertyValue(itemValue, filterValue);
    }
  }
  
  return false;
}

/**
 * Enhanced property value matching with type coercion and array handling
 */
function matchesPropertyValue(itemValue: unknown, filterValue: unknown): boolean {
  // Handle existence check
  if (filterValue === true) {
    return itemValue !== undefined && itemValue !== null;
  }
  
  // Handle null/undefined cases
  if (itemValue === null || itemValue === undefined) {
    return filterValue === null || filterValue === undefined;
  }
  
  // Handle array values in item properties
  if (Array.isArray(itemValue)) {
    // If filter value is also an array, check for intersection
    if (Array.isArray(filterValue)) {
      return filterValue.some(fv => itemValue.includes(fv));
    }
    // If filter value is single value, check if it's in the array
    return itemValue.includes(filterValue);
  }
  
  // Handle array filter values (item must match any of the values)
  if (Array.isArray(filterValue)) {
    return filterValue.includes(itemValue);
  }
  
  // Handle string comparisons with normalization
  if (typeof itemValue === 'string' && typeof filterValue === 'string') {
    return itemValue.toLowerCase().trim() === filterValue.toLowerCase().trim();
  }
  
  // Handle numeric comparisons with type coercion
  if (typeof filterValue === 'number') {
    const numItemValue = Number(itemValue);
    return !isNaN(numItemValue) && numItemValue === filterValue;
  }
  
  // Handle boolean comparisons
  if (typeof filterValue === 'boolean') {
    return Boolean(itemValue) === filterValue;
  }
  
  // Default strict equality
  return itemValue === filterValue;
}


/**
 * Safely extract date value for comparison with better fallback behavior
 */
function getDateValue(dateValue: unknown): number {
  if (!dateValue) {
    // Return a very old date instead of 0 so items without dates sort to the end
    return new Date(1970, 0, 1).getTime();
  }
  
  try {
    const date = new Date(dateValue as string | number);
    if (isNaN(date.getTime())) {
      // Return a very old date instead of 0 so invalid dates sort to the end
      return new Date(1970, 0, 1).getTime();
    }
    return date.getTime();
  } catch {
    // Return a very old date instead of 0 so errored dates sort to the end
    return new Date(1970, 0, 1).getTime();
  }
}

/**
 * Apply sorting to results
 */
function applySorting(results: unknown[], params: SearchParams): unknown[] {
  const sortField = params.sort || 'relevance';
  const order = params.order || 'desc';
  
  return results.sort((a: unknown, b: unknown) => {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    let aVal, bVal;
    
    switch (sortField) {
      case 'relevance':
        aVal = Number(aObj.relevance_score || 0);
        bVal = Number(bObj.relevance_score || 0);
        break;
      case 'created':
        aVal = getDateValue(aObj.created || aObj.createdAt);
        bVal = getDateValue(bObj.created || bObj.createdAt);
        break;
      case 'updated':
        aVal = getDateValue(aObj.updated || aObj.updatedAt);
        bVal = getDateValue(bObj.updated || bObj.updatedAt);
        break;
      case 'title':
      case 'page_title':
        aVal = String(aObj.name || aObj.content || '');
        bVal = String(bObj.name || bObj.content || '');
        break;
      case 'length':
        aVal = String(aObj.content || aObj.name || '').length;
        bVal = String(bObj.content || bObj.name || '').length;
        break;
      default:
        aVal = Number(aObj.relevance_score || 0);
        bVal = Number(bObj.relevance_score || 0);
    }
    
    if (order === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    }
  });
}
