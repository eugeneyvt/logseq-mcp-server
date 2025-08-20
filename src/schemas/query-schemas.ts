import { z } from 'zod';
import { PageNameSchema, SearchQuerySchema, DataScriptQuerySchema } from './validation-schemas.js';

/**
 * Search and query-related schemas and types
 */

export const SearchParamsSchema = z.object({
  query: SearchQuerySchema,
  limit: z.number().int().min(1).max(100).default(20),
  scope: z.enum(['all', 'pages', 'current-page']).default('all'),
});

export const SearchParamsSchemaV2 = z.object({
  q: SearchQuerySchema,
  scope: z.enum(['blocks', 'pages', 'all']).default('all'),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export const DataScriptQueryParamsSchema = z.object({
  query: DataScriptQuerySchema,
});

export const BacklinksParamsSchema = z.object({
  page: PageNameSchema,
  includeChildren: z.boolean().default(false),
});

export const UpsertPageOutlineParamsSchema = z.object({
  name: PageNameSchema,
  outline: z.array(z.string()).min(1).max(1000),
  replace: z.boolean().default(false),
});

// Type exports
export type SearchParams = z.infer<typeof SearchParamsSchema>;
export type SearchParamsV2 = z.infer<typeof SearchParamsSchemaV2>;
export type DataScriptQueryParams = z.infer<typeof DataScriptQueryParamsSchema>;
export type BacklinksParams = z.infer<typeof BacklinksParamsSchema>;
export type UpsertPageOutlineParams = z.infer<typeof UpsertPageOutlineParamsSchema>;