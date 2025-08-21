import type { LogseqClient } from '../../logseq-client.js';
import { ErrorCode } from '../../schemas/logseq.js';
import { createResponse, createErrorResponse, type ToolResult } from '../common.js';
import { logger } from '../../utils/logger.js';
import { updateCache, getCachedGraphMap, shouldRefreshCache, getCacheAge } from './graph-cache.js';
import type { GraphMapBuilderParams } from './graph-types.js';

/**
 * Build graph map with caching support
 */
export async function buildGraphMap(
  client: LogseqClient,
  params: GraphMapBuilderParams
): Promise<ToolResult> {
  try {
    // Check cache first
    const cachedMap = getCachedGraphMap();
    if (!shouldRefreshCache(params.refresh) && cachedMap) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              createResponse({
                ...cachedMap,
                cached: true,
                cacheAge: getCacheAge(),
              }),
              null,
              2
            ),
          },
        ],
      };
    }

    logger.info('Building graph map');

    // Build basic graph structure
    const pages = await client.getAllPages();
    const pageMap = new Map();
    const namespaces = new Set<string>();
    const tags = new Set<string>();

    // Ensure pages is iterable and not null/undefined
    if (!pages || !Array.isArray(pages)) {
      logger.warn('getAllPages returned null, undefined, or non-array result');
      const emptyGraphMap = {
        pages: [],
        generatedAt: Date.now(),
        stats: {
          totalPages: 0,
          journalPages: 0,
          taggedPages: 0,
        },
      };
      updateCache(emptyGraphMap);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(createResponse(emptyGraphMap), null, 2),
          },
        ],
      };
    }

    for (const page of pages) {
      pageMap.set(page.name, {
        id: page.id,
        name: page.name,
        journal: page['journal?'] || false,
        properties: page.properties || {},
      });

      // Extract namespaces (pages with '/' in name)
      if (page.name.includes('/')) {
        const namespace = page.name.split('/')[0];
        namespaces.add(namespace);
      }

      // Extract tags from properties
      if (page.properties?.tags) {
        const pageTags = Array.isArray(page.properties.tags)
          ? page.properties.tags
          : [page.properties.tags];
        pageTags.forEach((tag: unknown) => tags.add(String(tag)));
      }
    }

    const graphMap = {
      pages: Array.from(pageMap.values()),
      generatedAt: Date.now(),
      stats: {
        totalPages: pages.length,
        journalPages: pages.filter((p) => p['journal?']).length,
        taggedPages: Array.from(tags).length,
      },
    };

    // Update cache
    updateCache(graphMap);

    logger.info(
      {
        pageCount: pages.length,
        namespaceCount: namespaces.size,
        tagCount: tags.size,
      },
      'Graph map built successfully'
    );

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(createResponse(graphMap), null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error({ error }, 'Failed to build graph map');
    const response = createErrorResponse(ErrorCode.INTERNAL, `Failed to build graph map: ${error}`);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }
}
