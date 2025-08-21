import type { LogseqClient } from '../../logseq-client.js';
import { ErrorCode } from '../../schemas/logseq.js';
import { createResponse, createErrorResponse } from '../common.js';
import { logger } from '../../utils/logger.js';
import type {
  ManageRelationsParams,
  RelationAnalysis,
  GraphStructure,
  ConnectionData,
} from './relation-types.js';
import { extractOutgoingLinks, findBacklinksToPage, identifyClusters } from './relation-utils.js';

/**
 * Analyze relationships for a page with specified depth
 */
export async function analyzePageRelations(
  client: LogseqClient,
  params: ManageRelationsParams
): Promise<unknown> {
  try {
    const analysis = await performRelationAnalysis(client, params.sourcePage, params.depth || 2);

    return createResponse({
      success: true,
      operation: 'analyze-relations',
      sourcePage: params.sourcePage,
      depth: params.depth || 2,
      ...analysis,
    });
  } catch (error) {
    return createErrorResponse(ErrorCode.INTERNAL, `Failed to analyze relations: ${error}`);
  }
}

/**
 * Get graph structure analysis
 */
export async function getGraphStructure(
  client: LogseqClient,
  params: ManageRelationsParams
): Promise<unknown> {
  try {
    const structure = await analyzeGraphStructure(client, params.sourcePage);

    return createResponse({
      success: true,
      operation: 'get-graph-structure',
      sourcePage: params.sourcePage,
      ...structure,
    });
  } catch (error) {
    return createErrorResponse(ErrorCode.INTERNAL, `Failed to analyze graph structure: ${error}`);
  }
}

/**
 * Perform comprehensive relation analysis
 */
async function performRelationAnalysis(
  client: LogseqClient,
  pageName: string,
  depth: number
): Promise<RelationAnalysis> {
  const connections = new Map<string, ConnectionData>();
  const visited = new Set<string>();

  // Check if page exists first
  const graphPages = await client.getAllPages();
  const currentPage = graphPages.find(
    (p) =>
      p.name.toLowerCase() === pageName.toLowerCase() ||
      p.originalName?.toLowerCase() === pageName.toLowerCase()
  );

  if (!currentPage) {
    logger.warn({ pageName }, 'Source page not found for relation analysis');
    return {
      directConnections: [],
      indirectConnections: [],
      clusters: [],
      isolatedPages: [pageName],
      metrics: { totalConnections: 0, averagePathLength: 0, density: 0 },
    };
  }

  // Analyze connections recursively up to specified depth
  await analyzeConnectionsRecursive(client, pageName, depth, connections, visited, []);

  logger.debug(
    {
      sourcePage: pageName,
      totalConnections: connections.size,
      connectionKeys: Array.from(connections.keys()),
    },
    'Relation analysis completed'
  );

  // Separate direct and indirect connections
  // Direct connections have path length 0 or 1 (connected directly to source)
  const directConnections = Array.from(connections.entries())
    .filter(([_, data]) => data.path.length <= 1)
    .map(([page, data]) => ({
      page,
      connectionType: data.type,
      strength: data.strength,
    }));

  const indirectConnections = Array.from(connections.entries())
    .filter(([_, data]) => data.path.length > 1)
    .map(([page, data]) => ({
      page,
      path: data.path,
      strength: data.strength,
    }));

  // Simple clustering based on shared connections
  const clusters = identifyClusters(directConnections);

  // Find isolated pages (pages with no connections)
  const allPages = Array.from(connections.keys()).concat([pageName]);
  const isolatedPages = allPages.filter(
    (page) => !directConnections.some((conn) => conn.page === page) && page !== pageName
  );

  const metrics = {
    totalConnections: directConnections.length,
    averagePathLength:
      indirectConnections.length > 0
        ? indirectConnections.reduce((sum, conn) => sum + conn.path.length, 0) /
          indirectConnections.length
        : 0,
    density: directConnections.length / Math.max(1, allPages.length - 1),
  };

  return {
    directConnections: directConnections.slice(0, 20), // Limit for readability
    indirectConnections: indirectConnections.slice(0, 10),
    clusters: clusters.slice(0, 5),
    isolatedPages: isolatedPages.slice(0, 10),
    metrics,
  };
}

/**
 * Recursively analyze connections
 */
async function analyzeConnectionsRecursive(
  client: LogseqClient,
  pageName: string,
  remainingDepth: number,
  connections: Map<string, ConnectionData>,
  visited: Set<string>,
  currentPath: string[]
): Promise<void> {
  if (remainingDepth <= 0 || visited.has(pageName)) {
    return;
  }

  visited.add(pageName);

  try {
    // Check if page exists first
    const pagesInGraph = await client.getAllPages();
    const currentPage = pagesInGraph.find(
      (p) =>
        p.name.toLowerCase() === pageName.toLowerCase() ||
        p.originalName?.toLowerCase() === pageName.toLowerCase()
    );

    if (!currentPage) {
      logger.debug({ pageName }, 'Page not found in relation analysis');
      return;
    }

    // Get outgoing links from this page
    const blocks = await client.getPageBlocksTree(pageName);
    if (blocks && blocks.length > 0) {
      const outgoingLinks = extractOutgoingLinks(blocks);

      for (const linkedPage of outgoingLinks) {
        const newPath = [...currentPath, pageName];
        if (!connections.has(linkedPage)) {
          connections.set(linkedPage, {
            type: 'outgoing',
            strength: 1,
            path: newPath,
          });

          logger.debug(
            {
              from: pageName,
              to: linkedPage,
              pathLength: newPath.length,
              path: newPath,
            },
            'Found outgoing connection'
          );
        }

        // Recursively analyze if depth allows
        if (remainingDepth > 1) {
          await analyzeConnectionsRecursive(
            client,
            linkedPage,
            remainingDepth - 1,
            connections,
            visited,
            newPath
          );
        }
      }
    }

    // Also find incoming links (backlinks) from other pages
    if (currentPath.length === 0) {
      // Only for the root page to avoid exponential complexity
      logger.debug({ pageName }, 'Finding backlinks for root page');
      const graphPagesForBacklinks = await client.getAllPages();
      const backlinks = await findBacklinksToPage(client, pageName, graphPagesForBacklinks);
      logger.debug({ pageName, backlinks }, 'Found backlinks');

      for (const backlink of backlinks) {
        if (!connections.has(backlink) && !visited.has(backlink)) {
          connections.set(backlink, {
            type: 'incoming',
            strength: 1,
            path: [pageName], // Direct connection to source
          });

          logger.debug(
            {
              from: backlink,
              to: pageName,
              type: 'incoming',
            },
            'Found incoming connection'
          );
        }
      }
    }
  } catch (error) {
    // Skip pages we can't access
  }
}

/**
 * Analyze graph structure around a page
 */
async function analyzeGraphStructure(
  client: LogseqClient,
  pageName: string
): Promise<GraphStructure> {
  try {
    // Get immediate neighborhood
    const blocks = await client.getPageBlocksTree(pageName);
    const outgoingLinks = blocks ? extractOutgoingLinks(blocks) : [];

    // Analyze 2-hop neighborhood
    const twoHopNeighbors = new Set<string>();
    for (const neighbor of outgoingLinks.slice(0, 10)) {
      // Limit for performance
      try {
        const neighborBlocks = await client.getPageBlocksTree(neighbor);
        if (neighborBlocks) {
          const neighborLinks = extractOutgoingLinks(neighborBlocks);
          neighborLinks.forEach((link) => {
            if (link !== pageName) {
              twoHopNeighbors.add(link);
            }
          });
        }
      } catch (error) {
        // Skip inaccessible neighbors
      }
    }

    const neighborhoods = [
      { distance: 1, pages: outgoingLinks },
      { distance: 2, pages: Array.from(twoHopNeighbors) },
    ];

    const nodeCount = 1 + outgoingLinks.length + twoHopNeighbors.size;
    const edgeCount = outgoingLinks.length + Array.from(twoHopNeighbors).length;
    const centralityScore = outgoingLinks.length; // Simple degree centrality

    // Identify potential bridge pages (pages that connect different clusters)
    const bridgePages = outgoingLinks
      .filter((page) => Array.from(twoHopNeighbors).includes(page))
      .slice(0, 5);

    return {
      nodeCount,
      edgeCount,
      centralityScore,
      neighborhoods,
      bridgePages,
    };
  } catch (error) {
    return {
      nodeCount: 0,
      edgeCount: 0,
      centralityScore: 0,
      neighborhoods: [],
      bridgePages: [],
    };
  }
}
