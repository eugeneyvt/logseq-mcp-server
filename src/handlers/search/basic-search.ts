import type { LogseqClient } from '../../logseq-client.js';

/**
 * Execute basic search operations (wildcard and empty page searches)
 * This module only handles wildcard (*) and empty page searches
 */
export async function executeBasicSearch(
  client: LogseqClient,
  query: string
): Promise<Array<Record<string, unknown>>> {
  if (query === '*' || query === 'all' || query === 'everything') {
    return await executeWildcardSearch(client);
  }

  if (
    query.toLowerCase().includes('empty') ||
    query.toLowerCase().includes('no content') ||
    query.toLowerCase().includes('blank')
  ) {
    return await executeEmptyPageSearch(client);
  }

  return [];
}

/**
 * Execute wildcard search returning all pages
 */
async function executeWildcardSearch(
  client: LogseqClient
): Promise<Array<Record<string, unknown>>> {
  const allPages = await client.getAllPages();
  if (allPages && Array.isArray(allPages)) {
    return allPages.map((page) => ({
      type: 'page',
      id: page.id,
      name: page.name,
      journal: page['journal?'] || false,
      properties: page.properties || {},
    }));
  }
  return [];
}

/**
 * Execute empty page search
 */
async function executeEmptyPageSearch(
  client: LogseqClient
): Promise<Array<Record<string, unknown>>> {
  const allPages = await client.getAllPages();
  if (!allPages || !Array.isArray(allPages)) {
    return [];
  }

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

  return emptyPages;
}
