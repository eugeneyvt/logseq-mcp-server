import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { createDeleteTool } from '../../src/tools/delete/index.js';
import { LogseqClient } from '../../src/logseq-client.js';

// Mock the handler and dependencies
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

import { handleDeleteRequest } from '../../src/tools/delete/handler.js';

describe('Delete Tool', () => {
  let mockClient: LogseqClient;
  let mockHandleDeleteRequest: Mock;

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

    mockHandleDeleteRequest = handleDeleteRequest as Mock;
  });

  describe('createDeleteTool', () => {
    it('should create delete tool with correct structure', () => {
      const deleteTool = createDeleteTool(mockClient);

      expect(deleteTool).toHaveProperty('tool');
      expect(deleteTool).toHaveProperty('handler');
      
      // Check tool definition
      expect(deleteTool.tool.name).toBe('delete');
      expect(deleteTool.tool.description).toContain('Remove content with comprehensive safety controls');
      expect(deleteTool.tool.inputSchema).toBeDefined();
      expect(typeof deleteTool.handler).toBe('function');
    });

    it('should have correct required fields', () => {
      const deleteTool = createDeleteTool(mockClient);
      const schema = deleteTool.tool.inputSchema as any;
      const required = schema.required;

      expect(required).toContain('type');
      expect(required).toContain('target');
      expect(required).toContain('confirmDestroy');
    });

    it('should have all content types in enum', () => {
      const deleteTool = createDeleteTool(mockClient);
      const schema = deleteTool.tool.inputSchema as any;
      const typeEnum = schema.properties.type.enum;

      expect(typeEnum).toContain('page');
      expect(typeEnum).toContain('block');
      expect(typeEnum).toContain('template');
      expect(typeEnum).toContain('properties');
      expect(typeEnum).toContain('relations');
      expect(typeEnum).toContain('tasks');
      // Note: system and graph are read-only and not in delete tool
    });

    it('should support both string and array targets', () => {
      const deleteTool = createDeleteTool(mockClient);
      const schema = deleteTool.tool.inputSchema as any;
      const targetOneOf = schema.properties.target.oneOf;

      expect(targetOneOf).toHaveLength(2);
      expect(targetOneOf[0]).toEqual({ type: 'string' });
      expect(targetOneOf[1]).toEqual({ 
        type: 'array', 
        items: { type: 'string' } 
      });
    });

    it('should require confirmDestroy for safety', () => {
      const deleteTool = createDeleteTool(mockClient);
      const schema = deleteTool.tool.inputSchema as any;
      const confirmProperty = schema.properties.confirmDestroy;

      expect(confirmProperty.type).toBe('boolean');
      expect(confirmProperty.description).toContain('REQUIRED');
      expect(confirmProperty.description).toContain('safety measure');
    });

    it('should have safety and control options', () => {
      const deleteTool = createDeleteTool(mockClient);
      const schema = deleteTool.tool.inputSchema as any;
      const properties = schema.properties;

      expect(properties).toHaveProperty('simulate');
      expect(properties).toHaveProperty('cascade');
      expect(properties).toHaveProperty('softDelete');
      
      // Check defaults
      expect(properties.simulate.default).toBe(false);
      expect(properties.cascade.default).toBe(false);
      expect(properties.softDelete.default).toBe(false);
    });

    it('should have control object with maxOps and idempotencyKey', () => {
      const deleteTool = createDeleteTool(mockClient);
      const schema = deleteTool.tool.inputSchema as any;
      const controlProperties = schema.properties.control.properties;

      expect(controlProperties).toHaveProperty('maxOps');
      expect(controlProperties).toHaveProperty('idempotencyKey');
      expect(controlProperties.maxOps.default).toBe(100);
    });
  });

  describe('handler', () => {
    it('should call handleDeleteRequest with client and args', async () => {
      const deleteTool = createDeleteTool(mockClient);
      const mockResult = {
        content: [{ type: 'text', text: 'Deletion completed' }]
      };
      
      mockHandleDeleteRequest.mockResolvedValue(mockResult);

      const testArgs = { 
        type: 'page', 
        target: 'Page to Delete',
        confirmDestroy: true
      };
      const result = await deleteTool.handler(testArgs);

      expect(mockHandleDeleteRequest).toHaveBeenCalledWith(mockClient, testArgs);
      expect(result).toEqual(mockResult);
    });

    it('should handle simulation mode', async () => {
      const deleteTool = createDeleteTool(mockClient);
      mockHandleDeleteRequest.mockResolvedValue({ content: [] });

      const simulateArgs = {
        type: 'block',
        target: 'block-uuid-to-delete',
        confirmDestroy: true,
        simulate: true
      };

      await deleteTool.handler(simulateArgs);
      expect(mockHandleDeleteRequest).toHaveBeenCalledWith(mockClient, simulateArgs);
    });

    it('should handle cascade deletion', async () => {
      const deleteTool = createDeleteTool(mockClient);
      mockHandleDeleteRequest.mockResolvedValue({ content: [] });

      const cascadeArgs = {
        type: 'page',
        target: 'Parent Page',
        confirmDestroy: true,
        cascade: true
      };

      await deleteTool.handler(cascadeArgs);
      expect(mockHandleDeleteRequest).toHaveBeenCalledWith(mockClient, cascadeArgs);
    });

    it('should handle soft deletion', async () => {
      const deleteTool = createDeleteTool(mockClient);
      mockHandleDeleteRequest.mockResolvedValue({ content: [] });

      const softDeleteArgs = {
        type: 'template',
        target: 'old-template',
        confirmDestroy: true,
        softDelete: true
      };

      await deleteTool.handler(softDeleteArgs);
      expect(mockHandleDeleteRequest).toHaveBeenCalledWith(mockClient, softDeleteArgs);
    });

    it('should handle bulk deletion', async () => {
      const deleteTool = createDeleteTool(mockClient);
      mockHandleDeleteRequest.mockResolvedValue({ content: [] });

      const bulkArgs = {
        type: 'properties',
        target: ['page1', 'page2', 'page3'],
        confirmDestroy: true,
        cascade: false
      };

      await deleteTool.handler(bulkArgs);
      expect(mockHandleDeleteRequest).toHaveBeenCalledWith(mockClient, bulkArgs);
    });

    it('should handle control parameters', async () => {
      const deleteTool = createDeleteTool(mockClient);
      mockHandleDeleteRequest.mockResolvedValue({ content: [] });

      const controlledArgs = {
        type: 'relations',
        target: 'relation-to-delete',
        confirmDestroy: true,
        control: {
          maxOps: 50,
          idempotencyKey: 'delete-operation-123'
        }
      };

      await deleteTool.handler(controlledArgs);
      expect(mockHandleDeleteRequest).toHaveBeenCalledWith(mockClient, controlledArgs);
    });

    it('should handle all deletion modes together', async () => {
      const deleteTool = createDeleteTool(mockClient);
      mockHandleDeleteRequest.mockResolvedValue({ content: [] });

      const complexArgs = {
        type: 'block',
        target: 'complex-block-uuid',
        confirmDestroy: true,
        simulate: false,
        cascade: true,
        softDelete: true,
        control: {
          maxOps: 25,
          idempotencyKey: 'safe-delete-456'
        }
      };

      await deleteTool.handler(complexArgs);
      expect(mockHandleDeleteRequest).toHaveBeenCalledWith(mockClient, complexArgs);
    });

    it('should handle handler errors', async () => {
      const deleteTool = createDeleteTool(mockClient);
      const mockError = new Error('Delete operation failed');
      
      mockHandleDeleteRequest.mockRejectedValue(mockError);

      const testArgs = { 
        type: 'task', 
        target: 'task-to-delete',
        confirmDestroy: true
      };
      
      await expect(deleteTool.handler(testArgs)).rejects.toThrow('Delete operation failed');
    });

    it('should pass through minimal required arguments', async () => {
      const deleteTool = createDeleteTool(mockClient);
      mockHandleDeleteRequest.mockResolvedValue({ content: [] });

      const minimalArgs = { 
        type: 'page', 
        target: 'Minimal Page',
        confirmDestroy: true 
      };
      
      await deleteTool.handler(minimalArgs);
      expect(mockHandleDeleteRequest).toHaveBeenCalledWith(mockClient, minimalArgs);
    });
  });
});