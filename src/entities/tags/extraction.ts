/**
 * Tag Extraction Operations
 * Centralized tag extraction from various Logseq content sources
 */

/**
 * Extract all tags from a Logseq item (pages, blocks, etc.)
 * This is the canonical tag extraction function used across the system
 */
export function extractAllTags(item: Record<string, unknown>): string[] {
  const tags = new Set<string>();
  
  // First check if this is already a processed search result with tags
  if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
    item.tags.forEach(tag => {
      if (typeof tag === 'string') {
        tags.add(normalizeTag(tag));
      }
    });
    return Array.from(tags);
  }
  
  // Get tags from properties (for raw Logseq data)
  const properties = (item.properties && typeof item.properties === 'object') ? item.properties as Record<string, unknown> : {};
  
  // Standard tags property
  if (properties.tags) {
    if (Array.isArray(properties.tags)) {
      properties.tags.forEach(tag => {
        if (typeof tag === 'string') {
          tags.add(normalizeTag(tag));
        }
      });
    } else if (typeof properties.tags === 'string') {
      tags.add(normalizeTag(properties.tags));
    }
  }
  
  // Check other property keys that might contain tags (tag, category, labels, etc.)
  for (const [key, value] of Object.entries(properties)) {
    if (isTagProperty(key)) {
      if (Array.isArray(value)) {
        value.forEach(tag => {
          if (typeof tag === 'string') {
            tags.add(normalizeTag(tag));
          }
        });
      } else if (typeof value === 'string') {
        tags.add(normalizeTag(value));
      }
    }
  }
  
  // Extract tags from content using #tag pattern
  const content = String(item.content || item.name || '');
  extractContentTags(content).forEach(tag => tags.add(tag));
  
  return Array.from(tags);
}

/**
 * Extract tags from content text using various patterns
 */
export function extractContentTags(content: string): string[] {
  const tags = new Set<string>();
  
  // Extract #hashtags with better hyphen support
  const hashTags = content.match(/#[\w][\w-]*[\w]/g) || content.match(/#\w+/g);
  if (hashTags) {
    hashTags.forEach(tag => {
      const cleanTag = tag.slice(1); // Remove the # symbol
      // Ensure we don't add empty tags or tags that are just hyphens
      if (cleanTag && cleanTag !== '-' && !/^-+$/.test(cleanTag)) {
        tags.add(normalizeTag(cleanTag));
      }
    });
  }
  
  // Extract tags from [[page]] references that look like tags
  const pageRefs = content.match(/\[\[([^\]]+)\]\]/g);
  if (pageRefs) {
    pageRefs.forEach(ref => {
      const tagName = ref.slice(2, -2); // Remove [[ ]]
      if (isTagLikePageRef(tagName)) {
        tags.add(normalizeTag(tagName.replace('#', '')));
      }
    });
  }
  
  return Array.from(tags);
}

/**
 * Normalize a tag string for consistent comparison
 */
export function normalizeTag(tag: string): string {
  return tag.toLowerCase().trim();
}

/**
 * Check if a property key likely contains tags
 */
function isTagProperty(key: string): boolean {
  const tagKeys = ['tag', 'tags', 'category', 'categories', 'label', 'labels', 'topic', 'topics'];
  const normalizedKey = key.toLowerCase();
  return tagKeys.some(tagKey => normalizedKey.includes(tagKey));
}

/**
 * Check if a page reference looks like a tag
 */
function isTagLikePageRef(pageName: string): boolean {
  // Check if it starts with # or looks like a tag pattern
  return pageName.startsWith('#') || 
         /^[A-Z][a-z]*$/.test(pageName) || // Simple capitalized words
         /^[A-Z][a-zA-Z]*[A-Z][a-z]*$/.test(pageName) || // CamelCase
         /^[a-z]+(-[a-z]+)*$/.test(pageName); // Hyphenated lowercase tags like 'api-test'
}

/**
 * Check if any of the target tags match the item's tags
 */
export function hasAnyTag(item: Record<string, unknown>, targetTags: string[]): boolean {
  const itemTags = extractAllTags(item);
  const normalizedTargets = targetTags.map(normalizeTag);
  return itemTags.some(tag => normalizedTargets.includes(tag));
}

/**
 * Check if all target tags match the item's tags
 */
export function hasAllTags(item: Record<string, unknown>, targetTags: string[]): boolean {
  const itemTags = extractAllTags(item);
  const normalizedTargets = targetTags.map(normalizeTag);
  return normalizedTargets.every(target => itemTags.includes(target));
}