import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { createEditTool } from '../../src/tools/edit/index.js';
import { LogseqClient } from '../../src/logseq-client.js';

// Mock the handler and dependencies
vi.mock('../../src/tools/edit/handler.js', () => ({
  handleEditRequest: vi.fn()
}));

vi.mock('../../src/utils/system/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}));

import { handleEditRequest } from '../../src/tools/edit/handler.js';

describe('Edit Tool', () => {
  let mockClient: LogseqClient;
  let mockHandleEditRequest: Mock;

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

    mockHandleEditRequest = handleEditRequest as Mock;
  });

  describe('createEditTool', () => {
    it('should create edit tool with correct structure', () => {
      const editTool = createEditTool(mockClient);

      expect(editTool).toHaveProperty('tool');
      expect(editTool).toHaveProperty('handler');
      
      // Check tool definition
      expect(editTool.tool.name).toBe('edit');
      expect(editTool.tool.description).toContain('Create, modify, append, move content');
      expect(editTool.tool.inputSchema).toBeDefined();
      expect(typeof editTool.handler).toBe('function');
    });

    it('should have correct required fields', () => {
      const editTool = createEditTool(mockClient);
      const schema = editTool.tool.inputSchema as any;
      const required = schema.required;

      expect(required).toContain('type');
      expect(required).toContain('operation');
      expect(required).toContain('target');
    });

    it('should have all content types in enum', () => {
      const editTool = createEditTool(mockClient);
      const schema = editTool.tool.inputSchema as any;
      const typeEnum = schema.properties.type.enum;

      expect(typeEnum).toContain('page');
      expect(typeEnum).toContain('block');
      expect(typeEnum).toContain('template');
      expect(typeEnum).toContain('properties');
      expect(typeEnum).toContain('relations');
      expect(typeEnum).toContain('tasks');
      // Note: system and graph are read-only and not in edit tool
    });

    it('should have all operation types', () => {
      const editTool = createEditTool(mockClient);
      const schema = editTool.tool.inputSchema as any;
      const operationEnum = schema.properties.operation.enum;

      expect(operationEnum).toContain('create');
      expect(operationEnum).toContain('update');
      expect(operationEnum).toContain('append');
      expect(operationEnum).toContain('prepend');
      expect(operationEnum).toContain('move');
      expect(operationEnum).toContain('remove');
    });

    it('should support position specifications', () => {
      const editTool = createEditTool(mockClient);
      const schema = editTool.tool.inputSchema as any;
      const positionProperties = schema.properties.position.properties;

      expect(positionProperties).toHaveProperty('parent_block_id');
      expect(positionProperties).toHaveProperty('after_block_id');
      expect(positionProperties).toHaveProperty('before_block_id');
      expect(positionProperties).toHaveProperty('index');
    });

    it('should have task state options', () => {
      const editTool = createEditTool(mockClient);
      const schema = editTool.tool.inputSchema as any;
      const taskStateEnum = schema.properties.taskState.enum;

      expect(taskStateEnum).toContain('TODO');
      expect(taskStateEnum).toContain('DOING');
      expect(taskStateEnum).toContain('DONE');
      expect(taskStateEnum).toContain('WAITING');
      expect(taskStateEnum).toContain('LATER');
      expect(taskStateEnum).toContain('NOW');
      expect(taskStateEnum).toContain('CANCELED');
    });

    it('should have control options', () => {
      const editTool = createEditTool(mockClient);
      const schema = editTool.tool.inputSchema as any;
      const controlProperties = schema.properties.control.properties;

      expect(controlProperties).toHaveProperty('strict');
      expect(controlProperties).toHaveProperty('autofixFormat');
      expect(controlProperties).toHaveProperty('parseMarkdown');
      expect(controlProperties).toHaveProperty('renderMode');
      expect(controlProperties).toHaveProperty('maxOps');

      // Check defaults
      expect(controlProperties.strict.default).toBe(true);
      expect(controlProperties.autofixFormat.default).toBe(true);
      expect(controlProperties.parseMarkdown.default).toBe(false);
      expect(controlProperties.renderMode.default).toBe('readable');
      expect(controlProperties.maxOps.default).toBe(100);
    });

    it('should have render mode options', () => {
      const editTool = createEditTool(mockClient);
      const schema = editTool.tool.inputSchema as any;
      const renderModeEnum = schema.properties.control.properties.renderMode.enum;

      expect(renderModeEnum).toContain('readable');
      expect(renderModeEnum).toContain('hierarchical');
      expect(renderModeEnum).toContain('singleBlock');
    });
  });

  describe('handler', () => {
    it('should call handleEditRequest with client and args', async () => {
      const editTool = createEditTool(mockClient);
      const mockResult = {
        content: [{ type: 'text', text: 'Edit completed' }]
      };
      
      mockHandleEditRequest.mockResolvedValue(mockResult);

      const testArgs = { 
        type: 'page', 
        operation: 'create',
        target: 'New Page',
        content: 'Page content'
      };
      const result = await editTool.handler(testArgs);

      expect(mockHandleEditRequest).toHaveBeenCalledWith(mockClient, testArgs);
      expect(result).toEqual(mockResult);
    });

    it('should handle different operation types', async () => {
      const editTool = createEditTool(mockClient);
      mockHandleEditRequest.mockResolvedValue({ content: [] });

      // Test create operation
      await editTool.handler({ 
        type: 'block', 
        operation: 'create',
        target: 'parent-uuid',
        content: 'New block content',
        position: { parent_block_id: 'parent-uuid' }
      });

      // Test update operation
      await editTool.handler({ 
        type: 'page', 
        operation: 'update',
        target: 'Existing Page',
        content: 'Updated content'
      });

      // Test property operation
      await editTool.handler({ 
        type: 'properties', 
        operation: 'create',
        target: 'page-name',
        propertyKey: 'status',
        propertyValue: 'in-progress'
      });

      expect(mockHandleEditRequest).toHaveBeenCalledTimes(3);
    });

    it('should handle bulk operations', async () => {
      const editTool = createEditTool(mockClient);
      mockHandleEditRequest.mockResolvedValue({ content: [] });

      const bulkArgs = {
        type: 'block',
        operation: 'update',
        target: ['uuid1', 'uuid2', 'uuid3'],
        content: 'Updated content for all blocks'
      };

      await editTool.handler(bulkArgs);
      expect(mockHandleEditRequest).toHaveBeenCalledWith(mockClient, bulkArgs);
    });

    it('should handle template operations', async () => {
      const editTool = createEditTool(mockClient);
      mockHandleEditRequest.mockResolvedValue({ content: [] });

      const templateArgs = {
        type: 'template',
        operation: 'create',
        target: 'my-template',
        templateName: 'daily-note',
        content: 'Template: {{date}} - {{weather}}',
        variables: { date: '2024-01-01', weather: 'sunny' }
      };

      await editTool.handler(templateArgs);
      expect(mockHandleEditRequest).toHaveBeenCalledWith(mockClient, templateArgs);
    });

    it('should handle dry run mode', async () => {
      const editTool = createEditTool(mockClient);
      mockHandleEditRequest.mockResolvedValue({ content: [] });

      const dryRunArgs = {
        type: 'page',
        operation: 'remove',
        target: 'Page To Delete',
        dryRun: true,
        confirmDestroy: true
      };

      await editTool.handler(dryRunArgs);
      expect(mockHandleEditRequest).toHaveBeenCalledWith(mockClient, dryRunArgs);
    });

    it('should handle control parameters', async () => {
      const editTool = createEditTool(mockClient);
      mockHandleEditRequest.mockResolvedValue({ content: [] });

      const controlledArgs = {
        type: 'block',
        operation: 'create',
        target: 'parent-page',
        content: '# Markdown Header\n\nSome **bold** text',
        control: {
          strict: false,
          autofixFormat: true,
          parseMarkdown: true,
          renderMode: 'hierarchical',
          maxOps: 50
        }
      };

      await editTool.handler(controlledArgs);
      expect(mockHandleEditRequest).toHaveBeenCalledWith(mockClient, controlledArgs);
    });

    it('should handle handler errors', async () => {
      const editTool = createEditTool(mockClient);
      const mockError = new Error('Edit operation failed');
      
      mockHandleEditRequest.mockRejectedValue(mockError);

      const testArgs = { 
        type: 'page', 
        operation: 'create',
        target: 'Invalid Page'
      };
      
      await expect(editTool.handler(testArgs)).rejects.toThrow('Edit operation failed');
    });
  });
});