import type { LogseqClient } from '../../logseq-client.js';
import type { LogseqBlock } from '../../schemas/base-types.js';
import { logger } from '../../utils/logger.js';

/**
 * Execute general search operations (normal page and block searches)
 * This module handles general text searches and page-specific block searches
 */
export async function executeGeneralSearch(
  client: LogseqClient,
  query: string,
  scope: string
): Promise<Array<Record<string, unknown>>> {
  const results: Array<Record<string, unknown>> = [];

  try {
    // Search pages if scope includes pages
    if (scope === 'pages' || scope === 'all') {
      const pageResults = await executePageSearch(client, query);
      results.push(...pageResults);
    }

    // Search blocks if scope includes blocks
    if (scope === 'blocks' || scope === 'all') {
      const blockResults = await executeBlockSearch(client, query);
      results.push(...blockResults);
    }
  } catch (error) {
    logger.warn({ error }, 'Search operation partially failed');
    // Continue with partial results
  }

  return results;
}

/**
 * Execute page search
 */
async function executePageSearch(
  client: LogseqClient,
  query: string
): Promise<Array<Record<string, unknown>>> {
  try {
    const allPages = await client.getAllPages();
    if (!allPages || !Array.isArray(allPages)) {
      return [];
    }

    const pageResults = allPages.filter(
      (page) =>
        page.name.toLowerCase().includes(query.toLowerCase()) ||
        (page.properties &&
          JSON.stringify(page.properties).toLowerCase().includes(query.toLowerCase()))
    );

    return pageResults.map((page) => ({
      type: 'page',
      id: page.id,
      name: page.name,
      journal: page['journal?'] || false,
      properties: page.properties || {},
    }));
  } catch (error) {
    logger.warn({ error }, 'Page search failed');
    return [];
  }
}

/**
 * Execute block search
 */
async function executeBlockSearch(
  client: LogseqClient,
  query: string
): Promise<Array<Record<string, unknown>>> {
  try {
    // Handle page-specific search
    if (query.startsWith('page:"') && query.includes('"')) {
      return await executePageSpecificBlockSearch(client, query);
    } else {
      return await executeGeneralBlockSearch(client, query);
    }
  } catch (error) {
    logger.warn({ error }, 'Block search failed');
    return [];
  }
}

/**
 * Execute page-specific block search
 */
async function executePageSpecificBlockSearch(
  client: LogseqClient,
  query: string
): Promise<Array<Record<string, unknown>>> {
  const match = query.match(/^page:"([^"]+)"/);
  if (!match) {
    return [];
  }

  const pageName = match[1];
  logger.debug({ pageName }, 'Searching for page');

  // Find page by name (case-insensitive)
  const allPages = await client.getAllPages();
  const targetPage = allPages.find(
    (p) =>
      p.name.toLowerCase() === pageName.toLowerCase() ||
      p.originalName?.toLowerCase() === pageName.toLowerCase()
  );

  if (!targetPage) {
    return [];
  }

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

  if (!blocks || blocks.length === 0) {
    return [];
  }

  // Flatten nested blocks
  const flattenBlocks = (blockList: readonly LogseqBlock[]): LogseqBlock[] => {
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
  return allBlocks.map((block) => ({
    type: 'block',
    id: block.uuid || String(block.id),
    content: block.content || '',
    page: targetPage.name,
    properties: block.properties || {},
  }));
}

/**
 * Execute general block search using Logseq API
 */
async function executeGeneralBlockSearch(
  client: LogseqClient,
  query: string
): Promise<Array<Record<string, unknown>>> {
  const searchResults = await client.callApi<{
    blocks: Array<{
      'block/uuid': string;
      'block/content': string;
      'block/page': number;
    }>;
    pages: string[];
  }>('logseq.App.search', [query]);

  if (!searchResults?.blocks) {
    return [];
  }

  return searchResults.blocks.map((block) => ({
    type: 'block',
    id: block['block/uuid'],
    content: block['block/content'] || '',
    page: `Page ${block['block/page']}`,
    properties: {},
  }));
}
