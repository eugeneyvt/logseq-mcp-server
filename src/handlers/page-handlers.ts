import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { LogseqClient } from '../logseq-client.js';
import type { ToolResult } from './common.js';
import { handleEnsurePage } from './page/ensure-page.js';
import { handleGetPage } from './page/get-page.js';
import { handleSetPageContent } from './page/set-content.js';
import { handleDeletePage } from './page/delete-page.js';
import { handleSetPageProperties } from './page/set-page-properties.js';

/**
 * Create page-related tools and handlers (focused and modular)
 */
export function createPageHandlers(client: LogseqClient): {
  tools: Tool[];
  handlers: Record<string, (args: unknown) => Promise<ToolResult>>;
} {
  const tools: Tool[] = [
    {
      name: 'ensure_page',
      description:
        'Ensure a page exists, optionally creating it if missing. Use before working with pages. Automatically handles journal page date format conversions (e.g., "2025-08-20" → "Aug 20th, 2025").',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Page name' },
          ifAbsent: {
            type: 'string',
            enum: ['create', 'error', 'skip'],
            default: 'create',
            description: 'Action if page does not exist',
          },
          control: {
            type: 'object',
            properties: {
              dryRun: { type: 'boolean', default: false },
              strict: { type: 'boolean', default: true },
              idempotencyKey: { type: 'string' },
              maxOps: { type: 'number', default: 100 },
              autofixFormat: { type: 'boolean', default: true },
            },
          },
        },
        required: ['name'],
      },
    },
    {
      name: 'get_page',
      description:
        'Retrieve comprehensive page information including metadata, all blocks, backlinks, outgoing links, and related pages. Returns hierarchical block tree structure with relationship analysis. Automatically handles journal date format conversions.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description:
              'Page name (e.g., "Aug 20th, 2025" for journal pages or "Project Ideas" for regular pages)',
          },
        },
        required: ['name'],
      },
    },
    {
      name: 'set_page_content',
      description:
        'Replace entire page content with markdown. IMPORTANT: Uses intelligent parsing - all headings (##, ###) become page-level blocks, content nests under headings, **bold paragraphs** act as grouping elements for lists, "-" is auto-removed from list items. Line breaks within paragraphs are preserved as \\n, blank lines create separate blocks. Use standard markdown format.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Page name' },
          content: {
            type: 'string',
            description:
              'Full page content in markdown format. Will completely replace existing page content.',
          },
          control: {
            type: 'object',
            properties: {
              dryRun: { type: 'boolean', default: false },
              strict: { type: 'boolean', default: true },
              idempotencyKey: { type: 'string' },
              maxOps: { type: 'number', default: 100 },
              autofixFormat: { type: 'boolean', default: true },
            },
          },
        },
        required: ['name', 'content'],
      },
    },
    {
      name: 'set_page_properties',
      description:
        'Set, update, remove, or query page properties. When called without upsert/remove parameters, returns current properties. Supports property upserts, removals, and querying existing properties.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Page name' },
          upsert: {
            type: 'object',
            description: 'Properties to upsert',
            additionalProperties: true,
          },
          remove: {
            type: 'array',
            items: { type: 'string' },
            description: 'Property keys to remove',
          },
          control: {
            type: 'object',
            properties: {
              dryRun: { type: 'boolean', default: false },
              strict: { type: 'boolean', default: true },
              idempotencyKey: { type: 'string' },
              maxOps: { type: 'number', default: 100 },
              autofixFormat: { type: 'boolean', default: true },
            },
          },
        },
        required: ['name'],
      },
    },
    {
      name: 'delete_page',
      description:
        'Delete a page from the Logseq graph with safety controls. REQUIRES explicit confirmDestroy parameter for safety. Use dryRun to preview the operation first.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Page name to delete' },
          confirmDestroy: {
            type: 'boolean',
            description:
              'REQUIRED: Set to true to confirm you want to permanently delete this page. This prevents accidental deletions.',
          },
          control: {
            type: 'object',
            properties: {
              dryRun: {
                type: 'boolean',
                default: false,
                description: 'Preview the deletion without actually deleting',
              },
              backupBefore: {
                type: 'boolean',
                default: false,
                description: 'Create backup before deletion (if supported)',
              },
              strict: { type: 'boolean', default: true },
              idempotencyKey: { type: 'string' },
              maxOps: { type: 'number', default: 100 },
              autofixFormat: { type: 'boolean', default: true },
            },
          },
        },
        required: ['name'],
      },
    },
  ];

  const handlers = {
    ensure_page: (args: unknown) => handleEnsurePage(client, args),
    get_page: (args: unknown) => handleGetPage(client, args),
    set_page_content: (args: unknown) => handleSetPageContent(client, args),
    delete_page: (args: unknown) => handleDeletePage(client, args),
    set_page_properties: (args: unknown) => handleSetPageProperties(client, args),
  };

  return { tools, handlers };
}
