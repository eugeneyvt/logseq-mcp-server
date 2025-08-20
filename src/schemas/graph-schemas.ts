import { z } from 'zod';
import { ControlParamsSchema } from './validation-schemas.js';

/**
 * Graph, context, and batch operation schemas
 */

export const BuildGraphMapParamsSchema = z.object({
  refresh: z.boolean().default(false),
});

export const SuggestPlacementParamsSchema = z.object({
  intent: z.string().min(1).max(500),
  title: z.string().min(1).max(200),
  keywords: z.array(z.string()).max(20).optional(),
  preferBranch: z.string().optional(),
  control: ControlParamsSchema,
});

export const PlanContentParamsSchema = z.object({
  title: z.string().min(1).max(200),
  outline: z.array(z.string()).max(100).optional(),
  intent: z.string().max(1000).optional(),
  control: ControlParamsSchema,
});

export const BatchOpSchema = z.object({
  operation: z.enum([
    'ensure_page',
    'get_page',
    'set_page_content',
    'append_blocks',
    'update_block',
    'search',
    'delete_page',
  ]),
  args: z.record(z.string(), z.unknown()),
});

export const BatchParamsSchema = z.object({
  ops: z.array(BatchOpSchema).min(1).max(100),
  atomic: z.boolean().default(true),
  control: ControlParamsSchema,
});

/**
 * Graph map structure
 */
export interface GraphMap {
  pages: Array<{
    name: string;
    id: number;
    prefixes: string[];
    tags: string[];
    journal: boolean;
    lastModified?: number;
  }>;
  generatedAt: number;
  stats: {
    totalPages: number;
    journalPages: number;
    taggedPages: number;
  };
}

/**
 * Placement suggestion
 */
export interface PlacementSuggestion {
  suggestedPage: string;
  confidence: number; // 0-1
  reasoning: string;
  alternatives: Array<{
    page: string;
    confidence: number;
    reason: string;
  }>;
}

/**
 * Content plan structure
 */
export interface ContentPlan {
  title: string;
  suggestedStructure: Array<{
    type: 'section' | 'subsection' | 'bullet' | 'reference';
    content: string;
    level: number;
    metadata?: Record<string, unknown>;
  }>;
  placementSuggestion: PlacementSuggestion;
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
}

// Type exports
export type BuildGraphMapParams = z.infer<typeof BuildGraphMapParamsSchema>;
export type SuggestPlacementParams = z.infer<typeof SuggestPlacementParamsSchema>;
export type PlanContentParams = z.infer<typeof PlanContentParamsSchema>;
export type BatchOp = z.infer<typeof BatchOpSchema>;
export type BatchParams = z.infer<typeof BatchParamsSchema>;