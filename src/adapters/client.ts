/**
 * Performance-Aware Client Service
 * Enhanced LogseqClient wrapper with caching and type safety
 */

import { logger } from '../utils/system/logger.js';
import type { LogseqClient } from '../logseq-client.js';
import { isLogseqPageArray, isLogseqBlockArray, isLogseqPage, isLogseqBlock, type LogseqPage, type LogseqBlock } from '../schemas/types.js';
import { CacheKeys, CacheTTL, pageCache, blockCache, queryCache } from '../utils/performance/caching.js';
import { timeOperation, metrics } from '../utils/performance/monitoring.js';

/**
 * Enhanced LogseqClient wrapper with performance optimizations
 */
export class PerformanceAwareLogseqClient {
  constructor(private client: LogseqClient) {}

  /**
   * Access to the underlying client for operations that don't need caching
   */
  get underlyingClient(): LogseqClient {
    return this.client;
  }

  /**
   * Get all pages with caching (type-safe)
   */
  async getAllPagesCached(): Promise<LogseqPage[]> {
    const cached = pageCache.get(CacheKeys.ALL_PAGES);
    if (cached && isLogseqPageArray(cached)) {
      metrics.incrementCounter('cache.pages.hit');
      logger.debug('Cache hit for getAllPages');
      return cached;
    }

    const pages = await timeOperation('logseq.getAllPages', async () => {
      return await this.client.getAllPages();
    });

    // Safely convert unknown API response to typed pages
    if (!Array.isArray(pages)) {
      logger.warn('getAllPages returned non-array, returning empty array');
      return [];
    }

    // Filter to only valid pages and log invalid ones
    const validPages: LogseqPage[] = [];
    const invalidPages: unknown[] = [];
    
    for (const page of pages) {
      if (isLogseqPage(page)) {
        validPages.push(page);
      } else {
        invalidPages.push(page);
      }
    }

    if (invalidPages.length > 0) {
      logger.warn({ invalidCount: invalidPages.length }, 'Found invalid page objects in API response');
    }

    pageCache.set(CacheKeys.ALL_PAGES, validPages, CacheTTL.ALL_PAGES);
    metrics.incrementCounter('cache.pages.miss');
    logger.debug({ pageCount: validPages.length }, 'Cached getAllPages result');
    
    return validPages;
  }

  /**
   * Get page blocks tree with caching (type-safe)
   */
  async getPageBlocksTreeCached(pageName: string): Promise<LogseqBlock[]> {
    const cacheKey = CacheKeys.PAGE_BLOCKS(pageName);
    const cached = blockCache.get(cacheKey);
    
    if (cached && isLogseqBlockArray(cached)) {
      metrics.incrementCounter('cache.blocks.hit');
      logger.debug({ pageName }, 'Cache hit for getPageBlocksTree');
      return cached;
    }

    const blocks = await timeOperation('logseq.getPageBlocksTree', async () => {
      return await this.client.getPageBlocksTree(pageName) || [];
    });

    // Safely convert unknown API response to typed blocks
    if (!Array.isArray(blocks)) {
      logger.warn({ pageName }, 'getPageBlocksTree returned non-array, returning empty array');
      return [];
    }

    // Filter to only valid blocks and log invalid ones
    const validBlocks: LogseqBlock[] = [];
    const invalidBlocks: unknown[] = [];
    
    for (const block of blocks) {
      if (isLogseqBlock(block)) {
        validBlocks.push(block);
      } else {
        invalidBlocks.push(block);
      }
    }

    if (invalidBlocks.length > 0) {
      logger.warn({ pageName, invalidCount: invalidBlocks.length }, 'Found invalid block objects in API response');
    }

    blockCache.set(cacheKey, validBlocks, CacheTTL.PAGE_BLOCKS);
    metrics.incrementCounter('cache.blocks.miss');
    logger.debug({ pageName, blockCount: validBlocks.length }, 'Cached getPageBlocksTree result');
    
    return validBlocks;
  }

  /**
   * Get page with caching (type-safe)
   */
  async getPageCached(pageName: string): Promise<LogseqPage | null> {
    const cacheKey = CacheKeys.PAGE_INFO(pageName);
    const cached = pageCache.get(cacheKey);
    
    if (cached && isLogseqPage(cached)) {
      metrics.incrementCounter('cache.page_info.hit');
      return cached;
    }

    const page = await timeOperation('logseq.getPage', async () => {
      return await this.client.getPage(pageName);
    });

    // Type-safe page handling
    if (page && isLogseqPage(page)) {
      pageCache.set(cacheKey, page, CacheTTL.PAGE_INFO);
      metrics.incrementCounter('cache.page_info.miss');
      return page;
    }

    // Log invalid page responses
    if (page) {
      logger.warn({ pageName }, 'getPage returned invalid page object');
    }
    
    return null;
  }

  /**
   * Get block with caching (type-safe)
   */
  async getBlockCached(blockUuid: string): Promise<LogseqBlock | null> {
    const cacheKey = CacheKeys.BLOCK_INFO(blockUuid);
    const cached = blockCache.get(cacheKey);
    
    if (cached && isLogseqBlock(cached)) {
      metrics.incrementCounter('cache.block_info.hit');
      return cached;
    }

    const block = await timeOperation('logseq.getBlock', async () => {
      return await this.client.getBlock(blockUuid);
    });

    // Type-safe block handling
    if (block && isLogseqBlock(block)) {
      blockCache.set(cacheKey, block, CacheTTL.BLOCK_INFO);
      metrics.incrementCounter('cache.block_info.miss');
      return block;
    }

    // Log invalid block responses
    if (block) {
      logger.warn({ blockUuid }, 'getBlock returned invalid block object');
    }
    
    return null;
  }

  /**
   * Cache search results for repeated queries (type-safe)
   */
  getCachedSearchResults(query: string, target: string, limit: number): unknown[] | undefined {
    const cacheKey = CacheKeys.SEARCH_QUERY(query, target, limit);
    const cached = queryCache.get(cacheKey);
    
    if (cached && Array.isArray(cached)) {
      metrics.incrementCounter('cache.search.hit');
      logger.debug({ query, target, limit }, 'Cache hit for search results');
      return cached;
    }
    
    return undefined;
  }

  /**
   * Cache search results (type-safe)
   */
  setCachedSearchResults(query: string, target: string, limit: number, results: unknown[]): void {
    const cacheKey = CacheKeys.SEARCH_QUERY(query, target, limit);
    queryCache.set(cacheKey, results, CacheTTL.SEARCH_RESULTS);
    metrics.incrementCounter('cache.search.miss');
    logger.debug({ query, target, limit, resultCount: results.length }, 'Cached search results');
  }

  /**
   * Get templates with caching (type-safe)
   */
  async getTemplatesCached(): Promise<LogseqPage[]> {
    const cached = pageCache.get(CacheKeys.TEMPLATE_LIST);
    if (cached && isLogseqPageArray(cached)) {
      metrics.incrementCounter('cache.templates.hit');
      return cached;
    }

    const allPages = await this.getAllPagesCached();
    const templates = allPages.filter((page) => {
      return page.name?.toLowerCase().includes('template') || 
             (page.properties && (page.properties as Record<string, unknown>).template) ||
             page.name?.startsWith('template/');
    });

    pageCache.set(CacheKeys.TEMPLATE_LIST, templates, CacheTTL.TEMPLATES);
    metrics.incrementCounter('cache.templates.miss');
    logger.debug({ templateCount: templates.length }, 'Cached template list');
    
    return templates;
  }

  /**
   * Invalidate cache entries when data changes
   */
  invalidateCache(type: 'page' | 'block' | 'all', identifier?: string): void {
    switch (type) {
      case 'page':
        if (identifier) {
          pageCache.delete(CacheKeys.PAGE_INFO(identifier));
          blockCache.delete(CacheKeys.PAGE_BLOCKS(identifier));
          logger.debug({ pageName: identifier }, 'Invalidated page cache');
        }
        // Always invalidate page list and templates when any page changes
        pageCache.delete(CacheKeys.ALL_PAGES);
        pageCache.delete(CacheKeys.TEMPLATE_LIST);
        break;
        
      case 'block':
        if (identifier) {
          blockCache.delete(CacheKeys.BLOCK_INFO(identifier));
          logger.debug({ blockUuid: identifier }, 'Invalidated block cache');
        }
        break;
        
      case 'all':
        pageCache.clear();
        blockCache.clear();
        queryCache.clear();
        logger.info('Invalidated all caches');
        break;
    }
    
    metrics.incrementCounter(`cache.invalidation.${type}`);
  }
}

/**
 * Factory function to create performance-aware client
 */
export function createPerformanceAwareClient(client: LogseqClient): PerformanceAwareLogseqClient {
  return new PerformanceAwareLogseqClient(client);
}