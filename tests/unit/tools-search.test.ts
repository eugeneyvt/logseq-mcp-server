import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { createSearchTool } from '../../src/tools/search/index.js';
import { LogseqClient } from '../../src/logseq-client.js';

// Mock the handler and dependencies
vi.mock('../../src/tools/search/handler.js', () => ({
  handleSearchRequest: vi.fn()
}));

vi.mock('../../src/utils/system/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}));

import { handleSearchRequest } from '../../src/tools/search/handler.js';

describe('Search Tool', () => {
  let mockClient: LogseqClient;
  let mockHandleSearchRequest: Mock;

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

    mockHandleSearchRequest = handleSearchRequest as Mock;
  });

  describe('createSearchTool', () => {
    it('should create search tool with correct structure', () => {
      const searchTool = createSearchTool(mockClient);

      expect(searchTool).toHaveProperty('tool');
      expect(searchTool).toHaveProperty('handler');
      
      // Check tool definition
      expect(searchTool.tool.name).toBe('search');
      expect(searchTool.tool.description).toContain('Advanced search');
      expect(searchTool.tool.inputSchema).toBeDefined();
      expect(typeof searchTool.handler).toBe('function');
    });

    it('should have correct tool schema structure', () => {
      const searchTool = createSearchTool(mockClient);
      const schema = searchTool.tool.inputSchema;

      expect(schema).toHaveProperty('type', 'object');
      expect(schema).toHaveProperty('properties');
      
      // Check key properties exist
      const properties = (schema as any).properties;
      expect(properties).toHaveProperty('query');
      expect(properties).toHaveProperty('target');
      expect(properties).toHaveProperty('filter');
      expect(properties).toHaveProperty('scope');
      expect(properties).toHaveProperty('sort');
      expect(properties).toHaveProperty('limit');
    });

    it('should have target enum values', () => {
      const searchTool = createSearchTool(mockClient);
      const schema = searchTool.tool.inputSchema as any;
      const targetEnum = schema.properties.target.enum;

      expect(targetEnum).toContain('blocks');
      expect(targetEnum).toContain('pages');
      expect(targetEnum).toContain('tasks');
      expect(targetEnum).toContain('templates');
      expect(targetEnum).toContain('both');
    });

    it('should have proper sort options', () => {
      const searchTool = createSearchTool(mockClient);
      const schema = searchTool.tool.inputSchema as any;
      const sortEnum = schema.properties.sort.enum;

      expect(sortEnum).toContain('relevance');
      expect(sortEnum).toContain('created');
      expect(sortEnum).toContain('updated');
      expect(sortEnum).toContain('title');
    });

    it('should have limit constraints', () => {
      const searchTool = createSearchTool(mockClient);
      const schema = searchTool.tool.inputSchema as any;
      const limitProperty = schema.properties.limit;

      expect(limitProperty.minimum).toBe(1);
      expect(limitProperty.maximum).toBe(100);
      expect(limitProperty.default).toBe(20);
    });
  });

  describe('handler', () => {
    it('should call handleSearchRequest with client and args', async () => {
      const searchTool = createSearchTool(mockClient);
      const mockResult = {
        content: [{ type: 'text', text: 'Search results' }]
      };
      
      mockHandleSearchRequest.mockResolvedValue(mockResult);

      const testArgs = { query: 'test search', target: 'both' };
      const result = await searchTool.handler(testArgs);

      expect(mockHandleSearchRequest).toHaveBeenCalledWith(mockClient, testArgs);
      expect(result).toEqual(mockResult);
    });

    it('should handle handler errors', async () => {
      const searchTool = createSearchTool(mockClient);
      const mockError = new Error('Search failed');
      
      mockHandleSearchRequest.mockRejectedValue(mockError);

      const testArgs = { query: 'failing search' };
      await expect(searchTool.handler(testArgs)).rejects.toThrow('Search failed');
    });

    it('should pass through different argument types', async () => {
      const searchTool = createSearchTool(mockClient);
      mockHandleSearchRequest.mockResolvedValue({ content: [] });

      // Test with undefined args
      await searchTool.handler(undefined);
      expect(mockHandleSearchRequest).toHaveBeenCalledWith(mockClient, undefined);

      // Test with empty object
      await searchTool.handler({});
      expect(mockHandleSearchRequest).toHaveBeenCalledWith(mockClient, {});

      // Test with complex args
      const complexArgs = {
        query: 'complex search',
        filter: { tags_all: ['important'], contains: 'project' },
        scope: { namespace: 'work/' },
        sort: 'updated',
        limit: 50
      };
      
      await searchTool.handler(complexArgs);
      expect(mockHandleSearchRequest).toHaveBeenCalledWith(mockClient, complexArgs);
    });
  });

  describe('schema validation features', () => {
    it('should support comprehensive filter options', () => {
      const searchTool = createSearchTool(mockClient);
      const schema = searchTool.tool.inputSchema as any;
      const filterProperties = schema.properties.filter.properties;

      // Check all filter options are present
      expect(filterProperties).toHaveProperty('contains');
      expect(filterProperties).toHaveProperty('exclude');
      expect(filterProperties).toHaveProperty('tags_all');
      expect(filterProperties).toHaveProperty('tags_any');
      expect(filterProperties).toHaveProperty('properties_all');
      expect(filterProperties).toHaveProperty('properties_any');
      expect(filterProperties).toHaveProperty('createdAfter');
      expect(filterProperties).toHaveProperty('createdBefore');
      expect(filterProperties).toHaveProperty('updatedAfter');
      expect(filterProperties).toHaveProperty('updatedBefore');
      expect(filterProperties).toHaveProperty('todoState');
      expect(filterProperties).toHaveProperty('hasRefs');
      expect(filterProperties).toHaveProperty('lengthMin');
      expect(filterProperties).toHaveProperty('lengthMax');
    });

    it('should support task states for todoState filter', () => {
      const searchTool = createSearchTool(mockClient);
      const schema = searchTool.tool.inputSchema as any;
      const todoStateEnum = schema.properties.filter.properties.todoState.enum;

      expect(todoStateEnum).toContain('TODO');
      expect(todoStateEnum).toContain('DOING');
      expect(todoStateEnum).toContain('DONE');
      expect(todoStateEnum).toContain('WAITING');
      expect(todoStateEnum).toContain('LATER');
      expect(todoStateEnum).toContain('NOW');
      expect(todoStateEnum).toContain('CANCELED');
    });

    it('should support scope options', () => {
      const searchTool = createSearchTool(mockClient);
      const schema = searchTool.tool.inputSchema as any;
      const scopeProperties = schema.properties.scope.properties;

      expect(scopeProperties).toHaveProperty('page_titles');
      expect(scopeProperties).toHaveProperty('tag');
      expect(scopeProperties).toHaveProperty('namespace');
      expect(scopeProperties).toHaveProperty('journal');
      expect(scopeProperties).toHaveProperty('parent_block_id');
    });
  });
});