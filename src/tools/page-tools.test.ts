import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPageTools } from './page-tools.js';
import type { LogseqPage, LogseqBlock } from '../schemas/logseq.js';

// Mock the LogseqClient
vi.mock('../utils/logseq-client.js');

describe('Page Tools', () => {
  let client: any;
  let pageTools: ReturnType<typeof createPageTools>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock client with all the methods we need
    client = {
      getAllPages: vi.fn(),
      getPage: vi.fn(),
      getPageBlocksTree: vi.fn(),
      createPage: vi.fn(),
      deletePage: vi.fn(),
      insertBlock: vi.fn(),
    };

    pageTools = createPageTools(client);
  });

  describe('tools definition', () => {
    it('should define all page tools', () => {
      expect(pageTools.tools).toHaveLength(5);

      const toolNames = pageTools.tools.map((tool) => tool.name);
      expect(toolNames).toContain('logseq_list_pages');
      expect(toolNames).toContain('logseq_get_page');
      expect(toolNames).toContain('logseq_get_page_content');
      expect(toolNames).toContain('logseq_create_page');
      expect(toolNames).toContain('logseq_delete_page');
    });

    it('should have proper input schemas', () => {
      const listPagesSchema = pageTools.tools.find(
        (t) => t.name === 'logseq_list_pages'
      )?.inputSchema;
      expect(listPagesSchema?.type).toBe('object');
      expect(listPagesSchema?.properties).toEqual({});

      const getPageSchema = pageTools.tools.find((t) => t.name === 'logseq_get_page')?.inputSchema;
      expect(getPageSchema?.properties).toHaveProperty('name');
      expect((getPageSchema as any)?.required).toContain('name');
    });
  });

  describe('logseq_list_pages handler', () => {
    it('should list all pages', async () => {
      const mockPages: LogseqPage[] = [
        { id: 1, name: 'Page 1', originalName: 'Page 1', 'journal?': false },
        { id: 2, name: 'Page 2', originalName: 'Page 2', 'journal?': true },
        { id: 3, name: 'Page 3', originalName: 'Page 3', 'journal?': false },
      ];

      client.getAllPages.mockResolvedValue(mockPages);

      const result = await pageTools.handlers.logseq_list_pages();

      expect(client.getAllPages).toHaveBeenCalled();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found 3 pages');
      expect(result.content[0].text).toContain('Page 1');
      expect(result.content[0].text).toContain('Page 2 (journal)');
      expect(result.content[0].text).toContain('Page 3');
    });

    it('should handle empty page list', async () => {
      client.getAllPages.mockResolvedValue([]);

      const result = await pageTools.handlers.logseq_list_pages();

      expect(result.content[0].text).toContain('Found 0 pages');
    });
  });

  describe('logseq_get_page handler', () => {
    it('should get page information', async () => {
      const mockPage: LogseqPage = {
        id: 1,
        name: 'Test Page',
        originalName: 'Test Page',
        journal: false,
        properties: { tag: 'test' },
      };

      client.getPage.mockResolvedValue(mockPage);

      const result = await pageTools.handlers.logseq_get_page({ name: 'Test Page' });

      expect(client.getPage).toHaveBeenCalledWith('Test Page');
      expect(result.content[0].text).toContain('Page: Test Page');
      expect(result.content[0].text).toContain('ID: 1');
      expect(result.content[0].text).toContain('Journal: false');
      expect(result.content[0].text).toContain('"tag": "test"');
    });

    it('should handle non-existent page', async () => {
      client.getPage.mockResolvedValue(null);

      const result = await pageTools.handlers.logseq_get_page({ name: 'Nonexistent' });

      expect(result.content[0].text).toContain('Page "Nonexistent" not found');
    });

    it('should validate page name input', async () => {
      await expect(pageTools.handlers.logseq_get_page({ name: '' })).rejects.toThrow();
    });
  });

  describe('logseq_get_page_content handler', () => {
    it('should get page content with blocks', async () => {
      const mockBlocks: LogseqBlock[] = [
        {
          id: 'block1',
          content: 'First block',
          children: [{ id: 'block2', content: 'Nested block' }],
        },
        {
          id: 'block3',
          content: 'Second block',
        },
      ];

      client.getPageBlocksTree.mockResolvedValue(mockBlocks);

      const result = await pageTools.handlers.logseq_get_page_content({ name: 'Test Page' });

      expect(client.getPageBlocksTree).toHaveBeenCalledWith('Test Page');
      expect(result.content[0].text).toContain('# Test Page');
      expect(result.content[0].text).toContain('- First block');
      expect(result.content[0].text).toContain('  - Nested block');
      expect(result.content[0].text).toContain('- Second block');
    });

    it('should handle page with no content', async () => {
      client.getPageBlocksTree.mockResolvedValue([]);

      const result = await pageTools.handlers.logseq_get_page_content({ name: 'Empty Page' });

      expect(result.content[0].text).toContain(
        'Page "Empty Page" has no content or does not exist'
      );
    });
  });

  describe('logseq_create_page handler', () => {
    it('should create a new page', async () => {
      const mockPage: LogseqPage = {
        id: 1,
        name: 'New Page',
        originalName: 'New Page',
      };

      client.getPage.mockResolvedValue(null); // Page doesn't exist
      client.createPage.mockResolvedValue(mockPage);

      const result = await pageTools.handlers.logseq_create_page({
        name: 'New Page',
        properties: { type: 'note' },
      });

      expect(client.getPage).toHaveBeenCalledWith('New Page');
      expect(client.createPage).toHaveBeenCalledWith('New Page', { type: 'note' });
      expect(result.content[0].text).toContain('Successfully created page "New Page" with ID 1');
    });

    it('should create page with content', async () => {
      const mockPage: LogseqPage = {
        id: 1,
        name: 'New Page',
        originalName: 'New Page',
      };

      client.getPage.mockResolvedValue(null);
      client.createPage.mockResolvedValue(mockPage);
      client.insertBlock.mockResolvedValue({} as any);

      const result = await pageTools.handlers.logseq_create_page({
        name: 'New Page',
        content: 'Initial content',
      });

      expect(client.createPage).toHaveBeenCalledWith('New Page', undefined);
      expect(client.insertBlock).toHaveBeenCalledWith('New Page', 'Initial content');
      expect(result.content[0].text).toContain('Successfully created page');
    });

    it('should not create existing page', async () => {
      const mockPage: LogseqPage = {
        id: 1,
        name: 'Existing Page',
        originalName: 'Existing Page',
      };

      client.getPage.mockResolvedValue(mockPage);

      const result = await pageTools.handlers.logseq_create_page({
        name: 'Existing Page',
      });

      expect(client.createPage).not.toHaveBeenCalled();
      expect(result.content[0].text).toContain('Page "Existing Page" already exists');
    });

    it('should validate input parameters', async () => {
      await expect(pageTools.handlers.logseq_create_page({ name: '' })).rejects.toThrow();
    });
  });

  describe('logseq_delete_page handler', () => {
    it('should delete existing page', async () => {
      const mockPage: LogseqPage = {
        id: 1,
        name: 'Page to Delete',
        originalName: 'Page to Delete',
      };

      client.getPage.mockResolvedValue(mockPage);
      client.deletePage.mockResolvedValue();

      const result = await pageTools.handlers.logseq_delete_page({
        name: 'Page to Delete',
      });

      expect(client.getPage).toHaveBeenCalledWith('Page to Delete');
      expect(client.deletePage).toHaveBeenCalledWith('Page to Delete');
      expect(result.content[0].text).toContain('Successfully deleted page "Page to Delete"');
    });

    it('should not delete non-existent page', async () => {
      client.getPage.mockResolvedValue(null);

      const result = await pageTools.handlers.logseq_delete_page({
        name: 'Nonexistent Page',
      });

      expect(client.deletePage).not.toHaveBeenCalled();
      expect(result.content[0].text).toContain('Page "Nonexistent Page" does not exist');
    });

    it('should validate page name input', async () => {
      await expect(pageTools.handlers.logseq_delete_page({ name: '' })).rejects.toThrow();
    });
  });
});
