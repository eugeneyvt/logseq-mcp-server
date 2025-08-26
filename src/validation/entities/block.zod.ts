/**
 * Block Entity Validation Schemas
 * Zod schemas for block-specific operations and data
 */

import { z } from 'zod';
import { PropertiesSchema, TimestampSchema, UUIDSchema } from './common.zod.js';

export const BlockSchema = z.object({
  id: z.number().optional(),
  uuid: UUIDSchema,
  content: z.string(),
  page: z.object({
    id: z.number().optional(),
    name: z.string().optional(),
    'original-name': z.string().optional()
  }).optional(),
  properties: PropertiesSchema,
  'created-at': TimestampSchema,
  'updated-at': TimestampSchema,
  parent: z.object({
    id: z.number().optional()
  }).optional(),
  left: z.object({
    id: z.number().optional()
  }).optional(),
  format: z.string().optional(),
  refs: z.array(z.unknown()).optional(),
  pathRefs: z.array(z.unknown()).optional()
});

export type Block = z.infer<typeof BlockSchema>;

export const BlockArraySchema = z.array(BlockSchema);
export type BlockArray = z.infer<typeof BlockArraySchema>;