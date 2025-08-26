/**
 * Simplified LogseqClient for clean architecture
 * Essential client functionality without over-engineering
 */

import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { logger } from './utils/system/logger.js';
import type { Config } from './schemas/config.js';

export class LogseqClient {
  private readonly client: AxiosInstance;

  constructor(private readonly config: Config) {
    this.client = axios.create({
      baseURL: config.apiUrl,
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'logseq-mcp-server/2.0.0',
      },
      timeout: config.timeout || 30000,
      validateStatus: (status) => status < 500,
    });

    this.setupBasicInterceptors();
  }

  private setupBasicInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        logger.debug({ method: config.method, url: config.url }, 'API request');
        return config;
      },
      (error: AxiosError) => {
        logger.error({ error: error.message }, 'Request failed');
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.debug({ status: response.status, url: response.config.url }, 'API response');
        return response;
      },
      (error: AxiosError) => {
        logger.error({ 
          status: error.response?.status, 
          message: error.message 
        }, 'Response error');
        return Promise.reject(error);
      }
    );
  }

  /**
   * Call Logseq API method with parameters
   */
  async callApi(method: string, params: unknown[] = []): Promise<unknown> {
    try {
      const response = await this.client.post('/api', {
        method,
        args: params
      });

      if (response.status !== 200) {
        throw new Error(`API call failed with status ${response.status}`);
      }

      return response.data;
    } catch (error) {
      logger.error({ method, params, error }, 'API call failed');
      throw error;
    }
  }

  /**
   * Test connection to Logseq API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getAllPages();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Essential API methods
   */
  async getAllPages(): Promise<unknown[]> {
    return (await this.callApi('logseq.Editor.getAllPages')) as unknown[];
  }

  async getPage(pageName: string): Promise<unknown> {
    return await this.callApi('logseq.Editor.getPage', [pageName]);
  }

  async getPageBlocksTree(pageName: string): Promise<unknown[]> {
    return (await this.callApi('logseq.Editor.getPageBlocksTree', [pageName])) as unknown[];
  }

  async getBlock(blockUuid: string): Promise<unknown> {
    return await this.callApi('logseq.Editor.getBlock', [blockUuid]);
  }

  async createPage(pageName: string): Promise<unknown> {
    return await this.callApi('logseq.Editor.createPage', [pageName]);
  }

  async insertBlock(target: string, content: string, options?: unknown): Promise<unknown> {
    return await this.callApi('logseq.Editor.insertBlock', [target, content, options]);
  }

  async updateBlock(blockUuid: string, content: string): Promise<unknown> {
    return await this.callApi('logseq.Editor.updateBlock', [blockUuid, content]);
  }

  async removeBlock(blockUuid: string): Promise<unknown> {
    return await this.callApi('logseq.Editor.removeBlock', [blockUuid]);
  }

  async moveBlock(blockUuid: string, targetUuid: string, options?: unknown): Promise<unknown> {
    return await this.callApi('logseq.Editor.moveBlock', [blockUuid, targetUuid, options]);
  }

  async deletePage(pageName: string): Promise<unknown> {
    return await this.callApi('logseq.Editor.deletePage', [pageName]);
  }

  async upsertBlockProperty(blockUuid: string, key: string, value: unknown): Promise<unknown> {
    return await this.callApi('logseq.Editor.upsertBlockProperty', [blockUuid, key, value]);
  }

  async removeBlockProperty(blockUuid: string, key: string): Promise<unknown> {
    return await this.callApi('logseq.Editor.removeBlockProperty', [blockUuid, key]);
  }
}