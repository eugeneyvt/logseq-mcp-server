import { z } from 'zod';

// Configuration schema
export const ConfigSchema = z.object({
  apiUrl: z.string().url().default('http://127.0.0.1:12315'),
  apiToken: z.string().min(1, 'API token is required'),
});

export type Config = z.infer<typeof ConfigSchema>;

// Logseq API types
export interface LogseqPage {
  id: number;
  name: string;
  originalName: string;
  journal?: boolean;
  createdAt?: number;
  updatedAt?: number;
  properties?: Record<string, any>;
}

export interface LogseqBlock {
  id: string;
  content: string;
  properties?: Record<string, any>;
  children?: LogseqBlock[];
  page?: { id: number; name: string };
  parent?: { id: string };
  left?: { id: string };
  format?: string;
  refs?: Array<{ id: number; name: string }>;
}

export interface LogseqApiResponse<T = any> {
  status?: string;
  data?: T;
  error?: string;
}

// Tool parameter schemas
export const PageNameSchema = z.string().min(1, 'Page name cannot be empty');
export const BlockIdSchema = z.string().uuid('Block ID must be a valid UUID');
export const SearchQuerySchema = z.string().min(1, 'Search query cannot be empty');
export const DataScriptQuerySchema = z.string().min(1, 'DataScript query cannot be empty');

export const CreatePageParamsSchema = z.object({
  name: PageNameSchema,
  content: z.string().optional(),
  properties: z.record(z.any()).optional(),
});

export const CreateBlockParamsSchema = z.object({
  parent: z.string().min(1, 'Parent (page name or block ID) is required'),
  content: z.string().min(1, 'Block content cannot be empty'),
  properties: z.record(z.any()).optional(),
  sibling: z.boolean().optional(),
});

export const UpdateBlockParamsSchema = z.object({
  blockId: BlockIdSchema,
  content: z.string().min(1, 'Block content cannot be empty'),
});

export const SetBlockPropertyParamsSchema = z.object({
  blockId: BlockIdSchema,
  key: z.string().min(1, 'Property key cannot be empty'),
  value: z.any(),
});

export const RemoveBlockPropertyParamsSchema = z.object({
  blockId: BlockIdSchema,
  key: z.string().min(1, 'Property key cannot be empty'),
});

export type CreatePageParams = z.infer<typeof CreatePageParamsSchema>;
export type CreateBlockParams = z.infer<typeof CreateBlockParamsSchema>;
export type UpdateBlockParams = z.infer<typeof UpdateBlockParamsSchema>;
export type SetBlockPropertyParams = z.infer<typeof SetBlockPropertyParamsSchema>;
export type RemoveBlockPropertyParams = z.infer<typeof RemoveBlockPropertyParamsSchema>;
