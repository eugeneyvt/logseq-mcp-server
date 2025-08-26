import { z } from 'zod';

/**
 * Unified Type System for 4-Tool Architecture
 * Defines all content types, operations, and parameter schemas
 */

// Content types supported across all tools
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

// Operations supported by Edit tool
export const OperationSchema = z.enum([
  'create',
  'update', 
  'append',
  'prepend',
  'move',
  'remove'
]);

export type Operation = z.infer<typeof OperationSchema>;

// Search targets
export const SearchTargetSchema = z.enum([
  'blocks',
  'pages',
  'tasks', 
  'templates',
  'both'
]);

export type SearchTarget = z.infer<typeof SearchTargetSchema>;

// Task states
export const TaskStateSchema = z.enum([
  'TODO',
  'DOING', 
  'DONE',
  'WAITING',
  'LATER',
  'NOW',
  'CANCELED'
]);

export type TaskState = z.infer<typeof TaskStateSchema>;

// Sort options
export const SortFieldSchema = z.enum([
  'relevance',
  'created',
  'updated', 
  'title',
  'page_title',
  'deadline',
  'scheduled',
  'length'
]);

export type SortField = z.infer<typeof SortFieldSchema>;

// Order options
export const SortOrderSchema = z.enum(['asc', 'desc']);
export type SortOrder = z.infer<typeof SortOrderSchema>;

// Format options
export const FormatSchema = z.enum(['tree', 'flat']);
export type Format = z.infer<typeof FormatSchema>;

// Common control parameters
export const ControlSchema = z.object({
  dryRun: z.boolean().optional().default(false),
  strict: z.boolean().optional().default(true),
  idempotencyKey: z.string().optional(),
  maxOps: z.number().optional().default(100),
  autofixFormat: z.boolean().optional().default(true)
}).optional().default({});

export type Control = z.infer<typeof ControlSchema>;

// Position for move operations
export const PositionSchema = z.object({
  after_block_id: z.string().optional(),
  before_block_id: z.string().optional(), 
  parent_block_id: z.string().optional(),
  index: z.number().optional()
}).optional();

export type Position = z.infer<typeof PositionSchema>;

// Scope for search operations
export const ScopeSchema = z.object({
  namespace: z.string().optional(),
  page_titles: z.array(z.string()).optional(),
  parent_block_id: z.string().optional(),
  journal: z.boolean().optional(),
  tag: z.string().optional(),
  template: z.boolean().optional()
}).optional();

export type Scope = z.infer<typeof ScopeSchema>;

// Advanced filter options
export const FilterSchema = z.object({
  // Date filters (ISO 8601)
  createdAfter: z.string().optional(),
  createdBefore: z.string().optional(),
  updatedAfter: z.string().optional(), 
  updatedBefore: z.string().optional(),
  scheduledOn: z.string().optional(), // date only
  deadlinedOn: z.string().optional(), // date only
  
  // Tag filters
  tags_any: z.array(z.string()).optional(),
  tags_all: z.array(z.string()).optional(),
  
  // Property filters
  properties_all: z.record(z.string(), z.unknown()).optional(),
  properties_any: z.record(z.string(), z.unknown()).optional(),
  
  // Content filters
  contains: z.string().optional(),
  exclude: z.string().optional(),
  lengthMin: z.number().min(0).optional(),
  lengthMax: z.number().min(1).optional(),
  
  // Task-specific filters
  todoState: TaskStateSchema.optional(),
  
  // Relationship filters
  backlinks_of_page_title: z.string().optional(),
  linked_to_page_title: z.string().optional(),
  hasRefs: z.boolean().optional()
}).optional();

export type Filter = z.infer<typeof FilterSchema>;

// Include options for Get tool
export const IncludeSchema = z.object({
  children: z.boolean().optional(),
  properties: z.boolean().optional(),
  backlinks: z.boolean().optional(),
  content: z.boolean().optional()
}).optional();

export type Include = z.infer<typeof IncludeSchema>;

// Structured error response
export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    hint: z.string().optional(),
    details: z.record(z.string(), z.unknown()).optional()
  })
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// Success response wrapper
export const SuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.unknown().optional(),
  meta: z.record(z.string(), z.unknown()).optional()
});

export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;

/**
 * Type+Operation compatibility matrix
 */
export const VALID_COMBINATIONS: Record<ContentType, Operation[]> = {
  page: ['create', 'update', 'append', 'prepend'],
  block: ['create', 'update', 'move', 'append', 'prepend'],
  template: ['create', 'update', 'append'],
  properties: ['create', 'update', 'remove'],
  relations: ['create', 'remove', 'update'],
  tasks: ['create', 'update', 'move'],
  system: [], // read-only via Get tool
  graph: [] // read-only via Get tool
};

/**
 * Validate type+operation combination
 */
export function isValidTypeOperation(type: ContentType, operation: Operation): boolean {
  return VALID_COMBINATIONS[type]?.includes(operation) ?? false;
}