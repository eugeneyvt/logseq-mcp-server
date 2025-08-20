import axios from 'axios';
import { LogseqApiError, LogseqConnectionError } from '../errors/index.js';
import type { Config } from '../schemas/config.js';
import type { LogseqApiResponse } from '../schemas/logseq.js';
import { logger } from '../utils/logger.js';
// Import timeOperation only when needed
// import { timeOperation } from '../utils/monitoring.js';

import type { AxiosError, AxiosInstance } from 'axios';

/**
 * Core Logseq API client with connection and base API functionality
 */
export class CoreLogseqClient {
  protected readonly client: AxiosInstance;

  constructor(protected readonly config: Config) {
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

    this.setupInterceptors();
  }

  /**
   * Set up request and response interceptors
   */
  private setupInterceptors(): void {
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
        logger.debug(
          {
            status: error.response?.status,
            method: error.config?.method,
            url: error.config?.url,
            error: error.message,
          },
          'API request failed'
        );
        return Promise.reject(error);
      }
    );
  }

  /**
   * Make a call to the Logseq API with retry logic and comprehensive error handling
   */
  async callApi<T = unknown>(method: string, args: readonly unknown[] = []): Promise<T> {
    return this.withRetry(async () => {
      try {
        const response = await this.client.post<LogseqApiResponse<T>>('/api', {
          method,
          args: args,
        });

        if (response.status >= 400) {
          throw new LogseqApiError(
            response.data?.error || `HTTP ${response.status}`,
            response.status
          );
        }

        if (response.data?.error) {
          throw new LogseqApiError(response.data.error);
        }

        // Extract the actual data from the Logseq API response structure
        // Logseq API can return data directly or nested under 'data' property
        const responseData = response.data as LogseqApiResponse<T>;
        if (responseData?.data !== undefined) {
          return responseData.data;
        }
        // If no nested 'data' property, return the response directly
        return responseData as T;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            throw new LogseqConnectionError(
              'Connection refused: Make sure Logseq is running with HTTP API enabled',
              error
            );
          }
          if (error.response?.status === 401) {
            throw new LogseqApiError('Unauthorized: Invalid API token', 401);
          }
          if (error.response?.status === 404) {
            throw new LogseqApiError('Resource not found', 404);
          }
          throw new LogseqApiError(`HTTP ${error.response?.status}: ${error.message}`, error.response?.status);
        }
        throw error;
      }
    });
  }

  /**
   * Test connection to Logseq API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.callApi('logseq.App.getUserConfigs');
      return true;
    } catch (error) {
      logger.warn({ error }, 'Connection test failed');
      return false;
    }
  }

  /**
   * Get current graph information
   */
  async getCurrentGraph(): Promise<unknown> {
    return this.callApi('logseq.App.getCurrentGraph');
  }

  /**
   * Get user configurations
   */
  async getUserConfigs(): Promise<unknown> {
    return this.callApi('logseq.App.getUserConfigs');
  }

  /**
   * Get state from store
   */
  async getStateFromStore(key: string): Promise<unknown> {
    return this.callApi('logseq.App.getStateFromStore', [key]);
  }

  /**
   * Retry logic with exponential backoff
   */
  private async withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }

        const isRetryable = this.isRetryableError(error);
        if (!isRetryable) {
          throw error;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
        logger.warn(
          { attempt, error: error instanceof Error ? error.message : String(error) },
          'API call failed, retrying'
        );
        
        await this.sleep(delay);
      }
    }

    throw new Error('Unexpected retry logic error');
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof LogseqConnectionError) {
      return true;
    }
    if (error instanceof LogseqApiError) {
      return error.statusCode ? error.statusCode >= 500 : false;
    }
    return false;
  }

  /**
   * Sleep for the specified number of milliseconds
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}