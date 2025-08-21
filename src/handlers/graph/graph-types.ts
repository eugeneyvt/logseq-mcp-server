import type { GraphMap } from '../../schemas/logseq.js';

/**
 * Graph cache configuration
 */
export interface GraphCacheConfig {
  GRAPH_MAP_CACHE_TTL: number;
}

/**
 * Graph cache state
 */
export interface GraphCacheState {
  graphMapCache: GraphMap | null;
  graphMapCacheTime: number;
}

/**
 * Graph map builder parameters
 */
export interface GraphMapBuilderParams {
  refresh?: boolean;
}

/**
 * Placement suggestion parameters
 */
export interface PlacementSuggestionParams {
  intent: string;
  title: string;
  keywords?: string[];
  preferBranch?: string;
  control?: {
    dryRun?: boolean;
    strict?: boolean;
    idempotencyKey?: string;
    maxOps?: number;
    autofixFormat?: boolean;
  };
}

/**
 * Content planning parameters
 */
export interface ContentPlanningParams {
  title: string;
  outline?: string[];
  intent?: string;
  control?: {
    dryRun?: boolean;
    strict?: boolean;
    idempotencyKey?: string;
    maxOps?: number;
    autofixFormat?: boolean;
  };
}

/**
 * Batch operation result
 */
export interface BatchOperationResult {
  operation: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

/**
 * Batch execution summary
 */
export interface BatchExecutionSummary {
  total: number;
  successful: number;
  failed: number;
  atomic: boolean;
}
