import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { LogseqClient } from '../logseq-client.js';
import type { LogseqBlock } from '../schemas/base-types.js';
import { SearchParamsSchemaV2, ErrorCode, type SearchParamsV2 } from '../schemas/logseq.js';
import { logger } from '../utils/logger.js';
import { createResponse, createErrorResponse, type ToolResult } from './common.js';

/**
 * Extract template placeholders from blocks (e.g., {{variable}}, <%variable%>)
 */
function extractTemplatePlaceholders(blocks: readonly LogseqBlock[]): string[] {
  const placeholders = new Set<string>();

  const extractFromContent = (content: string) => {
    // Match Logseq template syntax: {{variable}} or <%variable%>
    const matches = content.match(/(\{\{[^}]+\}\}|<%[^%]+%>)/g);
    if (matches) {
      matches.forEach((match) => placeholders.add(match));
    }
  };

  const processBlock = (block: LogseqBlock) => {
    if (block.content) {
      extractFromContent(block.content);
    }
    if (block.children) {
      block.children.forEach(processBlock);
    }
  };

  blocks.forEach(processBlock);
  return Array.from(placeholders);
}

/**
 * Check if a block (and its children) contains a reference to a specific page
 */
function checkBlockForPageReference(block: LogseqBlock, targetPageName: string): boolean {
  if (block.content) {
    const content = block.content;
    const target = targetPageName;

    // Check for various Logseq page link formats
    const referencePatterns = [
      `[[${target}]]`, // Standard page link
      `[[${target.toLowerCase()}]]`, // Lowercase version
      `[${target}]`, // Alternative link format
      `#${target}`, // Tag format
      `#[[${target}]]`, // Tagged page link
    ];

    // Also check for partial matches in hierarchical pages like KB/Dev/Generic
    const pathParts = target.split('/');
    if (pathParts.length > 1) {
      // Check if any part of the path matches
      referencePatterns.push(...pathParts.map((part) => `[[${part}]]`));
      referencePatterns.push(...pathParts.map((part) => `#${part}`));
    }

    // Check all patterns (case-insensitive)
    const contentLower = content.toLowerCase();
    const targetLower = target.toLowerCase();

    for (const pattern of referencePatterns) {
      if (contentLower.includes(pattern.toLowerCase())) {
        return true;
      }
    }

    // Also check for exact text mentions (more permissive)
    if (contentLower.includes(targetLower)) {
      return true;
    }
  }

  // Recursively check children
  if (block.children) {
    return block.children.some((child) => checkBlockForPageReference(child, targetPageName));
  }

  return false;
}

/**
 * Find all references to a page in blocks and return detailed reference information
 */
function findPageReferences(
  blocks: readonly LogseqBlock[],
  targetPageName: string,
  _sourcePage: string
): Array<{ blockId: string | number; content: string; referenceType: string }> {
  const references: Array<{ blockId: string | number; content: string; referenceType: string }> =
    [];

  const processBlock = (block: LogseqBlock) => {
    if (block.content) {
      const content = block.content;
      const target = targetPageName.toLowerCase();
      const contentLower = content.toLowerCase();

      // Check for different types of references
      if (contentLower.includes(`[[${target}]]`)) {
        references.push({
          blockId: block.uuid || String(block.id),
          content: content.substring(0, 200), // Truncate for readability
          referenceType: 'page-link',
        });
      } else if (contentLower.includes(target)) {
        references.push({
          blockId: block.uuid || String(block.id),
          content: content.substring(0, 200),
          referenceType: 'mention',
        });
      }
    }

    // Process children
    if (block.children) {
      block.children.forEach(processBlock);
    }
  };

  blocks.forEach(processBlock);
  return references;
}

/**
 * Parse date query strings into date filter objects
 */
function parseDateQuery(dateQuery: string): { matches: (date: Date) => boolean } | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (dateQuery.toLowerCase()) {
    case 'today':
      return {
        matches: (date: Date) => {
          const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          return checkDate.getTime() === today.getTime();
        },
      };

    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        matches: (date: Date) => {
          const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          return checkDate.getTime() === yesterday.getTime();
        },
      };
    }

    case 'last-week':
    case 'last week': {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return {
        matches: (date: Date) => {
          const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          return checkDate >= weekAgo && checkDate <= today;
        },
      };
    }

    case 'last-month':
    case 'last month': {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return {
        matches: (date: Date) => {
          const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          return checkDate >= monthAgo && checkDate <= today;
        },
      };
    }

    default: {
      // Try to parse as specific date (YYYY-MM-DD format)
      const dateMatch = dateQuery.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        const targetDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return {
          matches: (date: Date) => {
            const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            return checkDate.getTime() === targetDate.getTime();
          },
        };
      }

      return null;
    }
  }
}

/**
 * Parse Logseq journal date format (usually YYYYMMDD number)
 */
function parseLogseqDate(journalDay: number | string): Date | null {
  try {
    const dayStr = String(journalDay);
    if (dayStr.length === 8) {
      const year = parseInt(dayStr.substring(0, 4));
      const month = parseInt(dayStr.substring(4, 6)) - 1; // Month is 0-indexed
      const day = parseInt(dayStr.substring(6, 8));
      const date = new Date(year, month, day);
      return isNaN(date.getTime()) ? null : date;
    }
  } catch (error) {
    return null;
  }
  return null;
}

/**
 * Check if a string looks like a date
 */
function isDateLike(value: string): boolean {
  // Check for common date formats
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, // ISO datetime
  ];

  return datePatterns.some((pattern) => pattern.test(value));
}

/**
 * Check if a query contains combined filters (AND/OR logic)
 */
function containsCombinedFilters(query: string): boolean {
  // Check for AND/OR operators (case insensitive)
  return /\b(AND|OR)\b/i.test(query);
}

/**
 * Process combined filters with AND/OR logic
 */
async function processCombinedFilters(
  client: LogseqClient,
  query: string,
  scope: string
): Promise<Array<Record<string, unknown>>> {
  try {
    // Parse the query into individual filters and operators
    const filterExpression = parseFilterExpression(query);

    // Evaluate the expression
    const results = await evaluateFilterExpression(client, filterExpression, scope);

    return results;
  } catch (error) {
    logger.error({ error, query }, 'Failed to process combined filters');
    return [];
  }
}

/**
 * Parse a filter expression into a structured format
 */
function parseFilterExpression(query: string): FilterExpression {
  // Simple parser for filter expressions
  // Supports: filter1 AND filter2, filter1 OR filter2, (filter1 AND filter2) OR filter3

  // First, handle parentheses by recursively parsing sub-expressions
  const expression = query.trim();

  // For now, implement a simple left-to-right parser
  // Split by OR first (lower precedence), then by AND (higher precedence)

  if (expression.includes(' OR ')) {
    const orParts = expression.split(' OR ').map((part) => part.trim());
    return {
      operator: 'OR',
      operands: orParts.map((part) => {
        if (part.includes(' AND ')) {
          return parseFilterExpression(part);
        } else {
          return { operator: 'FILTER', filter: part };
        }
      }),
    };
  } else if (expression.includes(' AND ')) {
    const andParts = expression.split(' AND ').map((part) => part.trim());
    return {
      operator: 'AND',
      operands: andParts.map((part) => ({ operator: 'FILTER', filter: part })),
    };
  } else {
    return { operator: 'FILTER', filter: expression };
  }
}

/**
 * Evaluate a filter expression
 */
async function evaluateFilterExpression(
  client: LogseqClient,
  expression: FilterExpression,
  scope: string
): Promise<Array<Record<string, unknown>>> {
  if (expression.operator === 'FILTER') {
    // Execute single filter
    if (!expression.filter) {
      return [];
    }
    return await executeSingleFilter(client, expression.filter, scope);
  } else if (expression.operator === 'AND') {
    // Execute all operands and find intersection
    if (!expression.operands || expression.operands.length === 0) {
      return [];
    }
    const resultSets = await Promise.all(
      expression.operands.map((operand) => evaluateFilterExpression(client, operand, scope))
    );

    return intersectResults(resultSets);
  } else if (expression.operator === 'OR') {
    // Execute all operands and find union
    if (!expression.operands || expression.operands.length === 0) {
      return [];
    }
    const resultSets = await Promise.all(
      expression.operands.map((operand) => evaluateFilterExpression(client, operand, scope))
    );

    return unionResults(resultSets);
  }

  return [];
}

/**
 * Execute a single filter (reuse existing filter logic)
 */
async function executeSingleFilter(
  client: LogseqClient,
  filterQuery: string,
  _scope: string
): Promise<Array<Record<string, unknown>>> {
  // Reuse existing filter detection logic

  // Reuse the existing filter detection logic
  if (filterQuery === '*' || filterQuery === 'all' || filterQuery === 'everything') {
    const allPages = await client.getAllPages();
    return allPages.map((page) => ({
      type: 'page',
      id: page.id,
      name: page.name,
      journal: page['journal?'] || false,
      properties: page.properties || {},
    }));
  } else if (filterQuery.toLowerCase().includes('empty')) {
    // Handle empty page search
    const allPages = await client.getAllPages();
    const emptyPages = [];
    const pagesToCheck = allPages.slice(0, 20); // Limit for performance in combined queries

    for (const page of pagesToCheck) {
      try {
        const blocks = await client.getPageBlocksTree(page.name);
        if (
          !blocks ||
          blocks.length === 0 ||
          blocks.filter((block) => block.content && block.content.trim().length > 0).length === 0
        ) {
          emptyPages.push({
            type: 'page',
            id: page.id,
            name: page.name,
            journal: page['journal?'] || false,
            properties: page.properties || {},
            reason: 'Empty page',
          });
        }
      } catch (error) {
        continue;
      }
    }
    return emptyPages;
  } else if (filterQuery.startsWith('property:') && filterQuery.includes('=')) {
    // Property-based search
    const match = filterQuery.match(/^property:([^=]+)=(.+)$/);
    if (match) {
      const [, key, value] = match;
      const allPages = await client.getAllPages();

      return allPages
        .filter((page) => {
          if (!page.properties) {
            return false;
          }
          const propValue = page.properties[key];
          if (propValue === undefined) {
            return false;
          }

          const normalizedValue = value.toLowerCase();
          const normalizedPropValue = String(propValue).toLowerCase();

          return (
            normalizedPropValue === normalizedValue || normalizedPropValue.includes(normalizedValue)
          );
        })
        .map((page) => ({
          type: 'page',
          id: page.id,
          name: page.name,
          properties: page.properties || {},
          matchedProperty: { [key]: page.properties?.[key] },
        }));
    }
  } else if (filterQuery.startsWith('date:')) {
    // Date-based search
    const dateQuery = filterQuery.substring(5);
    const allPages = await client.getAllPages();
    const matchingPages = [];

    const dateFilter = parseDateQuery(dateQuery);
    if (dateFilter) {
      for (const page of allPages.slice(0, 30)) {
        // Limit for performance
        try {
          if (page['journal?'] && page.journalDay) {
            const pageDate = parseLogseqDate(page.journalDay);
            if (pageDate && dateFilter.matches(pageDate)) {
              matchingPages.push({
                type: 'journal',
                id: page.id,
                name: page.name,
                date: pageDate.toISOString().split('T')[0],
                journalDay: page.journalDay,
                properties: page.properties || {},
              });
            }
          }
        } catch (error) {
          continue;
        }
      }
    }
    return matchingPages;
  } else if (filterQuery.startsWith('template:')) {
    // Template search
    if (filterQuery === 'templates:*') {
      const allPages = await client.getAllPages();
      const templates = allPages
        .filter(
          (page) =>
            page.name.toLowerCase().includes('template') ||
            (page.properties && page.properties.template) ||
            (page.properties && page.properties['page-type'] === 'template')
        )
        .slice(0, 10); // Limit for combined queries

      return templates.map((page) => ({
        type: 'template',
        id: page.id,
        name: page.name,
        properties: page.properties || {},
        templateType: page.properties?.['template-type'] || 'page',
      }));
    }
  } else if (filterQuery.startsWith('backlinks:')) {
    // Backlinks search
    const match = filterQuery.match(/^backlinks:"([^"]+)"/);
    if (match) {
      const targetPageName = match[1];
      const allPages = await client.getAllPages();
      const backlinks = [];

      const pagesToCheck = allPages.slice(0, 20); // Limit for performance

      for (const page of pagesToCheck) {
        try {
          const blocks = await client.getPageBlocksTree(page.name);
          if (blocks && blocks.length > 0) {
            const hasBacklink = blocks.some((block) =>
              checkBlockForPageReference(block, targetPageName)
            );

            if (hasBacklink) {
              backlinks.push({
                type: 'backlink',
                id: page.id,
                name: page.name,
                targetPage: targetPageName,
                properties: page.properties || {},
              });
            }
          }
        } catch (error) {
          continue;
        }
      }
      return backlinks;
    }
  }

  // Fallback to normal text search
  try {
    const allPages = await client.getAllPages();
    const pageResults = allPages
      .filter((page) => page.name.toLowerCase().includes(filterQuery.toLowerCase()))
      .slice(0, 10); // Limit for combined queries

    return pageResults.map((page) => ({
      type: 'page',
      id: page.id,
      name: page.name,
      journal: page['journal?'] || false,
      properties: page.properties || {},
    }));
  } catch (error) {
    return [];
  }
}

/**
 * Find intersection of result sets (for AND operations)
 */
function intersectResults(
  resultSets: Array<Array<Record<string, unknown>>>
): Array<Record<string, unknown>> {
  if (resultSets.length === 0) {
    return [];
  }
  if (resultSets.length === 1) {
    return resultSets[0];
  }

  const firstSet = resultSets[0];
  const otherSets = resultSets.slice(1);

  return firstSet.filter((item) => {
    const itemId = String(item.id);
    return otherSets.every((set) => set.some((other) => String(other.id) === itemId));
  });
}

/**
 * Find union of result sets (for OR operations)
 */
function unionResults(
  resultSets: Array<Array<Record<string, unknown>>>
): Array<Record<string, unknown>> {
  const seen = new Set<string>();
  const result: Array<Record<string, unknown>> = [];

  for (const set of resultSets) {
    for (const item of set) {
      const itemId = String(item.id);
      if (!seen.has(itemId)) {
        seen.add(itemId);
        result.push(item);
      }
    }
  }

  return result;
}

// Types for filter expressions
interface FilterExpression {
  operator: 'AND' | 'OR' | 'FILTER';
  operands?: FilterExpression[];
  filter?: string;
}

/**
 * Create search-related tools and handlers
 */
export function createSearchHandlers(client: LogseqClient): {
  tools: Tool[];
  handlers: Record<string, (args: unknown) => Promise<ToolResult>>;
} {
  const tools: Tool[] = [
    {
      name: 'search',
      description:
        'Enhanced search with intelligent query handling and combined filters. Supports: "*" for all pages, "empty" for empty pages, page:"PageName" for page blocks, templates:* for all templates, template:"name" for specific template, property:key=value for property search, properties:page="PageName" for page properties, backlinks:"PageName" for pages linking to target, references:"PageName" for all references, date:YYYY-MM-DD or date:today/yesterday/last-week for date filtering, and normal text for content search. Combine filters with AND/OR: "property:status=open AND date:last-week", "templates:* OR property:type=template".',
      inputSchema: {
        type: 'object',
        properties: {
          q: {
            type: 'string',
            description:
              'Enhanced search query. Examples: "*" (all pages), "empty" (empty pages), page:"PageName" (page blocks), templates:* (all templates), template:"name" (specific template), property:status=open (property search), properties:page="PageName" (page properties), backlinks:"PageName" (linking pages), references:"PageName" (all references), or normal text search',
          },
          scope: {
            type: 'string',
            enum: ['blocks', 'pages', 'all'],
            default: 'all',
            description:
              'Search scope: "blocks" for block content, "pages" for page names, "all" for both',
          },
          cursor: { type: 'string', description: 'Pagination cursor' },
          limit: { type: 'number', default: 20, maximum: 100, description: 'Result limit' },
        },
        required: ['q'],
      },
    },
  ];

  const handlers = {
    search: async (args: unknown): Promise<ToolResult> => {
      try {
        const params = SearchParamsSchemaV2.parse(args) as SearchParamsV2;
        logger.info({ query: params.q, scope: params.scope }, 'Searching');

        // Handle common AI wildcard patterns intelligently
        let results: Array<Record<string, unknown>> = [];

        if (params.q === '*' || params.q === 'all' || params.q === 'everything') {
          // Return all pages when user searches for "*" or "all"
          logger.info('Wildcard search detected - returning all pages');
          const allPages = await client.getAllPages();
          if (allPages && Array.isArray(allPages)) {
            results = allPages.map((page) => ({
              type: 'page',
              id: page.id,
              name: page.name,
              journal: page['journal?'] || false,
              properties: page.properties || {},
            }));
          }
        } else if (
          params.q.toLowerCase().includes('empty') ||
          params.q.toLowerCase().includes('no content') ||
          params.q.toLowerCase().includes('blank')
        ) {
          // Find empty pages when user searches for "empty" or "no content"
          logger.info('Empty page search detected');
          const allPages = await client.getAllPages();
          if (allPages && Array.isArray(allPages)) {
            const emptyPages = [];
            // Check first 50 pages for emptiness to avoid performance issues
            const pagesToCheck = allPages.slice(0, 50);

            for (const page of pagesToCheck) {
              try {
                const blocks = await client.getPageBlocksTree(page.name);
                if (!blocks || blocks.length === 0) {
                  emptyPages.push({
                    type: 'page',
                    id: page.id,
                    name: page.name,
                    journal: page['journal?'] || false,
                    properties: page.properties || {},
                    reason: 'No blocks found',
                  });
                } else {
                  // Check if all blocks are empty
                  const nonEmptyBlocks = blocks.filter((block) => {
                    const content = block.content || '';
                    return content.trim().length > 0;
                  });
                  if (nonEmptyBlocks.length === 0) {
                    emptyPages.push({
                      type: 'page',
                      id: page.id,
                      name: page.name,
                      journal: page['journal?'] || false,
                      properties: page.properties || {},
                      reason: 'All blocks are empty',
                    });
                  }
                }
              } catch (error) {
                // Skip pages with access errors
                continue;
              }
            }
            results = emptyPages;
          }
        } else if (params.q === 'templates:*' || params.q === 'templates:all') {
          // Find all templates
          logger.info('Template discovery search detected');
          const allPages = await client.getAllPages();
          if (allPages && Array.isArray(allPages)) {
            const templates = allPages.filter(
              (page) =>
                page.name.toLowerCase().includes('template') ||
                (page.properties && page.properties.template) ||
                (page.properties && page.properties['page-type'] === 'template')
            );
            results = templates.map((page) => ({
              type: 'template',
              id: page.id,
              name: page.name,
              properties: page.properties || {},
              templateType: page.properties?.['template-type'] || 'page',
            }));
          }
        } else if (params.q.startsWith('template:"') && params.q.includes('"')) {
          // Find specific template
          const match = params.q.match(/^template:"([^"]+)"/);
          if (match) {
            const templateName = match[1];
            logger.info({ templateName }, 'Searching for specific template');
            const allPages = await client.getAllPages();
            const targetTemplate = allPages.find(
              (p) =>
                p.name.toLowerCase() === templateName.toLowerCase() ||
                (p.name.toLowerCase().includes(templateName.toLowerCase()) &&
                  (p.name.toLowerCase().includes('template') ||
                    (p.properties &&
                      (p.properties.template || p.properties['page-type'] === 'template'))))
            );

            if (targetTemplate) {
              // Get template content and structure
              try {
                const blocks = await client.getPageBlocksTree(targetTemplate.name);
                results = [
                  {
                    type: 'template',
                    id: targetTemplate.id,
                    name: targetTemplate.name,
                    properties: targetTemplate.properties || {},
                    templateType: targetTemplate.properties?.['template-type'] || 'page',
                    structure: blocks || [],
                    placeholders: extractTemplatePlaceholders(blocks || []),
                  },
                ];
              } catch (error) {
                results = [
                  {
                    type: 'template',
                    id: targetTemplate.id,
                    name: targetTemplate.name,
                    properties: targetTemplate.properties || {},
                    templateType: targetTemplate.properties?.['template-type'] || 'page',
                  },
                ];
              }
            }
          }
        } else if (params.q.startsWith('property:') && params.q.includes('=')) {
          // Property-based search: property:key=value
          const match = params.q.match(/^property:([^=]+)=(.+)$/);
          if (match) {
            const [, key, value] = match;
            logger.info({ key, value }, 'Property-based search detected');
            const allPages = await client.getAllPages();
            if (allPages && Array.isArray(allPages)) {
              const matchingPages = allPages.filter((page) => {
                if (!page.properties) {
                  return false;
                }
                const propValue = page.properties[key];
                if (propValue === undefined) {
                  return false;
                }

                // Support different comparison types
                const normalizedValue = value.toLowerCase();
                const normalizedPropValue = String(propValue).toLowerCase();

                return (
                  normalizedPropValue === normalizedValue ||
                  normalizedPropValue.includes(normalizedValue)
                );
              });

              results = matchingPages.map((page) => ({
                type: 'page',
                id: page.id,
                name: page.name,
                properties: page.properties || {},
                matchedProperty: { [key]: page.properties?.[key] },
              }));
            }
          }
        } else if (params.q === 'properties:*' || params.q === 'properties:all') {
          // Return all pages that have properties: properties:*
          logger.info('All properties query detected');
          const allPages = await client.getAllPages();
          results = allPages
            .filter((page) => page.properties && Object.keys(page.properties).length > 0)
            .map((page) => ({
              type: 'properties',
              id: page.id,
              name: page.name,
              properties: page.properties || {},
              propertyCount: Object.keys(page.properties || {}).length,
              propertyList: Object.entries(page.properties || {}).map(([key, value]) => ({
                key,
                value,
              })),
            }));
        } else if (params.q.startsWith('properties:page=')) {
          // Get all properties for a specific page: properties:page="PageName" or properties:page=*
          const match = params.q.match(/^properties:page=(?:"([^"]+)"|(.+))$/);
          if (match) {
            const pageName = match[1] || match[2];
            logger.info({ pageName }, 'Page properties query detected');
            const allPages = await client.getAllPages();

            if (pageName === '*' || pageName === 'all') {
              // Return all pages that have properties
              results = allPages
                .filter((page) => page.properties && Object.keys(page.properties).length > 0)
                .map((page) => ({
                  type: 'properties',
                  id: page.id,
                  name: page.name,
                  properties: page.properties || {},
                  propertyCount: Object.keys(page.properties || {}).length,
                  propertyList: Object.entries(page.properties || {}).map(([key, value]) => ({
                    key,
                    value,
                  })),
                }));
            } else {
              // Return specific page properties
              const targetPage = allPages.find(
                (p) =>
                  p.name.toLowerCase() === pageName.toLowerCase() ||
                  p.originalName?.toLowerCase() === pageName.toLowerCase()
              );

              if (targetPage && targetPage.properties) {
                results = [
                  {
                    type: 'properties',
                    id: targetPage.id,
                    name: targetPage.name,
                    properties: targetPage.properties,
                    propertyCount: Object.keys(targetPage.properties).length,
                    propertyList: Object.entries(targetPage.properties).map(([key, value]) => ({
                      key,
                      value,
                    })),
                  },
                ];
              } else if (targetPage) {
                results = [
                  {
                    type: 'properties',
                    id: targetPage.id,
                    name: targetPage.name,
                    properties: {},
                    propertyCount: 0,
                    propertyList: [],
                  },
                ];
              }
            }
          }
        } else if (params.q.startsWith('backlinks:"') && params.q.includes('"')) {
          // Find pages that link to the target page: backlinks:"PageName"
          const match = params.q.match(/^backlinks:"([^"]+)"/);
          if (match) {
            const targetPageName = match[1];
            logger.info({ targetPageName }, 'Backlinks search detected');
            const allPages = await client.getAllPages();
            const backlinks = [];

            // Check first 100 pages for performance
            const pagesToCheck = allPages.slice(0, 100);

            for (const page of pagesToCheck) {
              try {
                const blocks = await client.getPageBlocksTree(page.name);
                if (blocks && blocks.length > 0) {
                  // Check if any block contains a link to the target page
                  const hasBacklink = blocks.some((block) =>
                    checkBlockForPageReference(block, targetPageName)
                  );

                  if (hasBacklink) {
                    backlinks.push({
                      type: 'backlink',
                      id: page.id,
                      name: page.name,
                      targetPage: targetPageName,
                      properties: page.properties || {},
                    });
                  }
                }
              } catch (error) {
                // Skip pages with access errors
                continue;
              }
            }

            results = backlinks;
          }
        } else if (params.q.startsWith('references:"') && params.q.includes('"')) {
          // Find all references (links + mentions) to a page: references:"PageName"
          const match = params.q.match(/^references:"([^"]+)"/);
          if (match) {
            const targetPageName = match[1];
            logger.info({ targetPageName }, 'References search detected');
            const allPages = await client.getAllPages();
            const references = [];

            // Check first 100 pages for performance
            const pagesToCheck = allPages.slice(0, 100);

            for (const page of pagesToCheck) {
              try {
                const blocks = await client.getPageBlocksTree(page.name);
                if (blocks && blocks.length > 0) {
                  const pageReferences = findPageReferences(blocks, targetPageName, page.name);
                  if (pageReferences.length > 0) {
                    references.push({
                      type: 'references',
                      id: page.id,
                      name: page.name,
                      targetPage: targetPageName,
                      referenceCount: pageReferences.length,
                      references: pageReferences,
                      properties: page.properties || {},
                    });
                  }
                }
              } catch (error) {
                // Skip pages with access errors
                continue;
              }
            }

            results = references;
          }
        } else if (params.q.startsWith('date:')) {
          // Date-based search: date:2024-01-01, date:today, date:last-week, etc.
          const dateQuery = params.q.substring(5); // Remove 'date:' prefix
          logger.info({ dateQuery }, 'Date-based search detected');
          const allPages = await client.getAllPages();
          const matchingPages = [];

          const dateFilter = parseDateQuery(dateQuery);
          if (dateFilter) {
            for (const page of allPages) {
              try {
                // Check if page is a journal page with date
                if (page['journal?'] && page.journalDay) {
                  const pageDate = parseLogseqDate(page.journalDay);
                  if (pageDate && dateFilter.matches(pageDate)) {
                    matchingPages.push({
                      type: 'journal',
                      id: page.id,
                      name: page.name,
                      date: pageDate.toISOString().split('T')[0],
                      journalDay: page.journalDay,
                      properties: page.properties || {},
                    });
                  }
                }

                // Also check page properties for date-related fields
                if (page.properties) {
                  const hasMatchingDateProperty = Object.entries(page.properties).some(
                    ([_key, value]) => {
                      if (typeof value === 'string' && isDateLike(value)) {
                        const propDate = new Date(value);
                        return !isNaN(propDate.getTime()) && dateFilter.matches(propDate);
                      }
                      return false;
                    }
                  );

                  if (hasMatchingDateProperty) {
                    matchingPages.push({
                      type: 'page',
                      id: page.id,
                      name: page.name,
                      properties: page.properties,
                      matchReason: 'date-property',
                    });
                  }
                }
              } catch (error) {
                // Skip pages with parsing errors
                continue;
              }
            }
          }

          results = matchingPages;
        } else if (containsCombinedFilters(params.q)) {
          // Handle combined filters with AND/OR logic
          logger.info({ query: params.q }, 'Combined filter search detected');
          const combinedResults = await processCombinedFilters(
            client,
            params.q,
            params.scope || 'all'
          );
          results = combinedResults;
        } else {
          // Normal search logic
          try {
            // Perform actual search using Logseq API
            if (params.scope === 'pages' || params.scope === 'all') {
              try {
                const allPages = await client.getAllPages();
                if (allPages && Array.isArray(allPages)) {
                  const pageResults = allPages.filter(
                    (page) =>
                      page.name.toLowerCase().includes(params.q.toLowerCase()) ||
                      (page.properties &&
                        JSON.stringify(page.properties)
                          .toLowerCase()
                          .includes(params.q.toLowerCase()))
                  );

                  results = results.concat(
                    pageResults.map((page) => ({
                      type: 'page',
                      id: page.id,
                      name: page.name,
                      journal: page['journal?'] || false,
                      properties: page.properties || {},
                    }))
                  );
                }
              } catch (error) {
                logger.warn({ error }, 'Page search failed');
              }
            }

            if (params.scope === 'blocks' || params.scope === 'all') {
              try {
                // Handle page-specific search
                if (params.q.startsWith('page:"') && params.q.includes('"')) {
                  const match = params.q.match(/^page:"([^"]+)"/);
                  if (match) {
                    const pageName = match[1];
                    logger.debug({ pageName }, 'Searching for page');

                    // Find page by name (case-insensitive)
                    const allPages = await client.getAllPages();
                    const targetPage = allPages.find(
                      (p) =>
                        p.name.toLowerCase() === pageName.toLowerCase() ||
                        p.originalName?.toLowerCase() === pageName.toLowerCase()
                    );

                    if (targetPage) {
                      // Get page blocks
                      let blocks = null;
                      try {
                        blocks = await client.getPageBlocksTree(targetPage.id);
                      } catch (error) {
                        try {
                          blocks = await client.getPageBlocksTree(targetPage.name);
                        } catch (nameError) {
                          // Continue without blocks if both attempts fail
                        }
                      }

                      if (blocks && blocks.length > 0) {
                        // Flatten nested blocks
                        const flattenBlocks = (
                          blockList: readonly LogseqBlock[]
                        ): LogseqBlock[] => {
                          let result: LogseqBlock[] = [];
                          for (const block of blockList) {
                            result.push(block);
                            if (block.children && block.children.length > 0) {
                              result = result.concat(flattenBlocks(block.children));
                            }
                          }
                          return result;
                        };

                        const allBlocks = flattenBlocks(blocks);
                        const blockResults = allBlocks.map((block) => ({
                          type: 'block',
                          id: block.uuid || String(block.id),
                          content: block.content || '',
                          page: targetPage.name,
                          properties: block.properties || {},
                        }));
                        results = results.concat(blockResults);
                      }
                    }
                  }
                } else {
                  // Regular search using Logseq API
                  const searchResults = await client.callApi<{
                    blocks: Array<{
                      'block/uuid': string;
                      'block/content': string;
                      'block/page': number;
                    }>;
                    pages: string[];
                  }>('logseq.App.search', [params.q]);

                  if (searchResults?.blocks) {
                    results = results.concat(
                      searchResults.blocks.map((block) => ({
                        type: 'block',
                        id: block['block/uuid'],
                        content: block['block/content'] || '',
                        page: `Page ${block['block/page']}`,
                        properties: {},
                      }))
                    );
                  }
                }
              } catch (error) {
                logger.warn({ error }, 'Block search failed');
              }
            }
          } catch (error) {
            logger.warn({ error }, 'Search operation partially failed');
            // Continue with partial results
          }
        }

        // Apply limit and pagination
        const limit = Math.min(params.limit || 20, 100);
        const startIndex = params.cursor ? parseInt(params.cursor, 10) || 0 : 0;
        const endIndex = startIndex + limit;
        const paginatedResults = results.slice(startIndex, endIndex);

        const hasMore = results.length > endIndex;
        const nextCursor = hasMore ? endIndex.toString() : undefined;

        logger.info(
          {
            query: params.q,
            totalResults: results.length,
            returnedResults: paginatedResults.length,
            hasMore,
          },
          'Search completed'
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                createResponse({
                  results: paginatedResults,
                  totalCount: results.length,
                  hasMore,
                  nextCursor,
                  query: params.q,
                  scope: params.scope,
                }),
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.error({ error }, 'Search failed');
        const response = createErrorResponse(ErrorCode.INTERNAL, `Search failed: ${error}`);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      }
    },
  };

  return { tools, handlers };
}
