/**
 * Edit Tool Validation Schemas
 * Zod schemas for edit tool parameters and responses
 */

import { z } from 'zod';

export const EditParamsSchema = z.object({
  type: z.enum(['page', 'block', 'template', 'properties', 'relations', 'tasks']),
  operation: z.enum(['create', 'update', 'append', 'prepend', 'move', 'remove']),
  target: z.union([z.string(), z.array(z.string())]),
  content: z.unknown().optional(),
  confirmDestroy: z.boolean().optional(),
  position: z.object({
    parent_block_id: z.string().optional(),
    after_block_id: z.string().optional(),
    before_block_id: z.string().optional(),
    index: z.number().min(0).optional()
  }).optional(),
  propertyKey: z.string().optional(),
  propertyValue: z.unknown().optional(),
  taskState: z.enum(['TODO', 'DOING', 'DONE', 'WAITING', 'LATER', 'NOW', 'CANCELED']).optional(),
  templateName: z.string().optional(),
  variables: z.record(z.unknown()).optional(),
  linkContext: z.string().optional(),
  dryRun: z.boolean().default(false),
  idempotencyKey: z.string().optional(),
  control: z.object({
    strict: z.boolean().default(true),
    autofixFormat: z.boolean().default(true),
    parseMarkdown: z.boolean().default(false),
    renderMode: z.enum(['readable', 'hierarchical', 'singleBlock']).default('readable'),
    maxOps: z.number().default(100)
  }).optional()
});

export type EditParams = z.infer<typeof EditParamsSchema>;

export const EditResponseSchema = z.object({
  successful: z.boolean(),
  results: z.array(z.unknown()).optional(),
  errors: z.array(z.unknown()).optional(),
  timing: z.object({
    duration: z.number(),
    operations: z.record(z.number())
  }).optional()
});

export type EditResponse = z.infer<typeof EditResponseSchema>;
