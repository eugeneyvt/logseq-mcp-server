/**
 * Search Tool Validation Schemas
 * Zod schemas for search tool parameters and responses
 */

import { z } from 'zod';

export const SearchParamsSchema = z.object({
  query: z.string().optional(),
  target: z.enum(['blocks', 'pages', 'tasks', 'templates', 'properties', 'both']).default('both'),
  filter: z.object({
    contains: z.string().optional(),
    exclude: z.string().optional(),
    tags_all: z.array(z.string()).optional(),
    tags_any: z.array(z.string()).optional(),
    properties_all: z.record(z.unknown()).optional(),
    properties_any: z.record(z.unknown()).optional(),
    createdAfter: z.string().datetime().optional(),
    createdBefore: z.string().datetime().optional(),
    updatedAfter: z.string().datetime().optional(),
    updatedBefore: z.string().datetime().optional(),
    todoState: z.enum(['TODO', 'DOING', 'DONE', 'WAITING', 'LATER', 'NOW', 'CANCELED']).optional(),
    scheduledOn: z.string().optional(),
    deadlinedOn: z.string().optional(),
    hasRefs: z.boolean().optional(),
    lengthMin: z.number().min(0).optional(),
    lengthMax: z.number().min(1).optional()
  }).optional(),
  scope: z.object({
    page_titles: z.array(z.string()).optional(),
    tag: z.string().optional(),
    namespace: z.string().optional(),
    journal: z.boolean().optional(),
    parent_block_id: z.string().optional()
  }).optional(),
  sort: z.enum(['relevance', 'created', 'updated', 'title', 'page_title', 'deadline', 'scheduled', 'length']).default('relevance'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional()
});

export type SearchParams = z.infer<typeof SearchParamsSchema>;

export const SearchResponseSchema = z.object({
  items: z.array(z.unknown()),
  pagination: z.object({
    total: z.number().optional(),
    hasNext: z.boolean(),
    nextCursor: z.string().optional(),
    prevCursor: z.string().optional()
  }),
  timing: z.object({
    duration: z.number(),
    operations: z.record(z.number())
  }).optional()
});

export type SearchResponse = z.infer<typeof SearchResponseSchema>;
