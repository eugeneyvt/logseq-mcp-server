import axios from 'axios';

import { LogseqApiError, LogseqConnectionError } from './errors/index.js';
import type { Config } from './schemas/config.js';
import type { LogseqApiResponse, LogseqBlock, LogseqPage } from './schemas/logseq.js';
import { logger } from './utils/logger.js';
import { pageCache, blockCache } from './utils/cache.js';
import { timeOperation } from './utils/monitoring.js';

import type { AxiosError, AxiosInstance } from 'axios';

/**
 * Enhanced Logseq API client with retry logic and comprehensive error handling
 */
export class LogseqClient {
  private readonly client: AxiosInstance;

  constructor(private readonly config: Config) {
    this.client = axios.create({
      baseURL: config.apiUrl,
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'logseq-mcp-server/1.0.2',
      },
      timeout: config.timeout,
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug({ method: config.method, url: config.url }, 'Making API request');
        return config;
      },
      (error: AxiosError) => {
        logger.error({ error }, 'Request interceptor error');
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(
          {
            status: response.status,
            method: response.config.method,
            url: response.config.url,
          },
          'API request completed'
        );
        return response;
      },
      (error: AxiosError) => {
        logger.error(
          {
            status: error.response?.status,
            method: error.config?.method,
            url: error.config?.url,
            message: error.message,
          },
          'API request failed'
        );
        return Promise.reject(error);
      }
    );
  }

  /**
   * Generic method to call Logseq API with retry logic
   */
  async callApi<T = unknown>(method: string, args: readonly unknown[] = []): Promise<T> {
    const payload = { method, args };
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
          logger.debug({ attempt, delay }, 'Retrying API call after delay');
          await this.sleep(delay);
        }

        const response = await this.client.post<LogseqApiResponse<T>>('/api', payload);

        if (response.status === 401) {
          throw new LogseqApiError('Unauthorized: Check your API token', 401);
        }

        if (response.status === 404) {
          throw new LogseqApiError(
            'API endpoint not found: Check Logseq version and API availability',
            404
          );
        }

        if (response.status >= 400) {
          throw new LogseqApiError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status
          );
        }

        if (response.data.error) {
          throw new LogseqApiError(`Logseq API error: ${response.data.error}`);
        }

        // Handle different response formats
        if (response.data.data !== undefined) {
          return response.data.data;
        }

        return response.data as T;
      } catch (error) {
        lastError = this.handleApiError(error);

        // Don't retry on certain errors
        if (
          lastError instanceof LogseqApiError &&
          (lastError.statusCode === 401 || lastError.statusCode === 404)
        ) {
          break;
        }

        // Don't retry on the last attempt
        if (attempt === this.config.maxRetries) {
          break;
        }

        logger.warn({ attempt, error: lastError.message }, 'API call failed, retrying');
      }
    }

    throw lastError;
  }

  /**
   * Test connection to Logseq API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getCurrentGraph();
      logger.info('Successfully connected to Logseq API');
      return true;
    } catch (error) {
      logger.error({ error }, 'Failed to connect to Logseq API');
      return false;
    }
  }

  // Page operations
  async getAllPages(): Promise<readonly LogseqPage[]> {
    return timeOperation('logseq.pages.getAll', () =>
      pageCache.getOrSet(
        'all-pages',
        () => this.callApi<readonly LogseqPage[]>('logseq.Editor.getAllPages'),
        180000 // 3 minutes
      )
    );
  }

  async getPage(pageNameOrId: string | number): Promise<LogseqPage | null> {
    const cacheKey = `page-${pageNameOrId}`;

    return timeOperation('logseq.pages.get', () =>
      pageCache.getOrSet(
        cacheKey,
        async () => {
          try {
            return await this.callApi<LogseqPage>('logseq.Editor.getPage', [pageNameOrId]);
          } catch (error) {
            if (error instanceof LogseqApiError && error.message.includes('not found')) {
              return null;
            }
            throw error;
          }
        },
        300000 // 5 minutes
      )
    );
  }

  async getPageBlocksTree(pageNameOrId: string | number): Promise<readonly LogseqBlock[]> {
    const cacheKey = `page-blocks-${pageNameOrId}`;

    return timeOperation('logseq.pages.getBlocksTree', () =>
      blockCache.getOrSet(
        cacheKey,
        () =>
          this.callApi<readonly LogseqBlock[]>('logseq.Editor.getPageBlocksTree', [pageNameOrId]),
        120000 // 2 minutes
      )
    );
  }

  async createPage(name: string, properties?: Record<string, unknown>): Promise<LogseqPage> {
    return timeOperation('logseq.pages.create', async () => {
      const args = properties ? [name, properties] : [name];
      const result = await this.callApi<LogseqPage>('logseq.Editor.createPage', args);

      // Invalidate relevant caches
      pageCache.delete('all-pages');
      pageCache.delete(`page-${name}`);

      return result;
    });
  }

  async deletePage(pageNameOrId: string | number): Promise<void> {
    return timeOperation('logseq.pages.delete', async () => {
      const result = await this.callApi<void>('logseq.Editor.deletePage', [pageNameOrId]);

      // Invalidate relevant caches
      pageCache.delete('all-pages');
      pageCache.delete(`page-${pageNameOrId}`);
      blockCache.delete(`page-blocks-${pageNameOrId}`);

      return result;
    });
  }

  // Block operations
  async getBlock(blockId: string): Promise<LogseqBlock | null> {
    const cacheKey = `block-${blockId}`;

    return timeOperation('logseq.blocks.get', () =>
      blockCache.getOrSet(
        cacheKey,
        async () => {
          try {
            return await this.callApi<LogseqBlock>('logseq.Editor.getBlock', [blockId]);
          } catch (error) {
            if (error instanceof LogseqApiError && error.message.includes('not found')) {
              return null;
            }
            throw error;
          }
        },
        180000 // 3 minutes
      )
    );
  }

  async getBlockProperties(blockId: string): Promise<Record<string, unknown>> {
    return this.callApi<Record<string, unknown>>('logseq.Editor.getBlockProperties', [blockId]);
  }

  async insertBlock(
    parent: string,
    content: string,
    options?: {
      readonly properties?: Record<string, unknown>;
      readonly sibling?: boolean;
    }
  ): Promise<LogseqBlock> {
    const args: unknown[] = [parent, content];
    if (options?.properties) {
      args.push(options.properties);
    }
    if (options?.sibling) {
      args.push({ sibling: true });
    }
    return this.callApi<LogseqBlock>('logseq.Editor.insertBlock', args);
  }

  async updateBlock(blockId: string, content: string): Promise<LogseqBlock> {
    return this.callApi<LogseqBlock>('logseq.Editor.updateBlock', [blockId, content]);
  }

  async removeBlock(blockId: string): Promise<void> {
    return this.callApi<void>('logseq.Editor.removeBlock', [blockId]);
  }

  async upsertBlockProperty(blockId: string, key: string, value: unknown): Promise<void> {
    return this.callApi<void>('logseq.Editor.upsertBlockProperty', [blockId, key, value]);
  }

  async removeBlockProperty(blockId: string, key: string): Promise<void> {
    return this.callApi<void>('logseq.Editor.removeBlockProperty', [blockId, key]);
  }

  // Query operations
  async datascriptQuery(query: string): Promise<readonly unknown[]> {
    return this.callApi<readonly unknown[]>('logseq.DB.datascriptQuery', [query]);
  }

  async simpleQuery(query: string): Promise<readonly unknown[]> {
    return this.callApi<readonly unknown[]>('logseq.DB.q', [query]);
  }

  // App state operations
  async getCurrentGraph(): Promise<unknown> {
    return this.callApi('logseq.App.getCurrentGraph');
  }

  async getUserConfigs(): Promise<unknown> {
    return this.callApi('logseq.App.getUserConfigs');
  }

  async getStateFromStore(key: string): Promise<unknown> {
    return this.callApi('logseq.App.getStateFromStore', [key]);
  }

  async getCurrentPage(): Promise<LogseqPage | null> {
    return this.callApi<LogseqPage | null>('logseq.Editor.getCurrentPage');
  }

  async getCurrentBlock(): Promise<LogseqBlock | null> {
    return this.callApi<LogseqBlock | null>('logseq.Editor.getCurrentBlock');
  }

  /**
   * Handle and transform API errors
   */
  private handleApiError(error: unknown): Error {
    if (error instanceof LogseqApiError || error instanceof LogseqConnectionError) {
      return error;
    }

    if (axios.isAxiosError(error) || (error && typeof error === 'object' && 'response' in error)) {
      const axiosLikeError = error as any;

      if (axiosLikeError.code === 'ECONNREFUSED' || axiosLikeError.code === 'ENOTFOUND') {
        return new LogseqConnectionError(
          'Connection refused: Make sure Logseq is running with HTTP API enabled',
          error instanceof Error ? error : undefined
        );
      }

      if (axiosLikeError.response?.status === 401) {
        return new LogseqApiError(
          'Unauthorized: Check your API token',
          401,
          error instanceof Error ? error : undefined
        );
      }

      return new LogseqApiError(
        `HTTP error: ${axiosLikeError.message || 'Unknown error'}`,
        axiosLikeError.response?.status,
        error instanceof Error ? error : undefined
      );
    }

    if (error instanceof Error) {
      // Check if it's a connection error even if not an axios error
      if (
        (error as any).code === 'ECONNREFUSED' ||
        (error as any).code === 'ENOTFOUND' ||
        error.message.toLowerCase().includes('connection refused')
      ) {
        return new LogseqConnectionError(
          'Connection refused: Make sure Logseq is running with HTTP API enabled',
          error
        );
      }
      return new LogseqApiError(`Unexpected error: ${error.message}`, undefined, error);
    }

    return new LogseqApiError(`Unknown error: ${String(error)}`);
  }

  /**
   * Sleep utility for retry delays
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
