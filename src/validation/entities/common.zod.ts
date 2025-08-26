/**
 * Common Entity Validation Schemas
 * Shared Zod schemas for common entity types and properties
 */

import { z } from 'zod';

// Core content type enum
export const ContentTypeSchema = z.enum([
  'page',
  'block', 
  'template',
  'properties',
  'relations',
  'tasks',
  'system',
  'graph'
]);

export type ContentType = z.infer<typeof ContentTypeSchema>;

// Operation type enum
export const OperationSchema = z.enum([
  'create',
  'read', 
  'update',
  'delete',
  'search',
  'move',
  'append',
  'prepend',
  'remove'
]);

export type Operation = z.infer<typeof OperationSchema>;

// Common properties
export const TimestampSchema = z.number().optional();
export const UUIDSchema = z.string().uuid().optional();
export const NameSchema = z.string().min(1);

// Property values
export const PropertyValueSchema = z.union([
  z.string(),
  z.number(), 
  z.boolean(),
  z.array(z.string()),
  z.null()
]);

export const PropertiesSchema = z.record(PropertyValueSchema).optional();

// Pagination
export const PaginationSchema = z.object({
  total: z.number().optional(),
  hasNext: z.boolean(),
  nextCursor: z.string().optional(),
  prevCursor: z.string().optional()
});

export type Pagination = z.infer<typeof PaginationSchema>;

// Performance timing
export const TimingSchema = z.object({
  duration: z.number(),
  operations: z.record(z.number())
}).optional();

export type Timing = z.infer<typeof TimingSchema>;