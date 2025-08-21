import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { LogseqClient } from '../logseq-client.js';
import type { LogseqBlock } from '../schemas/base-types.js';
import { ErrorCode } from '../schemas/logseq.js';
import { logger } from '../utils/logger.js';
import { createResponse, createErrorResponse, type ToolResult } from './common.js';
import { z } from 'zod';

// Schema for manage_relations parameters
const ManageRelationsParamsSchema = z.object({
  operation: z.enum(['create-link', 'remove-link', 'analyze-relations', 'get-graph-structure']),
  sourcePage: z.string().min(1),
  targetPage: z.string().optional(),
  linkText: z.string().optional(),
  context: z.string().optional(), // For adding links with context
  depth: z.number().min(1).max(3).optional().default(2), // For relation analysis depth
  control: z
    .object({
      dryRun: z.boolean().optional().default(false),
      strict: z.boolean().optional().default(true),
      idempotencyKey: z.string().optional(),
      maxOps: z.number().optional().default(100),
      autofixFormat: z.boolean().optional().default(true),
    })
    .optional()
    .default({}),
});

type ManageRelationsParams = z.infer<typeof ManageRelationsParamsSchema>;

/**
 * Create relation management tools and handlers
 */
export function createRelationHandlers(client: LogseqClient): {
  tools: Tool[];
  handlers: Record<string, (args: unknown) => Promise<ToolResult>>;
} {
  const tools: Tool[] = [
    {
      name: 'manage_relations',
      description:
        'Comprehensive relationship management for Logseq pages. Operations: create-link (add links between pages), remove-link (remove page links), analyze-relations (get relationship analysis), get-graph-structure (analyze page connectivity). Creates bi-directional references and manages page relationships.',
      inputSchema: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['create-link', 'remove-link', 'analyze-relations', 'get-graph-structure'],
            description:
              'Operation to perform: create-link, remove-link, analyze-relations, or get-graph-structure',
          },
          sourcePage: {
            type: 'string',
            description: 'Source page name',
          },
          targetPage: {
            type: 'string',
            description: 'Target page name (required for create-link and remove-link operations)',
          },
          linkText: {
            type: 'string',
            description: 'Optional text context for the link (e.g., "relates to", "inspired by")',
          },
          context: {
            type: 'string',
            description: 'Optional context text to include with the link',
          },
          depth: {
            type: 'number',
            minimum: 1,
            maximum: 3,
            default: 2,
            description: 'Analysis depth for relation analysis (1-3)',
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
        required: ['operation', 'sourcePage'],
      },
    },
  ];

  const handlers = {
    manage_relations: async (args: unknown): Promise<ToolResult> => {
      try {
        const params = ManageRelationsParamsSchema.parse(args);

        logger.info(
          {
            operation: params.operation,
            sourcePage: params.sourcePage,
            targetPage: params.targetPage,
          },
          'Managing relations'
        );

        // Handle dry run
        if (params.control.dryRun) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  createResponse({
                    success: true,
                    dryRun: true,
                    operation: params.operation,
                    sourcePage: params.sourcePage,
                    targetPage: params.targetPage,
                    message: 'Dry run - no changes were made',
                  }),
                  null,
                  2
                ),
              },
            ],
          };
        }

        // Route to appropriate operation handler
        let result;
        switch (params.operation) {
          case 'create-link':
            result = await createPageLink(client, params);
            break;
          case 'remove-link':
            result = await removePageLink(client, params);
            break;
          case 'analyze-relations':
            result = await analyzePageRelations(client, params);
            break;
          case 'get-graph-structure':
            result = await getGraphStructure(client, params);
            break;
          default:
            result = createErrorResponse(
              ErrorCode.VALIDATION_ERROR,
              `Unknown operation: ${params.operation}`,
              'Supported operations: create-link, remove-link, analyze-relations, get-graph-structure'
            );
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error({ error }, 'Manage relations failed');
        const response = createErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          `Invalid parameters: ${error}`
        );
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

/**
 * Create a link between two pages
 */
async function createPageLink(
  client: LogseqClient,
  params: ManageRelationsParams
): Promise<unknown> {
  if (!params.targetPage) {
    return createErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'targetPage is required for create-link operation'
    );
  }

  try {
    // Ensure both pages exist
    await client.callApi('logseq.Editor.createPage', [params.sourcePage]);
    await client.callApi('logseq.Editor.createPage', [params.targetPage]);

    // Create link content
    const linkContent = buildLinkContent(params.targetPage, params.linkText, params.context);

    // Add link to source page
    await client.callApi('logseq.Editor.insertBlock', [
      params.sourcePage,
      linkContent,
      { sibling: false },
    ]);

    // Create bi-directional reference (optional backlink)
    const backlinkContent = buildBacklinkContent(params.sourcePage, params.linkText);
    await client.callApi('logseq.Editor.insertBlock', [
      params.targetPage,
      backlinkContent,
      { sibling: false },
    ]);

    return createResponse({
      success: true,
      operation: 'create-link',
      sourcePage: params.sourcePage,
      targetPage: params.targetPage,
      linkContent,
      backlinkContent,
      message: 'Bi-directional link created successfully',
    });
  } catch (error) {
    return createErrorResponse(
      ErrorCode.INTERNAL,
      `Failed to create link: ${error}`,
      'Check that both pages exist and are accessible'
    );
  }
}

/**
 * Remove links between two pages
 */
async function removePageLink(
  client: LogseqClient,
  params: ManageRelationsParams
): Promise<unknown> {
  if (!params.targetPage) {
    return createErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'targetPage is required for remove-link operation'
    );
  }

  try {
    let removedCount = 0;

    // Remove links from source page
    const sourceBlocks = await client.getPageBlocksTree(params.sourcePage);
    if (sourceBlocks) {
      removedCount += await removeLinkReferences(client, sourceBlocks, params.targetPage);
    }

    // Remove backlinks from target page
    const targetBlocks = await client.getPageBlocksTree(params.targetPage);
    if (targetBlocks) {
      removedCount += await removeLinkReferences(client, targetBlocks, params.sourcePage);
    }

    return createResponse({
      success: true,
      operation: 'remove-link',
      sourcePage: params.sourcePage,
      targetPage: params.targetPage,
      removedReferences: removedCount,
      message: `Removed ${removedCount} references between the pages`,
    });
  } catch (error) {
    return createErrorResponse(ErrorCode.INTERNAL, `Failed to remove links: ${error}`);
  }
}

/**
 * Analyze relationships for a page with specified depth
 */
async function analyzePageRelations(
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
async function getGraphStructure(
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
 * Build link content with optional context
 */
function buildLinkContent(targetPage: string, linkText?: string, context?: string): string {
  let content = `[[${targetPage}]]`;

  if (linkText) {
    content = `${linkText} [[${targetPage}]]`;
  }

  if (context) {
    content += ` - ${context}`;
  }

  return content;
}

/**
 * Build backlink content
 */
function buildBacklinkContent(sourcePage: string, linkText?: string): string {
  const relationText = linkText ? `Referenced by` : 'Related to';
  return `${relationText}: [[${sourcePage}]]`;
}

/**
 * Remove link references from blocks
 */
async function removeLinkReferences(
  client: LogseqClient,
  blocks: readonly LogseqBlock[],
  targetPage: string
): Promise<number> {
  let removedCount = 0;
  const targetLower = targetPage.toLowerCase();

  const processBlock = async (block: LogseqBlock) => {
    if (block.content && block.uuid) {
      const content = block.content;
      const contentLower = content.toLowerCase();

      // Check if this block contains a reference to the target page
      if (contentLower.includes(`[[${targetLower}]]`)) {
        try {
          // Remove the specific link references
          const updatedContent = content.replace(
            new RegExp(`\\[\\[${targetPage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\]`, 'gi'),
            ''
          );

          // Clean up any extra whitespace or formatting
          const cleanedContent = updatedContent.replace(/\s+/g, ' ').trim();

          // If the block still has meaningful content, update it; otherwise delete it
          if (cleanedContent && cleanedContent !== '-') {
            await client.callApi('logseq.Editor.updateBlock', [block.uuid, cleanedContent]);
          } else {
            await client.callApi('logseq.Editor.removeBlock', [block.uuid]);
          }

          removedCount++;
        } catch (error) {
          // Skip blocks that can't be updated
        }
      }
    }

    // Process children recursively
    if (block.children) {
      for (const child of block.children) {
        await processBlock(child);
      }
    }
  };

  for (const block of blocks) {
    await processBlock(block);
  }

  return removedCount;
}

/**
 * Perform comprehensive relation analysis
 */
async function performRelationAnalysis(
  client: LogseqClient,
  pageName: string,
  depth: number
): Promise<{
  directConnections: Array<{ page: string; connectionType: string; strength: number }>;
  indirectConnections: Array<{ page: string; path: string[]; strength: number }>;
  clusters: Array<{ name: string; pages: string[]; centralityScore: number }>;
  isolatedPages: string[];
  metrics: { totalConnections: number; averagePathLength: number; density: number };
}> {
  const connections = new Map<string, { type: string; strength: number; path: string[] }>();
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
  connections: Map<string, { type: string; strength: number; path: string[] }>,
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
 * Extract outgoing links from blocks
 */
function extractOutgoingLinks(blocks: readonly LogseqBlock[]): string[] {
  const links = new Set<string>();

  const processBlock = (block: LogseqBlock) => {
    if (block.content) {
      // Enhanced pattern matching for various link formats
      const patterns = [
        /\[\[([^\]]+)\]\]/g, // [[PageName]]
        /#\[\[([^\]]+)\]\]/g, // #[[PageName]]
        /#([A-Za-z0-9/\-_]+)/g, // #PageName or #KB/Dev/Generic
      ];

      patterns.forEach((pattern) => {
        const matches = block.content!.match(pattern);
        if (matches) {
          matches.forEach((match) => {
            let pageName = '';
            if (match.startsWith('[[') && match.endsWith(']]')) {
              pageName = match.slice(2, -2).trim();
            } else if (match.startsWith('#[[') && match.endsWith(']]')) {
              pageName = match.slice(3, -2).trim();
            } else if (match.startsWith('#')) {
              pageName = match.slice(1).trim();
            }

            if (pageName && pageName.length > 0) {
              links.add(pageName);
            }
          });
        }
      });
    }

    if (block.children) {
      block.children.forEach(processBlock);
    }
  };

  blocks.forEach(processBlock);
  return Array.from(links);
}

/**
 * Find all pages that link to the target page
 */
async function findBacklinksToPage(
  client: LogseqClient,
  targetPageName: string,
  allPages: readonly unknown[]
): Promise<string[]> {
  const backlinks: string[] = [];

  // Check a reasonable number of pages to avoid performance issues
  const pagesToCheck = allPages.slice(0, 50);

  for (const page of pagesToCheck) {
    const pageObj = page as { name: string; id: unknown };
    if (pageObj.name === targetPageName) {
      continue;
    } // Skip self

    try {
      const blocks = await client.getPageBlocksTree(pageObj.name);
      if (blocks && blocks.length > 0) {
        const outgoingLinks = extractOutgoingLinks(blocks);
        if (outgoingLinks.some((link) => link.toLowerCase() === targetPageName.toLowerCase())) {
          backlinks.push(pageObj.name);
        }
      }
    } catch (error) {
      // Skip pages we can't access
      continue;
    }
  }

  return backlinks;
}

/**
 * Identify clusters of related pages
 */
function identifyClusters(
  connections: Array<{ page: string; connectionType: string; strength: number }>
): Array<{ name: string; pages: string[]; centralityScore: number }> {
  // Simple clustering: group pages by connection patterns
  // For now, create clusters based on pages with multiple connections
  const pageConnectionCounts = new Map<string, number>();
  connections.forEach((conn) => {
    pageConnectionCounts.set(conn.page, (pageConnectionCounts.get(conn.page) || 0) + conn.strength);
  });

  // Pages with high connection counts become cluster centers
  const clusterCenters = Array.from(pageConnectionCounts.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3) // Top 3 cluster centers
    .map(([page]) => page);

  return clusterCenters.map((center) => ({
    name: `${center}-cluster`,
    pages: [center],
    centralityScore: pageConnectionCounts.get(center) || 0,
  }));
}

/**
 * Analyze graph structure around a page
 */
async function analyzeGraphStructure(
  client: LogseqClient,
  pageName: string
): Promise<{
  nodeCount: number;
  edgeCount: number;
  centralityScore: number;
  neighborhoods: Array<{ distance: number; pages: string[] }>;
  bridgePages: string[];
}> {
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
