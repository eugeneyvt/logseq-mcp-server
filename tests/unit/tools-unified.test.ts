import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { createSearchTool } from '../../src/tools/search/index.js';
import { createGetTool } from '../../src/tools/get/index.js';
import { createEditTool } from '../../src/tools/edit/index.js';
import { createDeleteTool } from '../../src/tools/delete/index.js';
import { LogseqClient } from '../../src/logseq-client.js';

// Mock all handlers
vi.mock('../../src/tools/search/handler.js', () => ({
  handleSearchRequest: vi.fn()
}));

vi.mock('../../src/tools/get/handler.js', () => ({
  handleGetRequest: vi.fn()
}));

vi.mock('../../src/tools/edit/handler.js', () => ({
  handleEditRequest: vi.fn()
}));

vi.mock('../../src/tools/delete/handler.js', () => ({
  handleDeleteRequest: vi.fn()
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
import { handleGetRequest } from '../../src/tools/get/handler.js';
import { handleEditRequest } from '../../src/tools/edit/handler.js';
import { handleDeleteRequest } from '../../src/tools/delete/handler.js';

describe('Unified 4-Tool Architecture', () => {
  let mockClient: LogseqClient;
  let allTools: ReturnType<typeof createSearchTool | typeof createGetTool | typeof createEditTool | typeof createDeleteTool>[];

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

    // Create all 4 unified tools
    allTools = [
      createSearchTool(mockClient),
      createGetTool(mockClient),
      createEditTool(mockClient),
      createDeleteTool(mockClient)
    ];

    // Mock all handlers to return success
    (handleSearchRequest as Mock).mockResolvedValue({ content: [{ type: 'text', text: 'Search result' }] });
    (handleGetRequest as Mock).mockResolvedValue({ content: [{ type: 'text', text: 'Get result' }] });
    (handleEditRequest as Mock).mockResolvedValue({ content: [{ type: 'text', text: 'Edit result' }] });
    (handleDeleteRequest as Mock).mockResolvedValue({ content: [{ type: 'text', text: 'Delete result' }] });
  });

  describe('Tool Architecture Consistency', () => {
    it('should create exactly 4 unified tools', () => {
      expect(allTools).toHaveLength(4);
    });

    it('should have consistent tool structure', () => {
      allTools.forEach((tool) => {
        expect(tool).toHaveProperty('tool');
        expect(tool).toHaveProperty('handler');
        expect(typeof tool.handler).toBe('function');
        
        const toolDef = tool.tool;
        expect(toolDef).toHaveProperty('name');
        expect(toolDef).toHaveProperty('description');
        expect(toolDef).toHaveProperty('inputSchema');
        expect(typeof toolDef.name).toBe('string');
        expect(typeof toolDef.description).toBe('string');
        expect(typeof toolDef.inputSchema).toBe('object');
      });
    });

    it('should have unique tool names', () => {
      const toolNames = allTools.map(t => t.tool.name);
      const uniqueNames = [...new Set(toolNames)];
      
      expect(uniqueNames).toHaveLength(4);
      expect(uniqueNames).toContain('search');
      expect(uniqueNames).toContain('get');
      expect(uniqueNames).toContain('edit');
      expect(uniqueNames).toContain('delete');
    });

    it('should have descriptive tool descriptions', () => {
      allTools.forEach(tool => {
        expect(tool.tool.description.length).toBeGreaterThan(50);
        // Each tool should have a meaningful description
        expect(typeof tool.tool.description).toBe('string');
      });
    });

    it('should have well-structured input schemas', () => {
      allTools.forEach(tool => {
        const schema = tool.tool.inputSchema as any;
        expect(schema.type).toBe('object');
        expect(schema.properties).toBeDefined();
        expect(typeof schema.properties).toBe('object');
      });
    });
  });

  describe('Tool Operation Coverage', () => {
    it('should cover all CRUD operations', () => {
      // Search = Read (Query)
      // Get = Read (Specific)
      // Edit = Create/Update
      // Delete = Delete

      const searchTool = allTools.find(t => t.tool.name === 'search')!;
      const getTool = allTools.find(t => t.tool.name === 'get')!;
      const editTool = allTools.find(t => t.tool.name === 'edit')!;
      const deleteTool = allTools.find(t => t.tool.name === 'delete')!;

      expect(searchTool).toBeDefined();
      expect(getTool).toBeDefined();
      expect(editTool).toBeDefined();
      expect(deleteTool).toBeDefined();
    });

    it('should support all major content types', () => {
      const editSchema = allTools.find(t => t.tool.name === 'edit')!.tool.inputSchema as any;
      const getSchema = allTools.find(t => t.tool.name === 'get')!.tool.inputSchema as any;
      
      const editTypes = editSchema.properties.type.enum;
      const getTypes = getSchema.properties.type.enum;

      // Common content types should be in both
      ['page', 'block', 'template', 'properties', 'relations', 'tasks'].forEach(type => {
        expect(editTypes).toContain(type);
      });

      // Get tool should also support read-only types
      ['system', 'graph'].forEach(type => {
        expect(getTypes).toContain(type);
      });
    });

    it('should have appropriate operation types in edit tool', () => {
      const editTool = allTools.find(t => t.tool.name === 'edit')!;
      const schema = editTool.tool.inputSchema as any;
      const operations = schema.properties.operation.enum;

      expect(operations).toContain('create');
      expect(operations).toContain('update');
      expect(operations).toContain('append');
      expect(operations).toContain('prepend');
      expect(operations).toContain('move');
      expect(operations).toContain('remove');
    });
  });

  describe('Handler Integration', () => {
    it('should call appropriate handlers for each tool', async () => {
      const searchTool = allTools.find(t => t.tool.name === 'search')!;
      const getTool = allTools.find(t => t.tool.name === 'get')!;
      const editTool = allTools.find(t => t.tool.name === 'edit')!;
      const deleteTool = allTools.find(t => t.tool.name === 'delete')!;

      // Test each tool handler
      await searchTool.handler({ query: 'test' });
      expect(handleSearchRequest).toHaveBeenCalledWith(mockClient, { query: 'test' });

      await getTool.handler({ type: 'page', target: 'Test Page' });
      expect(handleGetRequest).toHaveBeenCalledWith(mockClient, { type: 'page', target: 'Test Page' });

      await editTool.handler({ type: 'page', operation: 'create', target: 'New Page' });
      expect(handleEditRequest).toHaveBeenCalledWith(mockClient, { type: 'page', operation: 'create', target: 'New Page' });

      await deleteTool.handler({ type: 'page', target: 'Old Page', confirmDestroy: true });
      expect(handleDeleteRequest).toHaveBeenCalledWith(mockClient, { type: 'page', target: 'Old Page', confirmDestroy: true });
    });

    it('should handle errors consistently across tools', async () => {
      const errorMessage = 'Handler failed';
      (handleSearchRequest as Mock).mockRejectedValue(new Error(errorMessage));
      (handleGetRequest as Mock).mockRejectedValue(new Error(errorMessage));
      (handleEditRequest as Mock).mockRejectedValue(new Error(errorMessage));
      (handleDeleteRequest as Mock).mockRejectedValue(new Error(errorMessage));

      const searchTool = allTools.find(t => t.tool.name === 'search')!;
      const getTool = allTools.find(t => t.tool.name === 'get')!;
      const editTool = allTools.find(t => t.tool.name === 'edit')!;
      const deleteTool = allTools.find(t => t.tool.name === 'delete')!;

      await expect(searchTool.handler({})).rejects.toThrow(errorMessage);
      await expect(getTool.handler({ type: 'page', target: 'test' })).rejects.toThrow(errorMessage);
      await expect(editTool.handler({ type: 'page', operation: 'create', target: 'test' })).rejects.toThrow(errorMessage);
      await expect(deleteTool.handler({ type: 'page', target: 'test', confirmDestroy: true })).rejects.toThrow(errorMessage);
    });
  });

  describe('Schema Validation Requirements', () => {
    it('should have required fields properly defined', () => {
      const getTool = allTools.find(t => t.tool.name === 'get')!;
      const editTool = allTools.find(t => t.tool.name === 'edit')!;
      const deleteTool = allTools.find(t => t.tool.name === 'delete')!;

      const getSchema = getTool.tool.inputSchema as any;
      const editSchema = editTool.tool.inputSchema as any;
      const deleteSchema = deleteTool.tool.inputSchema as any;

      expect(getSchema.required).toEqual(['type', 'target']);
      expect(editSchema.required).toEqual(['type', 'operation', 'target']);
      expect(deleteSchema.required).toEqual(['type', 'target', 'confirmDestroy']);
    });

    it('should have appropriate safety measures', () => {
      const deleteTool = allTools.find(t => t.tool.name === 'delete')!;
      const deleteSchema = deleteTool.tool.inputSchema as any;

      // Delete tool should require explicit confirmation
      expect(deleteSchema.required).toContain('confirmDestroy');
      expect(deleteSchema.properties.confirmDestroy.type).toBe('boolean');

      // Should have simulation mode
      expect(deleteSchema.properties.simulate).toBeDefined();
      expect(deleteSchema.properties.simulate.type).toBe('boolean');
    });

    it('should support both single and bulk operations', () => {
      allTools.forEach(tool => {
        if (tool.tool.name === 'search') return; // Search doesn't use target the same way

        const schema = tool.tool.inputSchema as any;
        const targetProperty = schema.properties.target;

        if (targetProperty.oneOf) {
          expect(targetProperty.oneOf).toHaveLength(2);
          expect(targetProperty.oneOf[0].type).toBe('string');
          expect(targetProperty.oneOf[1].type).toBe('array');
        }
      });
    });
  });

  describe('Tool Performance and Reliability', () => {
    it('should have reasonable default limits', () => {
      const searchTool = allTools.find(t => t.tool.name === 'search')!;
      const searchSchema = searchTool.tool.inputSchema as any;

      expect(searchSchema.properties.limit.default).toBe(20);
      expect(searchSchema.properties.limit.maximum).toBe(100);
    });

    it('should support idempotency for safe operations', () => {
      const editTool = allTools.find(t => t.tool.name === 'edit')!;
      const deleteTool = allTools.find(t => t.tool.name === 'delete')!;

      const editSchema = editTool.tool.inputSchema as any;
      const deleteSchema = deleteTool.tool.inputSchema as any;

      expect(editSchema.properties.idempotencyKey).toBeDefined();
      expect(deleteSchema.properties.control.properties.idempotencyKey).toBeDefined();
    });

    it('should have dry run capabilities for destructive operations', () => {
      const editTool = allTools.find(t => t.tool.name === 'edit')!;
      const deleteTool = allTools.find(t => t.tool.name === 'delete')!;

      const editSchema = editTool.tool.inputSchema as any;
      const deleteSchema = deleteTool.tool.inputSchema as any;

      expect(editSchema.properties.dryRun).toBeDefined();
      expect(deleteSchema.properties.simulate).toBeDefined();
    });
  });
});