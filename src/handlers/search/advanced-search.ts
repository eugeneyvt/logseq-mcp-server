import type { LogseqClient } from '../../logseq-client.js';
import { checkBlockForPageReference, findPageReferences } from './search-utils.js';
import { parseDateQuery, parseLogseqDate, isDateLike } from './date-utils.js';
import { containsCombinedFilters, processCombinedFilters } from './filter-engine.js';

/**
 * Execute advanced search operations (backlinks, references, date, combined filters)
 * This module only handles relationship and complex searches
 */
export async function executeAdvancedSearch(
  client: LogseqClient,
  query: string,
  scope: string
): Promise<Array<Record<string, unknown>>> {
  if (query.startsWith('backlinks:"') && query.includes('"')) {
    return await executeBacklinksSearch(client, query);
  }

  if (query.startsWith('references:"') && query.includes('"')) {
    return await executeReferencesSearch(client, query);
  }

  if (query.startsWith('date:')) {
    return await executeDateSearch(client, query);
  }

  if (containsCombinedFilters(query)) {
    return await processCombinedFilters(client, query, scope);
  }

  return [];
}

/**
 * Execute backlinks search
 */
async function executeBacklinksSearch(
  client: LogseqClient,
  query: string
): Promise<Array<Record<string, unknown>>> {
  const match = query.match(/^backlinks:"([^"]+)"/);
  if (!match) {
    return [];
  }

  const targetPageName = match[1];
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

  return backlinks;
}

/**
 * Execute references search
 */
async function executeReferencesSearch(
  client: LogseqClient,
  query: string
): Promise<Array<Record<string, unknown>>> {
  const match = query.match(/^references:"([^"]+)"/);
  if (!match) {
    return [];
  }

  const targetPageName = match[1];
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

  return references;
}

/**
 * Execute date-based search
 */
async function executeDateSearch(
  client: LogseqClient,
  query: string
): Promise<Array<Record<string, unknown>>> {
  const dateQuery = query.substring(5); // Remove 'date:' prefix
  const allPages = await client.getAllPages();
  const matchingPages = [];

  const dateFilter = parseDateQuery(dateQuery);
  if (!dateFilter) {
    return [];
  }

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
        const hasMatchingDateProperty = Object.entries(page.properties).some(([_key, value]) => {
          if (typeof value === 'string' && isDateLike(value)) {
            const propDate = new Date(value);
            return !isNaN(propDate.getTime()) && dateFilter.matches(propDate);
          }
          return false;
        });

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

  return matchingPages;
}
