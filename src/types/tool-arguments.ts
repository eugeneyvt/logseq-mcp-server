/**
 * Type-safe definitions for MCP tool arguments
 * Replaces usage of 'any' with proper TypeScript types
 */

import { z } from 'zod';

// Property value types for Logseq
export type LogseqPropertyValue = string | number | boolean | string[] | Record<string, unknown>;

// Base tool argument schema
export const BaseToolArgsSchema = z.record(z.unknown());
export type BaseToolArgs = z.infer<typeof BaseToolArgsSchema>;

// Search tool arguments
export const SearchToolArgsSchema = z.object({
  query: z.string(),
  limit: z.number().optional(),
});
export type SearchToolArgs = z.infer<typeof SearchToolArgsSchema>;

// DataScript query tool arguments
export const DataScriptToolArgsSchema = z.object({
  query: z.string(),
});
export type DataScriptToolArgs = z.infer<typeof DataScriptToolArgsSchema>;

// Reference/backlinks tool arguments
export const BacklinksToolArgsSchema = z.object({
  pageName: z.string(),
});
export type BacklinksToolArgs = z.infer<typeof BacklinksToolArgsSchema>;

// Block retrieval tool arguments
export const GetBlockToolArgsSchema = z.object({
  blockId: z.string(),
});
export type GetBlockToolArgs = z.infer<typeof GetBlockToolArgsSchema>;

// Block creation tool arguments
export const CreateBlockToolArgsSchema = z.object({
  page: z.string(),
  content: z.string(),
  properties: z.record(z.string(), z.unknown()).optional(),
  isPageBlock: z.boolean().optional(),
});
export type CreateBlockToolArgs = z.infer<typeof CreateBlockToolArgsSchema>;

// Block update tool arguments
export const UpdateBlockToolArgsSchema = z.object({
  blockId: z.string(),
  content: z.string(),
});
export type UpdateBlockToolArgs = z.infer<typeof UpdateBlockToolArgsSchema>;

// Block property tool arguments
export const SetBlockPropertyToolArgsSchema = z.object({
  blockId: z.string(),
  property: z.string(),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.record(z.string(), z.unknown()),
  ]),
});
export type SetBlockPropertyToolArgs = z.infer<typeof SetBlockPropertyToolArgsSchema>;

export const RemoveBlockPropertyToolArgsSchema = z.object({
  blockId: z.string(),
  property: z.string(),
});
export type RemoveBlockPropertyToolArgs = z.infer<typeof RemoveBlockPropertyToolArgsSchema>;

// Context tool arguments (no parameters needed)
export const EmptyToolArgsSchema = z.object({});
export type EmptyToolArgs = z.infer<typeof EmptyToolArgsSchema>;

// Page tool arguments
export const GetPageToolArgsSchema = z.object({
  name: z.string(),
});
export type GetPageToolArgs = z.infer<typeof GetPageToolArgsSchema>;

export const CreatePageToolArgsSchema = z.object({
  name: z.string(),
  content: z.string().optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
});
export type CreatePageToolArgs = z.infer<typeof CreatePageToolArgsSchema>;

export const DeletePageToolArgsSchema = z.object({
  name: z.string(),
});
export type DeletePageToolArgs = z.infer<typeof DeletePageToolArgsSchema>;

// Union type for all possible tool arguments
export type ToolArgs = 
  | SearchToolArgs
  | DataScriptToolArgs
  | BacklinksToolArgs
  | GetBlockToolArgs
  | CreateBlockToolArgs
  | UpdateBlockToolArgs
  | SetBlockPropertyToolArgs
  | RemoveBlockPropertyToolArgs
  | GetPageToolArgs
  | CreatePageToolArgs
  | DeletePageToolArgs
  | EmptyToolArgs
  | BaseToolArgs;