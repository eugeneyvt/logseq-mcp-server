import { describe, it, expect, beforeEach, vi, Mock, Mocked } from 'vitest';
import axios from 'axios';
import { LogseqClient } from '../logseq-client.js';
import { LogseqApiError, LogseqConnectionError } from '../errors/index.js';
import type { Config } from '../schemas/config.js';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as Mocked<typeof axios>;

// Mock axios.isAxiosError to return true for our mock errors
mockedAxios.isAxiosError = vi.fn((error: any) => error && error.isAxiosError === true);

// Mock cache and monitoring
vi.mock('./cache.js', () => ({
  pageCache: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getOrSet: vi.fn((key, fetcher) => fetcher()),
  },
  blockCache: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getOrSet: vi.fn((key, fetcher) => fetcher()),
  },
}));

vi.mock('./monitoring.js', () => ({
  timeOperation: vi.fn((name, operation) => operation()),
}));

describe('LogseqClient', () => {
  let client: LogseqClient;
  let mockAxiosInstance: { post: Mock; interceptors: any };

  const mockConfig: Config = {
    apiUrl: 'http://localhost:12315',
    apiToken: 'test-token',
    timeout: 10000,
    maxRetries: 3,
    debug: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockAxiosInstance = {
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    client = new LogseqClient(mockConfig);
  });

  describe('constructor', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: mockConfig.apiUrl,
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
          'User-Agent': 'logseq-mcp-server/1.0.2',
        },
        timeout: mockConfig.timeout,
        validateStatus: expect.any(Function),
      });
    });

    it('should set up request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('callApi', () => {
    it('should make successful API call', async () => {
      const mockResponse = {
        status: 200,
        data: { data: 'test-result' },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.callApi('test.method', ['arg1', 'arg2']);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api', {
        method: 'test.method',
        args: ['arg1', 'arg2'],
      });
      expect(result).toBe('test-result');
    });

    it('should handle API error response', async () => {
      const mockResponse = {
        status: 200,
        data: { error: 'API error message' },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await expect(client.callApi('test.method')).rejects.toThrow(LogseqApiError);
    });

    it('should handle 401 unauthorized error', async () => {
      const mockResponse = {
        status: 401,
        statusText: 'Unauthorized',
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await expect(client.callApi('test.method')).rejects.toThrow(LogseqApiError);
    });

    it('should handle connection refused error', async () => {
      const connectionError = new Error('Connection refused');
      (connectionError as any).code = 'ECONNREFUSED';
      (connectionError as any).isAxiosError = true;
      (connectionError as any).response = undefined; // No response for connection errors
      mockAxiosInstance.post.mockRejectedValue(connectionError);

      await expect(client.callApi('test.method')).rejects.toThrow(LogseqConnectionError);
    });

    it('should retry on retryable errors', async () => {
      const connectionError = new Error('Network error');
      (connectionError as any).code = 'ECONNREFUSED';
      (connectionError as any).isAxiosError = true;
      (connectionError as any).response = undefined; // No response for connection errors

      mockAxiosInstance.post
        .mockRejectedValueOnce(connectionError)
        .mockRejectedValueOnce(connectionError)
        .mockResolvedValue({ status: 200, data: { data: 'success' } });

      const result = await client.callApi('test.method');

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
      expect(result).toBe('success');
    });

    it('should not retry on non-retryable errors', async () => {
      const authError = {
        response: { status: 401 },
      };
      mockAxiosInstance.post.mockRejectedValue(authError);

      await expect(client.callApi('test.method')).rejects.toThrow();
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAllPages', () => {
    it('should call correct API method', async () => {
      const mockPages = [
        { id: 1, name: 'Page 1', originalName: 'Page 1' },
        { id: 2, name: 'Page 2', originalName: 'Page 2' },
      ];

      mockAxiosInstance.post.mockResolvedValue({
        status: 200,
        data: { data: mockPages },
      });

      const result = await client.getAllPages();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api', {
        method: 'logseq.Editor.getAllPages',
        args: [],
      });
      expect(result).toEqual(mockPages);
    });
  });

  describe('getPage', () => {
    it('should get page by name', async () => {
      const mockPage = { id: 1, name: 'Test Page', originalName: 'Test Page' };
      const mockPages = [mockPage];

      // Mock getAllPages call
      mockAxiosInstance.post
        .mockResolvedValueOnce({
          status: 200,
          data: { data: mockPages },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: { data: mockPage },
        });

      const result = await client.getPage('Test Page');

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
      expect(mockAxiosInstance.post).toHaveBeenNthCalledWith(1, '/api', {
        method: 'logseq.Editor.getAllPages',
        args: [],
      });
      expect(mockAxiosInstance.post).toHaveBeenNthCalledWith(2, '/api', {
        method: 'logseq.Editor.getPage',
        args: [1], // Uses page ID, not name
      });
      expect(result).toEqual(mockPage);
    });

    it('should return null for non-existent page', async () => {
      const mockPages = [{ id: 1, name: 'Test Page', originalName: 'Test Page' }];
      const notFoundError = new LogseqApiError('Page not found', 404);

      // Mock getAllPages call
      mockAxiosInstance.post
        .mockResolvedValueOnce({
          status: 200,
          data: { data: mockPages },
        })
        .mockRejectedValueOnce(notFoundError);

      const result = await client.getPage('Non-existent Page');

      expect(result).toBeNull();
    });
  });

  describe('createPage', () => {
    it('should create page without properties', async () => {
      const mockPage = { id: 1, name: 'New Page', originalName: 'New Page' };

      mockAxiosInstance.post.mockResolvedValue({
        status: 200,
        data: { data: mockPage },
      });

      const result = await client.createPage('New Page');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api', {
        method: 'logseq.Editor.createPage',
        args: ['New Page'],
      });
      expect(result).toEqual(mockPage);
    });

    it('should create page with properties', async () => {
      const mockPage = { id: 1, name: 'New Page', originalName: 'New Page' };
      const properties = { type: 'journal', tags: ['important'] };

      mockAxiosInstance.post.mockResolvedValue({
        status: 200,
        data: { data: mockPage },
      });

      const result = await client.createPage('New Page', properties);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api', {
        method: 'logseq.Editor.createPage',
        args: ['New Page', properties],
      });
      expect(result).toEqual(mockPage);
    });
  });

  describe('getBlock', () => {
    it('should get block by ID', async () => {
      const mockBlock = {
        id: 'test-uuid',
        content: 'Test block content',
      };

      mockAxiosInstance.post.mockResolvedValue({
        status: 200,
        data: { data: mockBlock },
      });

      const result = await client.getBlock('test-uuid');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api', {
        method: 'logseq.Editor.getBlock',
        args: ['test-uuid'],
      });
      expect(result).toEqual(mockBlock);
    });

    it('should throw LogseqApiError for non-existent block', async () => {
      const notFoundError = new LogseqApiError('Block not found', 404);
      mockAxiosInstance.post.mockRejectedValue(notFoundError);

      await expect(client.getBlock('non-existent-uuid')).rejects.toThrow(LogseqApiError);
    });
  });

  describe('datascriptQuery', () => {
    it('should execute datascript query', async () => {
      const mockResults = [['result1'], ['result2']];
      const query = '[:find ?b :where [?b :block/content ?content]]';

      mockAxiosInstance.post.mockResolvedValue({
        status: 200,
        data: { data: mockResults },
      });

      const result = await client.datascriptQuery(query);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api', {
        method: 'logseq.DB.datascriptQuery',
        args: [query],
      });
      expect(result).toEqual(mockResults);
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        status: 200,
        data: { data: { name: 'test-graph' } },
      });

      const result = await client.testConnection();

      expect(result).toBe(true);
    });

    it('should return false for failed connection', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Connection failed'));

      const result = await client.testConnection();

      expect(result).toBe(false);
    });
  });
});
