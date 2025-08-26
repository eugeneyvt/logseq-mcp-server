/**
 * Get Tool Validation Schemas
 * Zod schemas for get tool parameters and responses
 */

import { z } from 'zod';

export const GetParamsSchema = z.object({
  type: z.enum(['page', 'block', 'template', 'properties', 'relations', 'tasks', 'system', 'graph']),
  target: z.union([z.string(), z.array(z.string())]),
  include: z.object({
    content: z.boolean().optional(),
    properties: z.boolean().optional(),
    backlinks: z.boolean().optional(),
    children: z.boolean().optional()
  }).optional(),
  format: z.enum(['tree', 'flat']).default('tree'),
  depth: z.number().min(1).max(5).default(2),
  preview_length: z.number().min(10).max(10000).default(500)
});

export type GetParams = z.infer<typeof GetParamsSchema>;

export const GetResponseSchema = z.object({
  type: z.string(),
  data: z.unknown(),
  truncated: z.boolean().optional()
});

export type GetResponse = z.infer<typeof GetResponseSchema>;