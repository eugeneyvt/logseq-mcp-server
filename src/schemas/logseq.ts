import { z } from 'zod';

/**
 * Logseq page interface
 */
export interface LogseqPage {
  readonly id: number;
  readonly name: string;
  readonly originalName: string;
  readonly journal?: boolean;
  readonly createdAt?: number;
  readonly updatedAt?: number;
  readonly properties?: Record<string, unknown>;
}

/**
 * Logseq block interface
 */
export interface LogseqBlock {
  readonly id: string;
  readonly content: string;
  readonly properties?: Record<string, unknown>;
  readonly children?: LogseqBlock[];
  readonly page?: { readonly id: number; readonly name: string };
  readonly parent?: { readonly id: string };
  readonly left?: { readonly id: string };
  readonly format?: string;
  readonly refs?: Array<{ readonly id: number; readonly name: string }>;
}

/**
 * Logseq API response wrapper
 */
export interface LogseqApiResponse<T = unknown> {
  readonly status?: string;
  readonly data?: T;
  readonly error?: string;
}

// Input validation schemas
export const PageNameSchema = z
  .string()
  .min(1, 'Page name cannot be empty')
  .max(1000, 'Page name too long')
  .refine((name) => !name.includes('/'), 'Page name cannot contain forward slashes');

export const BlockIdSchema = z
  .string()
  .uuid('Block ID must be a valid UUID')
  .or(z.string().regex(/^[0-9a-f-]+$/i, 'Block ID must be a valid UUID format'));

export const SearchQuerySchema = z
  .string()
  .min(1, 'Search query cannot be empty')
  .max(500, 'Search query too long');

export const DataScriptQuerySchema = z
  .string()
  .min(1, 'DataScript query cannot be empty')
  .max(5000, 'DataScript query too long');

export const CreatePageParamsSchema = z.object({
  name: PageNameSchema,
  content: z.string().max(100000, 'Page content too long').optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
});

export const CreateBlockParamsSchema = z.object({
  parent: z.string().min(1, 'Parent (page name or block ID) is required'),
  content: z.string().min(1, 'Block content cannot be empty').max(10000, 'Block content too long'),
  properties: z.record(z.string(), z.unknown()).optional(),
  sibling: z.boolean().optional(),
});

export const UpdateBlockParamsSchema = z.object({
  blockId: BlockIdSchema,
  content: z.string().min(1, 'Block content cannot be empty').max(10000, 'Block content too long'),
});

export const SetBlockPropertyParamsSchema = z.object({
  blockId: BlockIdSchema,
  key: z
    .string()
    .min(1, 'Property key cannot be empty')
    .max(100, 'Property key too long')
    .regex(
      /^[a-zA-Z][a-zA-Z0-9_-]*$/,
      'Property key must be alphanumeric with underscores/hyphens'
    ),
  value: z.unknown(),
});

export const RemoveBlockPropertyParamsSchema = z.object({
  blockId: BlockIdSchema,
  key: z
    .string()
    .min(1, 'Property key cannot be empty')
    .max(100, 'Property key too long')
    .regex(
      /^[a-zA-Z][a-zA-Z0-9_-]*$/,
      'Property key must be alphanumeric with underscores/hyphens'
    ),
});

export const SearchParamsSchema = z.object({
  query: SearchQuerySchema,
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(1000, 'Limit cannot exceed 1000')
    .default(50),
});

export const DataScriptQueryParamsSchema = z.object({
  query: DataScriptQuerySchema,
});

export const BacklinksParamsSchema = z.object({
  pageName: PageNameSchema,
});

// Type exports
export type CreatePageParams = z.infer<typeof CreatePageParamsSchema>;
export type CreateBlockParams = z.infer<typeof CreateBlockParamsSchema>;
export type UpdateBlockParams = z.infer<typeof UpdateBlockParamsSchema>;
export type SetBlockPropertyParams = z.infer<typeof SetBlockPropertyParamsSchema>;
export type RemoveBlockPropertyParams = z.infer<typeof RemoveBlockPropertyParamsSchema>;
export type SearchParams = z.infer<typeof SearchParamsSchema>;
export type DataScriptQueryParams = z.infer<typeof DataScriptQueryParamsSchema>;
export type BacklinksParams = z.infer<typeof BacklinksParamsSchema>;

// ============================================
// Core Methods Schemas
// ============================================

/**
 * Control parameters for operations
 */
export const ControlParamsSchema = z
  .object({
    dryRun: z.boolean().default(false),
    strict: z.boolean().default(true),
    idempotencyKey: z.string().optional(),
    maxOps: z.number().int().min(1).max(1000).default(100),
    autofixFormat: z.boolean().default(true),
  })
  .optional();

/**
 * Block item for batch operations
 */
export const BlockItemSchema = z.object({
  content: z.string().min(1).max(10000),
  parentUuid: z.string().uuid().optional(),
  position: z.number().int().min(0).optional(),
  refUuid: z.string().uuid().optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Core method schemas
 */
export const EnsurePageParamsSchema = z.object({
  name: PageNameSchema,
  ifAbsent: z.enum(['create', 'error', 'skip']).default('create'),
  control: ControlParamsSchema,
});

export const SetPageContentParamsSchema = z.object({
  name: PageNameSchema,
  content: z.string().max(1000000),
  control: ControlParamsSchema,
});

export const SetPagePropertiesParamsSchema = z.object({
  name: PageNameSchema,
  upsert: z.record(z.string(), z.unknown()),
  remove: z.array(z.string()).optional(),
  control: ControlParamsSchema,
});

export const AppendBlocksParamsSchema = z.object({
  page: PageNameSchema,
  items: z.array(BlockItemSchema).min(1).max(100),
  control: ControlParamsSchema,
});

export const UpdateBlockParamsSchemaV2 = z.object({
  uuid: z.string().uuid(),
  content: z.string().min(1).max(10000),
  control: ControlParamsSchema,
});

export const MoveBlockParamsSchema = z.object({
  uuid: z.string().uuid(),
  newParentUuid: z.string().uuid(),
  position: z.number().int().min(0).optional(),
  refUuid: z.string().uuid().optional(),
  control: ControlParamsSchema,
});

export const SearchParamsSchemaV2 = z.object({
  q: z.string().min(1).max(500),
  scope: z.enum(['all', 'pages', 'blocks', 'current-page']).default('all'),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(1000).default(50),
});

export const UpsertPageOutlineParamsSchema = z.object({
  name: PageNameSchema,
  outline: z.array(z.string()).min(1).max(1000),
  replace: z.boolean().default(false),
  control: ControlParamsSchema,
});

/**
 * Batch operation schema
 */
export const BatchOpSchema = z.object({
  type: z.enum([
    'ensure_page',
    'set_page_content',
    'set_page_properties',
    'append_blocks',
    'update_block',
    'move_block',
  ]),
  params: z.unknown(),
  id: z.string().optional(), // For referencing in other ops
});

export const BatchParamsSchema = z.object({
  ops: z.array(BatchOpSchema).min(1).max(100),
  atomic: z.boolean().default(true),
  control: ControlParamsSchema,
});

/**
 * Context-aware extension schemas
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

/**
 * Standard error codes for ROADMAP
 */
export enum ErrorCode {
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFLICT = 'CONFLICT',
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
  BAD_QUERY = 'BAD_QUERY',
  INTERNAL = 'INTERNAL',
}

/**
 * Standard response format
 */
export interface StandardResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: {
    code: ErrorCode;
    message: string;
    hint?: string;
  };
}

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
 * Content plan
 */
export interface ContentPlan {
  operations: Array<{
    type: string;
    target: string;
    content: string;
    position?: number;
  }>;
  alternatives: Array<{
    description: string;
    operations: Array<{
      type: string;
      target: string;
      content: string;
    }>;
  }>;
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
}

// Type exports for new schemas
export type ControlParams = z.infer<typeof ControlParamsSchema>;
export type BlockItem = z.infer<typeof BlockItemSchema>;
export type EnsurePageParams = z.infer<typeof EnsurePageParamsSchema>;
export type SetPageContentParams = z.infer<typeof SetPageContentParamsSchema>;
export type SetPagePropertiesParams = z.infer<typeof SetPagePropertiesParamsSchema>;
export type AppendBlocksParams = z.infer<typeof AppendBlocksParamsSchema>;
export type UpdateBlockParamsV2 = z.infer<typeof UpdateBlockParamsSchemaV2>;
export type MoveBlockParams = z.infer<typeof MoveBlockParamsSchema>;
export type SearchParamsV2 = z.infer<typeof SearchParamsSchemaV2>;
export type UpsertPageOutlineParams = z.infer<typeof UpsertPageOutlineParamsSchema>;
export type BatchOp = z.infer<typeof BatchOpSchema>;
export type BatchParams = z.infer<typeof BatchParamsSchema>;
export type BuildGraphMapParams = z.infer<typeof BuildGraphMapParamsSchema>;
export type SuggestPlacementParams = z.infer<typeof SuggestPlacementParamsSchema>;
export type PlanContentParams = z.infer<typeof PlanContentParamsSchema>;
