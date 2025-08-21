import { z } from 'zod';

/**
 * Schema for apply_template parameters
 */
export const ApplyTemplateParamsSchema = z.object({
  templateName: z.string().min(1),
  targetPage: z.string().optional(),
  templateContent: z.array(z.string()).optional(),
  variables: z.record(z.string(), z.unknown()).optional().default({}),
  operation: z.enum(['apply', 'create', 'list']).optional().default('apply'),
  mode: z.enum(['replace', 'append', 'prepend']).optional().default('replace'),
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

export type ApplyTemplateParams = z.infer<typeof ApplyTemplateParamsSchema>;

/**
 * Template information structure
 */
export interface TemplateInfo {
  page: unknown;
  blocks: readonly unknown[];
  placeholders: string[];
}

/**
 * Template list item structure
 */
export interface TemplateListItem {
  name: string;
  id: string;
  properties: Record<string, unknown>;
  placeholders: string[];
  blockCount: number;
  templateType: string;
  error?: string;
}
