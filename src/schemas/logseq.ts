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
