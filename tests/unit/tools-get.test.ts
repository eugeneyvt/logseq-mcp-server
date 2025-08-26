import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { createGetTool } from '../../src/tools/get/index.js';
import { LogseqClient } from '../../src/logseq-client.js';

// Mock the handler and dependencies
vi.mock('../../src/tools/get/handler.js', () => ({
  handleGetRequest: vi.fn()
}));

vi.mock('../../src/utils/system/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}));

import { handleGetRequest } from '../../src/tools/get/handler.js';

describe('Get Tool', () => {
  let mockClient: LogseqClient;
  let mockHandleGetRequest: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockClient = {
      callApi: vi.fn(),
      testConnection: vi.fn(),
      getAllPages: vi.fn(),
      getPage: vi.fn(),
      getPageBlocksTree: vi.fn(),
      getBlock: vi.fn(),
      createPage: vi.fn(),
      insertBlock: vi.fn(),
      updateBlock: vi.fn(),
      removeBlock: vi.fn(),
      moveBlock: vi.fn(),
      deletePage: vi.fn(),
      upsertBlockProperty: vi.fn(),
      removeBlockProperty: vi.fn(),
    } as any;

    mockHandleGetRequest = handleGetRequest as Mock;
  });

  describe('createGetTool', () => {
    it('should create get tool with correct structure', () => {
      const getTool = createGetTool(mockClient);

      expect(getTool).toHaveProperty('tool');
      expect(getTool).toHaveProperty('handler');
      
      // Check tool definition
      expect(getTool.tool.name).toBe('get');
      expect(getTool.tool.description).toContain('Retrieve specific content');
      expect(getTool.tool.inputSchema).toBeDefined();
      expect(typeof getTool.handler).toBe('function');
    });

    it('should have correct tool schema structure', () => {
      const getTool = createGetTool(mockClient);
      const schema = getTool.tool.inputSchema;

      expect(schema).toHaveProperty('type', 'object');
      expect(schema).toHaveProperty('properties');
      expect(schema).toHaveProperty('required');
      
      // Check required fields
      const required = (schema as any).required;
      expect(required).toContain('type');
      expect(required).toContain('target');
    });

    it('should have all content types in enum', () => {
      const getTool = createGetTool(mockClient);
      const schema = getTool.tool.inputSchema as any;
      const typeEnum = schema.properties.type.enum;

      expect(typeEnum).toContain('page');
      expect(typeEnum).toContain('block');
      expect(typeEnum).toContain('template');
      expect(typeEnum).toContain('properties');
      expect(typeEnum).toContain('relations');
      expect(typeEnum).toContain('tasks');
      expect(typeEnum).toContain('system');
      expect(typeEnum).toContain('graph');
    });

    it('should support both string and array targets', () => {
      const getTool = createGetTool(mockClient);
      const schema = getTool.tool.inputSchema as any;
      const targetOneOf = schema.properties.target.oneOf;

      expect(targetOneOf).toHaveLength(2);
      expect(targetOneOf[0]).toEqual({ type: 'string' });
      expect(targetOneOf[1]).toEqual({ 
        type: 'array', 
        items: { type: 'string' } 
      });
    });

    it('should have include options', () => {
      const getTool = createGetTool(mockClient);
      const schema = getTool.tool.inputSchema as any;
      const includeProperties = schema.properties.include.properties;

      expect(includeProperties).toHaveProperty('content');
      expect(includeProperties).toHaveProperty('properties');
      expect(includeProperties).toHaveProperty('backlinks');
      expect(includeProperties).toHaveProperty('children');
    });

    it('should have format options', () => {
      const getTool = createGetTool(mockClient);
      const schema = getTool.tool.inputSchema as any;
      const formatEnum = schema.properties.format.enum;

      expect(formatEnum).toContain('tree');
      expect(formatEnum).toContain('flat');
      expect(schema.properties.format.default).toBe('tree');
    });

    it('should have depth constraints', () => {
      const getTool = createGetTool(mockClient);
      const schema = getTool.tool.inputSchema as any;
      const depthProperty = schema.properties.depth;

      expect(depthProperty.minimum).toBe(1);
      expect(depthProperty.maximum).toBe(5);
      expect(depthProperty.default).toBe(2);
    });

    it('should have preview length constraints', () => {
      const getTool = createGetTool(mockClient);
      const schema = getTool.tool.inputSchema as any;
      const previewProperty = schema.properties.preview_length;

      expect(previewProperty.minimum).toBe(100);
      expect(previewProperty.maximum).toBe(5000);
      expect(previewProperty.default).toBe(500);
    });
  });

  describe('handler', () => {
    it('should call handleGetRequest with client and args', async () => {
      const getTool = createGetTool(mockClient);
      const mockResult = {
        content: [{ type: 'text', text: 'Get results' }]
      };
      
      mockHandleGetRequest.mockResolvedValue(mockResult);

      const testArgs = { 
        type: 'page', 
        target: 'Test Page',
        include: { content: true, properties: true }
      };
      const result = await getTool.handler(testArgs);

      expect(mockHandleGetRequest).toHaveBeenCalledWith(mockClient, testArgs);
      expect(result).toEqual(mockResult);
    });

    it('should handle handler errors', async () => {
      const getTool = createGetTool(mockClient);
      const mockError = new Error('Get operation failed');
      
      mockHandleGetRequest.mockRejectedValue(mockError);

      const testArgs = { type: 'block', target: 'invalid-uuid' };
      await expect(getTool.handler(testArgs)).rejects.toThrow('Get operation failed');
    });

    it('should handle different argument combinations', async () => {
      const getTool = createGetTool(mockClient);
      mockHandleGetRequest.mockResolvedValue({ content: [] });

      // Test single target
      await getTool.handler({ type: 'page', target: 'Single Page' });
      expect(mockHandleGetRequest).toHaveBeenCalledWith(mockClient, { 
        type: 'page', 
        target: 'Single Page' 
      });

      // Test array target
      await getTool.handler({ 
        type: 'block', 
        target: ['uuid1', 'uuid2'], 
        format: 'flat' 
      });
      expect(mockHandleGetRequest).toHaveBeenCalledWith(mockClient, { 
        type: 'block', 
        target: ['uuid1', 'uuid2'], 
        format: 'flat' 
      });

      // Test with all options
      const complexArgs = {
        type: 'system',
        target: 'graph-info',
        include: {
          content: true,
          properties: true,
          backlinks: false,
          children: true
        },
        format: 'tree',
        depth: 3,
        preview_length: 1000
      };
      
      await getTool.handler(complexArgs);
      expect(mockHandleGetRequest).toHaveBeenCalledWith(mockClient, complexArgs);
    });

    it('should pass through minimal required arguments', async () => {
      const getTool = createGetTool(mockClient);
      mockHandleGetRequest.mockResolvedValue({ content: [] });

      const minimalArgs = { type: 'template', target: 'daily-note' };
      await getTool.handler(minimalArgs);

      expect(mockHandleGetRequest).toHaveBeenCalledWith(mockClient, minimalArgs);
    });
  });
});