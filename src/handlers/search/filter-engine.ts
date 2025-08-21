import type { LogseqClient } from '../../logseq-client.js';
import { logger } from '../../utils/logger.js';

// Types for filter expressions
export interface FilterExpression {
  operator: 'AND' | 'OR' | 'FILTER';
  operands?: FilterExpression[];
  filter?: string;
}

/**
 * Check if a query contains combined filters (AND/OR logic)
 */
export function containsCombinedFilters(query: string): boolean {
  // Check for AND/OR operators (case insensitive)
  return /\b(AND|OR)\b/i.test(query);
}

/**
 * Process combined filters with AND/OR logic
 */
export async function processCombinedFilters(
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
export function parseFilterExpression(query: string): FilterExpression {
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
export async function evaluateFilterExpression(
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
export async function executeSingleFilter(
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

    const { parseDateQuery, parseLogseqDate } = await import('./date-utils.js');
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
      const { checkBlockForPageReference } = await import('./search-utils.js');

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
export function intersectResults(
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
export function unionResults(
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
