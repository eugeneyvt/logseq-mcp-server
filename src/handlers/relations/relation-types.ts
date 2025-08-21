import { z } from 'zod';

/**
 * Schema for manage_relations parameters
 */
export const ManageRelationsParamsSchema = z.object({
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

export type ManageRelationsParams = z.infer<typeof ManageRelationsParamsSchema>;

/**
 * Types for relation analysis results
 */
export interface RelationAnalysis {
  directConnections: Array<{ page: string; connectionType: string; strength: number }>;
  indirectConnections: Array<{ page: string; path: string[]; strength: number }>;
  clusters: Array<{ name: string; pages: string[]; centralityScore: number }>;
  isolatedPages: string[];
  metrics: { totalConnections: number; averagePathLength: number; density: number };
}

/**
 * Types for graph structure analysis
 */
export interface GraphStructure {
  nodeCount: number;
  edgeCount: number;
  centralityScore: number;
  neighborhoods: Array<{ distance: number; pages: string[] }>;
  bridgePages: string[];
}

/**
 * Connection data structure
 */
export interface ConnectionData {
  type: string;
  strength: number;
  path: string[];
}
