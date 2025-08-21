import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { LogseqClient } from '../logseq-client.js';
import { ErrorCode } from '../schemas/logseq.js';
import { logger } from '../utils/logger.js';
import { createResponse, createErrorResponse, type ToolResult } from './common.js';
import { ApplyTemplateParamsSchema } from './templates/template-types.js';
import {
  listAllTemplates,
  findTemplateByName,
  applyTemplateToPage,
} from './templates/template-operations.js';
import { createNewTemplate } from './templates/template-creation.js';

/**
 * Create template-related tools and handlers
 */
export function createTemplateHandlers(client: LogseqClient): {
  tools: Tool[];
  handlers: Record<string, (args: unknown) => Promise<ToolResult>>;
} {
  const tools: Tool[] = [
    {
      name: 'apply_template',
      description:
        'Comprehensive template management: create new templates, apply existing templates, list all templates. Supports variable substitution with {{variable}} or {variable} placeholders. Can create templates from content or apply them to pages.',
      inputSchema: {
        type: 'object',
        properties: {
          templateName: {
            type: 'string',
            description:
              'Name of the template to apply/create, or "*" to list all available templates',
          },
          targetPage: {
            type: 'string',
            description:
              'Target page name where template should be applied (not required when listing templates or creating templates)',
          },
          templateContent: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Template content as array of strings (for creating new templates). Each string becomes a block.',
          },
          variables: {
            type: 'object',
            description:
              'Variables to substitute in template placeholders (e.g., {"projectName": "My Project", "date": "2024-01-01"})',
            additionalProperties: true,
          },
          operation: {
            type: 'string',
            enum: ['apply', 'create', 'list'],
            default: 'apply',
            description:
              'Operation: apply existing template, create new template, or list templates',
          },
          mode: {
            type: 'string',
            enum: ['replace', 'append', 'prepend'],
            default: 'replace',
            description:
              'How to apply template: replace page content, append to page, or prepend to page',
          },
          control: {
            type: 'object',
            properties: {
              dryRun: { type: 'boolean', default: false },
              strict: { type: 'boolean', default: true },
              idempotencyKey: { type: 'string' },
              maxOps: { type: 'number', default: 100 },
              autofixFormat: { type: 'boolean', default: true },
            },
          },
        },
        required: ['templateName'],
      },
    },
  ];

  const handlers = {
    apply_template: async (args: unknown): Promise<ToolResult> => {
      try {
        const params = ApplyTemplateParamsSchema.parse(args);

        // Handle different operations
        switch (params.operation) {
          case 'list':
            logger.info('Listing all available templates');
            return await listAllTemplates(client);

          case 'create':
            logger.info({ templateName: params.templateName }, 'Creating new template');
            return await createNewTemplate(client, params);

          case 'apply':
          default:
            // Handle legacy listing syntax
            if (params.templateName === '*' || params.templateName.toLowerCase() === 'list') {
              logger.info('Listing all available templates');
              return await listAllTemplates(client);
            }

            // Validate target page is provided for template application
            if (!params.targetPage) {
              const response = createErrorResponse(
                ErrorCode.VALIDATION_ERROR,
                'Target page is required for template application',
                'Provide targetPage parameter or use operation="list" to list templates'
              );
              return {
                content: [
                  {
                    type: 'text' as const,
                    text: JSON.stringify(response, null, 2),
                  },
                ],
              };
            }
            break;
        }

        logger.info(
          { templateName: params.templateName, targetPage: params.targetPage },
          'Applying template'
        );

        // Handle dry run
        if (params.control.dryRun) {
          const templateInfo = await findTemplateByName(client, params.templateName);
          if (!templateInfo) {
            const response = createErrorResponse(
              ErrorCode.NOT_FOUND,
              `Template "${params.templateName}" not found`,
              'Use apply_template with templateName="*" to list available templates'
            );
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(response, null, 2),
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  createResponse({
                    success: true,
                    dryRun: true,
                    templateName: params.templateName,
                    targetPage: params.targetPage,
                    variables: params.variables,
                    mode: params.mode,
                    templateInfo,
                    message: 'Dry run - no changes were made',
                  }),
                  null,
                  2
                ),
              },
            ],
          };
        }

        // Find and apply the template
        const result = await applyTemplateToPage(client, params);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error({ error }, 'Apply template failed');
        const response = createErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          `Invalid parameters: ${error}`
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      }
    },
  };

  return { tools, handlers };
}
