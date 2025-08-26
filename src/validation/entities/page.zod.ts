/**
 * Page Entity Validation Schemas
 * Zod schemas for page-specific operations and data
 */

import { z } from 'zod';
import { PropertiesSchema, TimestampSchema, UUIDSchema, NameSchema } from './common.zod.js';

export const PageSchema = z.object({
  id: z.number().optional(),
  uuid: UUIDSchema,
  name: NameSchema,
  originalName: z.string().optional(),
  'journal?': z.boolean().optional(),
  'created-at': TimestampSchema,
  'updated-at': TimestampSchema,
  properties: PropertiesSchema,
  file: z.object({
    path: z.string()
  }).optional()
});

export type Page = z.infer<typeof PageSchema>;

export const PageArraySchema = z.array(PageSchema);
export type PageArray = z.infer<typeof PageArraySchema>;