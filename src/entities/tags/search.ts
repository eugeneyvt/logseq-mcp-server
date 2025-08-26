/**
 * Tag Search Operations
 * Advanced tag-based search and filtering capabilities
 */

import { extractAllTags, normalizeTag, hasAnyTag, hasAllTags } from './extraction.js';

export interface TagSearchOptions {
  includeCount?: boolean;
  sortByUsage?: boolean;
  limit?: number;
}

export interface TagUsageInfo {
  tag: string;
  count: number;
  items: Array<{ id: string; type: string; name?: string }>;
}

/**
 * Find all unique tags across a collection of items
 */
export function getAllTagsFromItems(items: unknown[]): string[] {
  const allTags = new Set<string>();
  
  items.forEach(item => {
    if (item && typeof item === 'object') {
      const tags = extractAllTags(item as Record<string, unknown>);
      tags.forEach(tag => allTags.add(tag));
    }
  });
  
  return Array.from(allTags).sort();
}

/**
 * Get tag usage statistics across a collection of items
 */
export function getTagUsageStats(items: unknown[]): TagUsageInfo[] {
  const tagStats = new Map<string, TagUsageInfo>();
  
  items.forEach(item => {
    if (item && typeof item === 'object') {
      const itemObj = item as Record<string, unknown>;
      const tags = extractAllTags(itemObj);
      
      tags.forEach(tag => {
        if (!tagStats.has(tag)) {
          tagStats.set(tag, {
            tag,
            count: 0,
            items: []
          });
        }
        
        const stat = tagStats.get(tag)!;
        stat.count++;
        stat.items.push({
          id: String(itemObj.uuid || itemObj.id || itemObj.name || 'unknown'),
          type: String(itemObj.type || 'unknown'),
          name: String(itemObj.name || itemObj.content || '').substring(0, 100)
        });
      });
    }
  });
  
  return Array.from(tagStats.values()).sort((a, b) => b.count - a.count);
}

/**
 * Filter items by tag criteria
 */
export function filterByTags(
  items: unknown[], 
  criteria: {
    tags_any?: string[];
    tags_all?: string[];
    tags_exclude?: string[];
  }
): unknown[] {
  return items.filter(item => {
    if (!item || typeof item !== 'object') {
      return false;
    }
    
    const itemObj = item as Record<string, unknown>;
    
    // Check tags_any (must have at least one of these tags)
    if (criteria.tags_any && criteria.tags_any.length > 0) {
      if (!hasAnyTag(itemObj, criteria.tags_any)) {
        return false;
      }
    }
    
    // Check tags_all (must have all of these tags)
    if (criteria.tags_all && criteria.tags_all.length > 0) {
      if (!hasAllTags(itemObj, criteria.tags_all)) {
        return false;
      }
    }
    
    // Check tags_exclude (must not have any of these tags)
    if (criteria.tags_exclude && criteria.tags_exclude.length > 0) {
      if (hasAnyTag(itemObj, criteria.tags_exclude)) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Find items with similar tags (tag-based recommendations)
 */
export function findSimilarByTags(
  targetItem: Record<string, unknown>, 
  candidateItems: unknown[],
  options: { minSharedTags?: number; limit?: number } = {}
): Array<{ item: unknown; sharedTags: string[]; similarity: number }> {
  const targetTags = extractAllTags(targetItem);
  if (targetTags.length === 0) {
    return [];
  }
  
  const similarities = candidateItems
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const candidateTags = extractAllTags(item as Record<string, unknown>);
      const sharedTags = targetTags.filter(tag => candidateTags.includes(tag));
      const similarity = sharedTags.length / Math.max(targetTags.length, candidateTags.length);
      
      return {
        item,
        sharedTags,
        similarity
      };
    })
    .filter(result => {
      const minShared = options.minSharedTags || 1;
      return result.sharedTags.length >= minShared;
    })
    .sort((a, b) => b.similarity - a.similarity);
    
  if (options.limit) {
    return similarities.slice(0, options.limit);
  }
  
  return similarities;
}

/**
 * Search for items by tag patterns or tag-like queries
 */
export function searchByTagPattern(items: unknown[], pattern: string): unknown[] {
  const normalizedPattern = normalizeTag(pattern);
  
  return items.filter(item => {
    if (!item || typeof item === 'object') {
      return false;
    }
    
    const itemTags = extractAllTags(item as Record<string, unknown>);
    return itemTags.some(tag => 
      tag.includes(normalizedPattern) || 
      normalizedPattern.includes(tag)
    );
  });
}