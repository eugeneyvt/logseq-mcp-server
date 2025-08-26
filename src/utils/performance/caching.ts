/**
 * Caching Service
 * Centralized cache keys, configuration, and cache management
 */

// Simple cache implementation
type CacheEntry<T = unknown> = {
  data: T;
  timestamp: number;
  ttl: number;
};

const createCache = <T>() => {
  const cache = new Map<string, CacheEntry<T>>();
  
  return {
    get: (key: string): T | null => {
      const entry = cache.get(key);
      if (!entry) {return null;}
      
      if (Date.now() > entry.timestamp + entry.ttl) {
        cache.delete(key);
        return null;
      }
      
      return entry.data;
    },
    set: (key: string, data: T, ttl = 300000): void => { // 5 min default
      cache.set(key, { data, timestamp: Date.now(), ttl });
    },
    delete: (key: string): void => {
      cache.delete(key);
    },
    clear: (): void => {
      cache.clear();
    },
    get size(): number {
      return cache.size;
    },
    keys: (): IterableIterator<string> => {
      return cache.keys();
    }
  };
};

// Cache instances for external use
export const pageCache = createCache<unknown>();
export const blockCache = createCache<unknown>();
export const queryCache = createCache<unknown>();

/**
 * Performance-aware cache keys for common operations
 */
export const CacheKeys = {
  ALL_PAGES: 'all_pages',
  PAGE_BLOCKS: (pageName: string) => `page_blocks:${pageName}`,
  PAGE_INFO: (pageName: string) => `page_info:${pageName}`,
  BLOCK_INFO: (blockUuid: string) => `block_info:${blockUuid}`,
  SEARCH_QUERY: (query: string, target: string, limit: number) => `search:${target}:${limit}:${query}`,
  TEMPLATE_LIST: 'templates',
  GRAPH_INFO: 'graph_info'
} as const;

/**
 * Cache TTL configuration
 */
export const CacheTTL = {
  ALL_PAGES: 300000,      // 5 minutes
  PAGE_BLOCKS: 180000,    // 3 minutes
  PAGE_INFO: 240000,      // 4 minutes
  BLOCK_INFO: 180000,     // 3 minutes
  SEARCH_RESULTS: 60000,  // 1 minute
  TEMPLATES: 600000,      // 10 minutes
  GRAPH_INFO: 300000      // 5 minutes
} as const;

/**
 * Cache management utilities
 */
export class CacheManager {
  /**
   * Clear all caches
   */
  static clearAll(): void {
    pageCache.clear();
    blockCache.clear();
    queryCache.clear();
  }

  /**
   * Clear page-related caches
   */
  static clearPageCaches(): void {
    pageCache.clear();
  }

  /**
   * Clear block-related caches
   */
  static clearBlockCaches(): void {
    blockCache.clear();
  }

  /**
   * Clear search-related caches
   */
  static clearSearchCaches(): void {
    queryCache.clear();
  }

  /**
   * Get cache statistics
   */
  static getStats(): {
    pages: { size: number; keys: string[] };
    blocks: { size: number; keys: string[] };
    queries: { size: number; keys: string[] };
  } {
    return {
      pages: {
        size: pageCache.size,
        keys: Array.from(pageCache.keys())
      },
      blocks: {
        size: blockCache.size,
        keys: Array.from(blockCache.keys())
      },
      queries: {
        size: queryCache.size,
        keys: Array.from(queryCache.keys())
      }
    };
  }
}