import { z } from 'zod';
import { PageNameSchema, ControlParamsSchema } from './validation-schemas.js';

/**
 * Page-related schemas and types
 */

export const CreatePageParamsSchema = z.object({
  name: PageNameSchema,
  content: z.string().optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
});

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

// Type exports
export type CreatePageParams = z.infer<typeof CreatePageParamsSchema>;
export type EnsurePageParams = z.infer<typeof EnsurePageParamsSchema>;
export type SetPageContentParams = z.infer<typeof SetPageContentParamsSchema>;
export type SetPagePropertiesParams = z.infer<typeof SetPagePropertiesParamsSchema>;