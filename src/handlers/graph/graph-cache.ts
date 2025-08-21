import type { GraphMap } from '../../schemas/logseq.js';
import { logger } from '../../utils/logger.js';
import type { GraphCacheState, GraphCacheConfig } from './graph-types.js';

/**
 * Graph cache configuration
 */
export const GRAPH_CACHE_CONFIG: GraphCacheConfig = {
  GRAPH_MAP_CACHE_TTL: 5 * 60 * 1000, // 5 minutes
};

/**
 * Global cache state
 */
export const graphCache: GraphCacheState = {
  graphMapCache: null,
  graphMapCacheTime: 0,
};

/**
 * Check if cache is valid and not expired
 */
export function isCacheValid(): boolean {
  return !!(
    graphCache.graphMapCache &&
    Date.now() - graphCache.graphMapCacheTime < GRAPH_CACHE_CONFIG.GRAPH_MAP_CACHE_TTL
  );
}

/**
 * Get cached graph map if valid
 */
export function getCachedGraphMap(): GraphMap | null {
  if (isCacheValid()) {
    logger.debug('Returning cached graph map');
    return graphCache.graphMapCache;
  }
  return null;
}

/**
 * Update cache with new graph map
 */
export function updateCache(graphMap: GraphMap): void {
  graphCache.graphMapCache = graphMap;
  graphCache.graphMapCacheTime = Date.now();
  logger.debug('Graph map cache updated');
}

/**
 * Clear cache
 */
export function clearCache(): void {
  graphCache.graphMapCache = null;
  graphCache.graphMapCacheTime = 0;
  logger.debug('Graph map cache cleared');
}

/**
 * Get cache age in milliseconds
 */
export function getCacheAge(): number {
  return Date.now() - graphCache.graphMapCacheTime;
}

/**
 * Check if cache should be refreshed
 */
export function shouldRefreshCache(forceRefresh?: boolean): boolean {
  return !!(forceRefresh || !isCacheValid());
}
