import type { LogseqPage, LogseqBlock } from '../schemas/logseq.js';
import { pageCache } from '../utils/cache.js';
import { timeOperation } from '../utils/monitoring.js';
import { CoreLogseqClient } from './core-client.js';

/**
 * Page-related operations for Logseq API
 */
export class PageOperations extends CoreLogseqClient {
  /**
   * Get all pages in the graph
   */
  async getAllPages(): Promise<readonly LogseqPage[]> {
    return timeOperation('logseq.pages.getAll', async () => {
      return this.callApi<LogseqPage[]>('logseq.Editor.getAllPages');
    });
  }

  /**
   * Get a specific page by name or ID
   */
  async getPage(pageNameOrId: string | number): Promise<LogseqPage | null> {
    const cacheKey = String(pageNameOrId);
    const cached = pageCache.get(cacheKey) as LogseqPage | undefined;
    if (cached) {
      return cached;
    }

    return timeOperation(
      'logseq.pages.get',
      async () => {
        // If it's a number, get by ID directly
        if (typeof pageNameOrId === 'number') {
          const page = await this.callApi<LogseqPage | null>('logseq.Editor.getPage', [pageNameOrId]);
          if (page) {
            pageCache.set(cacheKey, page);
          }
          return page;
        }

        // For string names, first find the exact page from getAllPages
        // This works around Logseq API's broken page name matching
        let allPages;
        try {
          allPages = await this.getAllPages();
        } catch (error) {
          // Fallback to direct API call if getAllPages fails
          const page = await this.callApi<LogseqPage | null>('logseq.Editor.getPage', [pageNameOrId]);
          if (page) {
            pageCache.set(cacheKey, page);
          }
          return page;
        }

        const targetPage = allPages.find(p => 
          p.name.toLowerCase() === pageNameOrId.toLowerCase() ||
          p.originalName?.toLowerCase() === pageNameOrId.toLowerCase()
        );

        if (!targetPage) {
          return null;
        }

        // Get the full page data using the ID - but return the basic data if API call fails
        try {
          const page = await this.callApi<LogseqPage | null>('logseq.Editor.getPage', [targetPage.id]);
          if (page) {
            pageCache.set(cacheKey, page);
            return page;
          }
        } catch (error) {
          // If we can't get full page data, return the basic info we have
          pageCache.set(cacheKey, targetPage);
          return targetPage;
        }
        
        return targetPage;
      }
    );
  }

  /**
   * Get page blocks tree structure
   */
  async getPageBlocksTree(pageNameOrId: string | number): Promise<readonly LogseqBlock[]> {
    return timeOperation('logseq.pages.getBlocks', async () => {
      return this.callApi<LogseqBlock[]>('logseq.Editor.getPageBlocksTree', [pageNameOrId]);
    });
  }

  /**
   * Create a new page
   */
  async createPage(name: string, properties?: Record<string, unknown>): Promise<LogseqPage> {
    return timeOperation('logseq.pages.create', async () => {
      const args: [string, Record<string, unknown>?] = properties ? [name, properties] : [name];
      const result = await this.callApi<LogseqPage>('logseq.Editor.createPage', args);
      
      // Invalidate cache
      pageCache.delete(name);
      pageCache.delete(String(result.id));
      
      return result;
    });
  }

  /**
   * Delete a page
   */
  async deletePage(pageNameOrId: string | number): Promise<void> {
    return timeOperation('logseq.pages.delete', async () => {
      await this.callApi<void>('logseq.Editor.deletePage', [pageNameOrId]);
      
      // Invalidate cache
      pageCache.delete(String(pageNameOrId));
      
      // If it's a numeric ID, also try to remove by name if we have it cached
      if (typeof pageNameOrId === 'number') {
        // We can't easily reverse-lookup the name, so we'll let cache expire naturally
      }
    });
  }

  /**
   * Get current page
   */
  async getCurrentPage(): Promise<LogseqPage | null> {
    return this.callApi<LogseqPage | null>('logseq.Editor.getCurrentPage');
  }
}