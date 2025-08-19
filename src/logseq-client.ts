import axios, { AxiosInstance, AxiosError } from 'axios';
import { Config, LogseqApiResponse, LogseqPage, LogseqBlock } from './types';

export class LogseqApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'LogseqApiError';
  }
}

export class LogseqClient {
  private client: AxiosInstance;

  constructor(private config: Config) {
    this.client = axios.create({
      baseURL: config.apiUrl,
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });
  }

  /**
   * Generic method to call Logseq API
   */
  async callApi<T = any>(method: string, args: any[] = []): Promise<T> {
    try {
      const response = await this.client.post<LogseqApiResponse<T>>('/api', {
        method,
        args,
      });

      if (response.data.error) {
        throw new LogseqApiError(`Logseq API error: ${response.data.error}`);
      }

      return response.data.data || (response.data as T);
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 401) {
          throw new LogseqApiError('Unauthorized: Check your API token', 401, error);
        }
        if (error.code === 'ECONNREFUSED') {
          throw new LogseqApiError(
            'Connection refused: Make sure Logseq is running with HTTP API enabled',
            undefined,
            error
          );
        }
        throw new LogseqApiError(`HTTP error: ${error.message}`, error.response?.status, error);
      }
      if (error instanceof LogseqApiError) {
        throw error;
      }
      throw new LogseqApiError(`Unexpected error: ${error}`, undefined, error as Error);
    }
  }

  /**
   * Test connection to Logseq API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getCurrentGraph();
      return true;
    } catch (error) {
      console.error('Failed to connect to Logseq:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  // Page operations
  async getAllPages(): Promise<LogseqPage[]> {
    return this.callApi('logseq.Editor.getAllPages');
  }

  async getPage(pageNameOrId: string | number): Promise<LogseqPage | null> {
    try {
      return await this.callApi('logseq.Editor.getPage', [pageNameOrId]);
    } catch (error) {
      if (error instanceof LogseqApiError && error.message.includes('not found')) {
        return null;
      }
      throw error;
    }
  }

  async getPageBlocksTree(pageNameOrId: string | number): Promise<LogseqBlock[]> {
    return this.callApi('logseq.Editor.getPageBlocksTree', [pageNameOrId]);
  }

  async createPage(name: string, properties?: Record<string, any>): Promise<LogseqPage> {
    const args = properties ? [name, properties] : [name];
    return this.callApi('logseq.Editor.createPage', args);
  }

  async deletePage(pageNameOrId: string | number): Promise<void> {
    return this.callApi('logseq.Editor.deletePage', [pageNameOrId]);
  }

  // Block operations
  async getBlock(blockId: string): Promise<LogseqBlock | null> {
    try {
      return await this.callApi('logseq.Editor.getBlock', [blockId]);
    } catch (error) {
      if (error instanceof LogseqApiError && error.message.includes('not found')) {
        return null;
      }
      throw error;
    }
  }

  async getBlockProperties(blockId: string): Promise<Record<string, any>> {
    return this.callApi('logseq.Editor.getBlockProperties', [blockId]);
  }

  async insertBlock(
    parent: string,
    content: string,
    options?: {
      properties?: Record<string, any>;
      sibling?: boolean;
    }
  ): Promise<LogseqBlock> {
    const args: any[] = [parent, content];
    if (options?.properties) {
      args.push(options.properties);
    }
    if (options?.sibling) {
      args.push({ sibling: true });
    }
    return this.callApi('logseq.Editor.insertBlock', args);
  }

  async updateBlock(blockId: string, content: string): Promise<LogseqBlock> {
    return this.callApi('logseq.Editor.updateBlock', [blockId, content]);
  }

  async removeBlock(blockId: string): Promise<void> {
    return this.callApi('logseq.Editor.removeBlock', [blockId]);
  }

  async upsertBlockProperty(blockId: string, key: string, value: any): Promise<void> {
    return this.callApi('logseq.Editor.upsertBlockProperty', [blockId, key, value]);
  }

  async removeBlockProperty(blockId: string, key: string): Promise<void> {
    return this.callApi('logseq.Editor.removeBlockProperty', [blockId, key]);
  }

  // Query operations
  async datascriptQuery(query: string): Promise<any[]> {
    return this.callApi('logseq.DB.datascriptQuery', [query]);
  }

  async simpleQuery(query: string): Promise<any[]> {
    return this.callApi('logseq.DB.q', [query]);
  }

  // App state operations
  async getCurrentGraph(): Promise<any> {
    return this.callApi('logseq.App.getCurrentGraph');
  }

  async getUserConfigs(): Promise<any> {
    return this.callApi('logseq.App.getUserConfigs');
  }

  async getStateFromStore(key: string): Promise<any> {
    return this.callApi('logseq.App.getStateFromStore', [key]);
  }

  async getCurrentPage(): Promise<LogseqPage | null> {
    return this.callApi('logseq.Editor.getCurrentPage');
  }

  async getCurrentBlock(): Promise<LogseqBlock | null> {
    return this.callApi('logseq.Editor.getCurrentBlock');
  }
}
