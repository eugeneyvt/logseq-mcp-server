import { z } from 'zod';

/**
 * Basic validation schemas used across the application
 */

export const PageNameSchema = z
  .string()
  .min(1, 'Page name cannot be empty')
  .max(1000, 'Page name too long');

export const BlockIdSchema = z
  .string()
  .uuid('Block ID must be a valid UUID')
  .or(z.string().regex(/^[0-9a-f-]+$/i, 'Block ID must be a valid UUID format'));

export const SearchQuerySchema = z
  .string()
  .min(1, 'Search query cannot be empty')
  .max(1000, 'Search query too long');

export const DataScriptQuerySchema = z
  .string()
  .min(1, 'DataScript query cannot be empty')
  .max(10000, 'DataScript query too long');

/**
 * Control parameters for operations
 */
export const ControlParamsSchema = z
  .object({
    dryRun: z.boolean().default(false),
    strict: z.boolean().default(true),
    idempotencyKey: z.string().uuid().optional(),
    maxOps: z.number().int().min(1).max(1000).default(100),
    autofixFormat: z.boolean().default(true),
  })
  .optional();

// Type exports
export type ControlParams = z.infer<typeof ControlParamsSchema>;