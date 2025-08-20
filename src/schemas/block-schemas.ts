import { z } from 'zod';
import { PageNameSchema, ControlParamsSchema } from './validation-schemas.js';

/**
 * Block-related schemas and types
 */

export const CreateBlockParamsSchema = z.object({
  page: PageNameSchema,
  content: z.string().min(1).max(10000),
  properties: z.record(z.string(), z.unknown()).optional(),
  isPageBlock: z.boolean().default(false),
});

export const UpdateBlockParamsSchema = z.object({
  blockId: z.string().uuid(),
  content: z.string().min(1).max(10000),
});

export const UpdateBlockParamsSchemaV2 = z.object({
  uuid: z.string().uuid(),
  content: z.string().min(1).max(10000),
  control: ControlParamsSchema,
});

export const SetBlockPropertyParamsSchema = z.object({
  blockId: z.string().uuid(),
  property: z.string().min(1).max(100),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.record(z.string(), z.unknown()),
  ]),
});

export const RemoveBlockPropertyParamsSchema = z.object({
  blockId: z.string().uuid(),
  property: z.string().min(1).max(100),
});

/**
 * Block item for batch operations
 */
export const BlockItemSchema = z.object({
  content: z.string().min(1).max(10000),
  parentUuid: z.string().uuid().optional(),
  position: z.enum(['first', 'last', 'before', 'after']).optional(),
  refUuid: z.string().uuid().optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
});

export const AppendBlocksParamsSchema = z.object({
  page: PageNameSchema,
  items: z.array(BlockItemSchema).min(1).max(100),
  control: ControlParamsSchema,
});

export const MoveBlockParamsSchema = z.object({
  uuid: z.string().uuid(),
  newParentUuid: z.string().uuid(),
  position: z.enum(['first', 'last', 'before', 'after']).default('last'),
  refUuid: z.string().uuid().optional(),
  control: ControlParamsSchema,
});

// Type exports
export type CreateBlockParams = z.infer<typeof CreateBlockParamsSchema>;
export type UpdateBlockParams = z.infer<typeof UpdateBlockParamsSchema>;
export type UpdateBlockParamsV2 = z.infer<typeof UpdateBlockParamsSchemaV2>;
export type SetBlockPropertyParams = z.infer<typeof SetBlockPropertyParamsSchema>;
export type RemoveBlockPropertyParams = z.infer<typeof RemoveBlockPropertyParamsSchema>;
export type BlockItem = z.infer<typeof BlockItemSchema>;
export type AppendBlocksParams = z.infer<typeof AppendBlocksParamsSchema>;
export type MoveBlockParams = z.infer<typeof MoveBlockParamsSchema>;