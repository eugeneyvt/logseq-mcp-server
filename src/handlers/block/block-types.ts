import { z } from 'zod';

/**
 * Schema for append_blocks parameters
 */
export const AppendBlocksParamsSchema = z.object({
  page: z.string().min(1),
  items: z
    .array(
      z.object({
        content: z.string().min(1),
        parentUuid: z.string().optional(),
        position: z.enum(['first', 'last', 'before', 'after']).optional(),
        refUuid: z.string().optional(),
      })
    )
    .min(1),
  control: z
    .object({
      dryRun: z.boolean().optional().default(false),
      strict: z.boolean().optional().default(true),
      idempotencyKey: z.string().optional(),
      maxOps: z.number().optional().default(100),
      autofixFormat: z.boolean().optional().default(true),
    })
    .optional()
    .default({}),
});

export type AppendBlocksParams = z.infer<typeof AppendBlocksParamsSchema>;

/**
 * Schema for update_block parameters
 */
export const UpdateBlockParamsSchemaV2 = z.object({
  uuid: z.string().min(1),
  content: z.string().min(1),
  control: z
    .object({
      dryRun: z.boolean().optional().default(false),
      strict: z.boolean().optional().default(true),
      idempotencyKey: z.string().optional(),
      maxOps: z.number().optional().default(100),
      autofixFormat: z.boolean().optional().default(true),
    })
    .optional()
    .default({}),
});

export type UpdateBlockParamsV2 = z.infer<typeof UpdateBlockParamsSchemaV2>;

/**
 * Schema for move_block parameters
 */
export const MoveBlockParamsSchema = z.object({
  uuid: z.string().min(1),
  newParentUuid: z.string().min(1),
  position: z.enum(['first', 'last', 'before', 'after']),
  refUuid: z.string().optional(),
  control: z
    .object({
      dryRun: z.boolean().optional().default(false),
      strict: z.boolean().optional().default(true),
      idempotencyKey: z.string().optional(),
      maxOps: z.number().optional().default(100),
      autofixFormat: z.boolean().optional().default(true),
    })
    .optional()
    .default({}),
});

export type MoveBlockParams = z.infer<typeof MoveBlockParamsSchema>;

/**
 * Block validation result
 */
export interface BlockValidationResult {
  isValid: boolean;
  normalized?: string;
  errors: string[];
}

/**
 * Block creation result
 */
export interface BlockCreationResult {
  success: boolean;
  block?: unknown;
  type?: string;
  level?: number;
  error?: string;
  content?: string;
}

/**
 * Block operation summary
 */
export interface BlockOperationSummary {
  originalItems: number;
  parsedBlocks: number;
  createdBlocks: number;
  successfulBlocks: number;
}
