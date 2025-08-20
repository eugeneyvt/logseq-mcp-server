import type { Config } from '../schemas/config.js';
import { CoreLogseqClient } from './core-client.js';
import { PageOperations } from './page-operations.js';
import { BlockOperations } from './block-operations.js';
import { QueryOperations } from './query-operations.js';

/**
 * Unified Logseq API client that combines all operations
 * 
 * This class uses composition to provide all Logseq API functionality
 * while keeping the code modular and maintainable.
 */
export class LogseqClient {
  private readonly coreClient: CoreLogseqClient;
  private readonly pageOps: PageOperations;
  private readonly blockOps: BlockOperations;
  private readonly queryOps: QueryOperations;

  constructor(config: Config) {
    // Initialize all operation classes
    this.coreClient = new CoreLogseqClient(config);
    this.pageOps = new PageOperations(config);
    this.blockOps = new BlockOperations(config);
    this.queryOps = new QueryOperations(config);
  }

  // Core API methods
  async callApi<T = unknown>(method: string, args: readonly unknown[] = []): Promise<T> {
    return this.coreClient.callApi<T>(method, args);
  }

  async testConnection(): Promise<boolean> {
    return this.coreClient.testConnection();
  }

  async getCurrentGraph(): Promise<unknown> {
    return this.coreClient.getCurrentGraph();
  }

  async getUserConfigs(): Promise<unknown> {
    return this.coreClient.getUserConfigs();
  }

  async getStateFromStore(key: string): Promise<unknown> {
    return this.coreClient.getStateFromStore(key);
  }

  // Page operations
  async getAllPages() {
    return this.pageOps.getAllPages();
  }

  async getPage(pageNameOrId: string | number) {
    return this.pageOps.getPage(pageNameOrId);
  }

  async getPageBlocksTree(pageNameOrId: string | number) {
    return this.pageOps.getPageBlocksTree(pageNameOrId);
  }

  async createPage(name: string, properties?: Record<string, unknown>) {
    return this.pageOps.createPage(name, properties);
  }

  async deletePage(pageNameOrId: string | number) {
    return this.pageOps.deletePage(pageNameOrId);
  }

  async getCurrentPage() {
    return this.pageOps.getCurrentPage();
  }

  // Block operations
  async getBlock(blockId: string) {
    return this.blockOps.getBlock(blockId);
  }

  async getBlockProperties(blockId: string) {
    return this.blockOps.getBlockProperties(blockId);
  }

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
  ) {
    return this.blockOps.insertBlock(pageOrBlockId, content, options);
  }

  async updateBlock(blockId: string, content: string) {
    return this.blockOps.updateBlock(blockId, content);
  }

  async removeBlock(blockId: string) {
    return this.blockOps.removeBlock(blockId);
  }

  async upsertBlockProperty(blockId: string, key: string, value: unknown) {
    return this.blockOps.upsertBlockProperty(blockId, key, value);
  }

  async removeBlockProperty(blockId: string, key: string) {
    return this.blockOps.removeBlockProperty(blockId, key);
  }

  async getCurrentBlock() {
    return this.blockOps.getCurrentBlock();
  }

  // Query operations
  async datascriptQuery(query: string) {
    return this.queryOps.datascriptQuery(query);
  }

  async simpleQuery(query: string) {
    return this.queryOps.simpleQuery(query);
  }
}

// Re-export the client for backward compatibility
export { LogseqClient as default };