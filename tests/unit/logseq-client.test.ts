import { describe, it, expect, beforeEach, vi, Mock, Mocked } from 'vitest';
import axios from 'axios';
import { LogseqClient } from '../../src/logseq-client.js';
import type { Config } from '../../src/schemas/config.js';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as Mocked<typeof axios>;

// Mock axios.isAxiosError to return true for our mock errors
mockedAxios.isAxiosError = vi.fn((error: any) => error && error.isAxiosError === true);

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
          'User-Agent': 'logseq-mcp-server/2.0.0',
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
      expect(result).toEqual({ data: 'test-result' });
    });

    it('should handle non-200 status codes', async () => {
      const mockResponse = {
        status: 400,
        data: 'Bad request',
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await expect(client.callApi('test.method')).rejects.toThrow('API call failed with status 400');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockAxiosInstance.post.mockRejectedValue(networkError);

      await expect(client.callApi('test.method')).rejects.toThrow('Network error');
    });
  });

  describe('getAllPages', () => {
    it('should call correct API method', async () => {
      const mockPages = [
        { id: 1, name: 'Page 1' },
        { id: 2, name: 'Page 2' },
      ];

      mockAxiosInstance.post.mockResolvedValue({
        status: 200,
        data: mockPages,
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
      const mockPage = { id: 1, name: 'Test Page' };

      mockAxiosInstance.post.mockResolvedValue({
        status: 200,
        data: mockPage,
      });

      const result = await client.getPage('Test Page');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api', {
        method: 'logseq.Editor.getPage',
        args: ['Test Page'],
      });
      expect(result).toEqual(mockPage);
    });
  });

  describe('createPage', () => {
    it('should create page', async () => {
      const mockPage = { id: 1, name: 'New Page' };

      mockAxiosInstance.post.mockResolvedValue({
        status: 200,
        data: mockPage,
      });

      const result = await client.createPage('New Page');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api', {
        method: 'logseq.Editor.createPage',
        args: ['New Page'],
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
        data: mockBlock,
      });

      const result = await client.getBlock('test-uuid');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api', {
        method: 'logseq.Editor.getBlock',
        args: ['test-uuid'],
      });
      expect(result).toEqual(mockBlock);
    });

    it('should throw error for non-existent block', async () => {
      const notFoundError = new Error('Block not found');
      mockAxiosInstance.post.mockRejectedValue(notFoundError);

      await expect(client.getBlock('non-existent-uuid')).rejects.toThrow('Block not found');
    });
  });

  describe('insertBlock', () => {
    it('should insert block', async () => {
      const mockBlock = { id: 'new-block-uuid', content: 'New content' };

      mockAxiosInstance.post.mockResolvedValue({
        status: 200,
        data: mockBlock,
      });

      const result = await client.insertBlock('target-uuid', 'New content');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api', {
        method: 'logseq.Editor.insertBlock',
        args: ['target-uuid', 'New content', undefined],
      });
      expect(result).toEqual(mockBlock);
    });
  });

  describe('updateBlock', () => {
    it('should update block content', async () => {
      const mockBlock = { id: 'test-uuid', content: 'Updated content' };

      mockAxiosInstance.post.mockResolvedValue({
        status: 200,
        data: mockBlock,
      });

      const result = await client.updateBlock('test-uuid', 'Updated content');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api', {
        method: 'logseq.Editor.updateBlock',
        args: ['test-uuid', 'Updated content'],
      });
      expect(result).toEqual(mockBlock);
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        status: 200,
        data: [],
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