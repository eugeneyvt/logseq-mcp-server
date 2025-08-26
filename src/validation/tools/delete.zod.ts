/**
 * Delete Tool Validation Schemas
 * Zod schemas for delete tool parameters and responses
 */

import { z } from 'zod';

export const DeleteParamsSchema = z.object({
  type: z.enum(['page', 'block', 'template', 'properties', 'relations', 'tasks']),
  target: z.union([z.string(), z.array(z.string())]),
  confirmDestroy: z.boolean({
    required_error: "confirmDestroy is required for deletion operations - set to true to confirm you want to delete this content"
  }),
  simulate: z.boolean().default(false),
  cascade: z.boolean().default(false),
  softDelete: z.boolean().default(false),
  control: z.object({
    maxOps: z.number().default(100),
    idempotencyKey: z.string().optional()
  }).optional()
}).refine(
  (data) => data.confirmDestroy === true,
  {
    message: "confirmDestroy must be set to true to confirm deletion",
    path: ["confirmDestroy"]
  }
);

export type DeleteParams = z.infer<typeof DeleteParamsSchema>;

export const DeleteResponseSchema = z.object({
  successful: z.boolean(),
  results: z.array(z.unknown()).optional(),
  errors: z.array(z.unknown()).optional(),
  impactAnalysis: z.object({
    affectedItems: z.number(),
    dependencies: z.array(z.string()).optional(),
    warnings: z.array(z.string()).optional()
  }).optional()
});

export type DeleteResponse = z.infer<typeof DeleteResponseSchema>;