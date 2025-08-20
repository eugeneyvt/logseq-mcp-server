import type { LogseqBlock } from '../schemas/logseq.js';
import { blockCache } from '../utils/cache.js';
import { timeOperation } from '../utils/monitoring.js';
import { CoreLogseqClient } from './core-client.js';

/**
 * Block-related operations for Logseq API
 */
export class BlockOperations extends CoreLogseqClient {
  /**
   * Get a specific block by ID
   */
  async getBlock(blockId: string): Promise<LogseqBlock | null> {
    const cached = blockCache.get(blockId) as LogseqBlock | undefined;
    if (cached) {
      return cached;
    }

    return timeOperation(
      'logseq.blocks.get',
      async () => {
        const block = await this.callApi<LogseqBlock | null>('logseq.Editor.getBlock', [blockId]);
        if (block) {
          blockCache.set(blockId, block);
        }
        return block;
      }
    );
  }

  /**
   * Get block properties
   */
  async getBlockProperties(blockId: string): Promise<Record<string, unknown>> {
    return this.callApi<Record<string, unknown>>('logseq.Editor.getBlockProperties', [blockId]);
  }

  /**
   * Insert a new block
   */
  async insertBlock(
    pageOrBlockId: string,
    content: string,
    options: {
      sibling?: boolean;
      before?: boolean;
      parent?: boolean;
      isPageBlock?: boolean;
      properties?: Record<string, unknown>;
    } = {}
  ): Promise<LogseqBlock> {
    return timeOperation('logseq.blocks.insert', async () => {
      const result = await this.callApi<LogseqBlock>('logseq.Editor.insertBlock', [
        pageOrBlockId,
        content,
        options,
      ]);
      
      // Invalidate related caches
      blockCache.delete(String(result.id));
      if (result.page) {
        // Page structure may have changed
      }
      
      return result;
    });
  }

  /**
   * Update block content
   */
  async updateBlock(blockId: string, content: string): Promise<LogseqBlock> {
    return timeOperation('logseq.blocks.update', async () => {
      const result = await this.callApi<LogseqBlock>('logseq.Editor.updateBlock', [blockId, content]);
      
      // Invalidate cache
      blockCache.delete(blockId);
      
      return result;
    });
  }

  /**
   * Remove a block
   */
  async removeBlock(blockId: string): Promise<void> {
    return timeOperation('logseq.blocks.remove', async () => {
      await this.callApi<void>('logseq.Editor.removeBlock', [blockId]);
      
      // Invalidate cache
      blockCache.delete(blockId);
    });
  }

  /**
   * Set/update block property
   */
  async upsertBlockProperty(blockId: string, key: string, value: unknown): Promise<void> {
    return timeOperation('logseq.blocks.upsertProperty', async () => {
      await this.callApi<void>('logseq.Editor.upsertBlockProperty', [blockId, key, value]);
      
      // Invalidate cache since properties changed
      blockCache.delete(blockId);
    });
  }

  /**
   * Remove block property
   */
  async removeBlockProperty(blockId: string, key: string): Promise<void> {
    return timeOperation('logseq.blocks.removeProperty', async () => {
      await this.callApi<void>('logseq.Editor.removeBlockProperty', [blockId, key]);
      
      // Invalidate cache since properties changed
      blockCache.delete(blockId);
    });
  }

  /**
   * Get current block
   */
  async getCurrentBlock(): Promise<LogseqBlock | null> {
    return this.callApi<LogseqBlock | null>('logseq.Editor.getCurrentBlock');
  }
}