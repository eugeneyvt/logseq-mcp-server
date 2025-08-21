import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { LogseqClient } from '../logseq-client.js';
import type { LogseqBlock } from '../schemas/base-types.js';
import { ErrorCode } from '../schemas/logseq.js';
import { logger } from '../utils/logger.js';
import { createResponse, createErrorResponse, type ToolResult } from './common.js';
import { z } from 'zod';

// Schema for apply_template parameters
const ApplyTemplateParamsSchema = z.object({
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

type ApplyTemplateParams = z.infer<typeof ApplyTemplateParamsSchema>;

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

/**
 * List all available templates in the graph
 */
async function listAllTemplates(client: LogseqClient): Promise<ToolResult> {
  try {
    const allPages = await client.getAllPages();
    const templates = allPages.filter(
      (page) =>
        page.name.toLowerCase().includes('template') ||
        (page.properties && page.properties.template) ||
        (page.properties && page.properties['page-type'] === 'template') ||
        (page.properties && page.properties.type === 'template')
    );

    const templateInfo = [];

    for (const template of templates.slice(0, 20)) {
      // Limit to 20 for performance
      try {
        const blocks = await client.getPageBlocksTree(template.name);
        const placeholders = extractTemplatePlaceholders(blocks || []);

        templateInfo.push({
          name: template.name,
          id: template.id,
          properties: template.properties || {},
          placeholders: placeholders,
          blockCount: blocks ? blocks.length : 0,
          templateType:
            template.properties?.['template-type'] || template.properties?.type || 'page',
        });
      } catch (error) {
        // Skip templates with access errors
        templateInfo.push({
          name: template.name,
          id: template.id,
          properties: template.properties || {},
          placeholders: [],
          blockCount: 0,
          templateType: 'page',
          error: 'Could not read template content',
        });
      }
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            createResponse({
              success: true,
              templates: templateInfo,
              totalFound: templates.length,
              returned: templateInfo.length,
            }),
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    const response = createErrorResponse(ErrorCode.INTERNAL, `Failed to list templates: ${error}`);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }
}

/**
 * Find a template by name
 */
async function findTemplateByName(
  client: LogseqClient,
  templateName: string
): Promise<{
  page: unknown;
  blocks: readonly LogseqBlock[];
  placeholders: string[];
} | null> {
  try {
    const allPages = await client.getAllPages();
    const template = allPages.find(
      (p) =>
        p.name.toLowerCase() === templateName.toLowerCase() ||
        (p.name.toLowerCase().includes(templateName.toLowerCase()) &&
          (p.name.toLowerCase().includes('template') ||
            (p.properties &&
              (p.properties.template ||
                p.properties['page-type'] === 'template' ||
                p.properties.type === 'template'))))
    );

    if (!template) {
      return null;
    }

    const blocks = await client.getPageBlocksTree(template.name);
    const placeholders = extractTemplatePlaceholders(blocks || []);

    return {
      page: template,
      blocks: blocks || [],
      placeholders,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to find template');
    return null;
  }
}

/**
 * Apply template to a target page
 */
async function applyTemplateToPage(
  client: LogseqClient,
  params: ApplyTemplateParams
): Promise<unknown> {
  const templateInfo = await findTemplateByName(client, params.templateName);

  if (!templateInfo) {
    return createErrorResponse(
      ErrorCode.NOT_FOUND,
      `Template "${params.templateName}" not found`,
      'Use apply_template with templateName="*" to list available templates'
    );
  }

  // Ensure target page exists
  try {
    await client.callApi('logseq.Editor.createPage', [params.targetPage]);
  } catch (error) {
    // Page might already exist, continue
  }

  // Process template content with variable substitution
  const processedContent = substituteTemplateVariables(templateInfo.blocks, params.variables || {});

  // Apply content to target page based on mode
  try {
    // Combine all processed content into a single block
    const combinedContent = processedContent.join('\n');

    switch (params.mode) {
      case 'replace': {
        // Replace entire page content with single block
        await client.callApi('logseq.Editor.insertBlock', [
          params.targetPage,
          combinedContent,
          { sibling: false },
        ]);
        break;
      }
      case 'append': {
        // Append as single block
        await client.callApi('logseq.Editor.insertBlock', [
          params.targetPage,
          combinedContent,
          { sibling: false },
        ]);
        break;
      }
      case 'prepend': {
        // Prepend as single block
        await client.callApi('logseq.Editor.insertBlock', [
          params.targetPage,
          combinedContent,
          { sibling: false, before: true },
        ]);
        break;
      }
    }

    return createResponse({
      success: true,
      templateName: params.templateName,
      targetPage: params.targetPage,
      mode: params.mode,
      variablesUsed: params.variables,
      blocksCreated: 1, // Now creates single block
      placeholdersFound: templateInfo.placeholders,
      processedContent: processedContent.slice(0, 3), // Show first 3 blocks for preview
    });
  } catch (error) {
    return createErrorResponse(
      ErrorCode.INTERNAL,
      `Failed to apply template: ${error}`,
      'Check target page permissions and template content'
    );
  }
}

/**
 * Extract template placeholders from blocks (e.g., {{variable}}, <%variable%>)
 */
function extractTemplatePlaceholders(blocks: readonly LogseqBlock[]): string[] {
  const placeholders = new Set<string>();

  const extractFromContent = (content: string) => {
    // Match all template syntax: {{variable}}, <%variable%>, or {variable}
    const matches = content.match(/(\{\{[^}]+\}\}|<%[^%]+%>|\{[^{}]+\})/g);
    if (matches) {
      matches.forEach((match) => placeholders.add(match));
    }
  };

  const processBlock = (block: LogseqBlock) => {
    if (block.content) {
      extractFromContent(block.content);
    }
    if (block.children) {
      block.children.forEach(processBlock);
    }
  };

  blocks.forEach(processBlock);
  return Array.from(placeholders);
}

/**
 * Substitute template variables in block content
 */
function substituteTemplateVariables(
  blocks: readonly LogseqBlock[],
  variables: Record<string, unknown>
): string[] {
  const processedContent: string[] = [];

  const processBlock = (block: LogseqBlock) => {
    if (block.content) {
      let content = block.content;

      // Replace template variables - support both {variable} and {{variable}} formats
      Object.entries(variables).forEach(([key, value]) => {
        const patterns = [
          new RegExp(`\\{\\{${key}\\}\\}`, 'g'), // {{variable}} - standard Logseq
          new RegExp(`<%${key}%>`, 'g'), // <%variable%> - alternative
          new RegExp(`\\{${key}\\}`, 'g'), // {variable} - simple format
        ];

        patterns.forEach((pattern) => {
          content = content.replace(pattern, String(value));
        });
      });

      processedContent.push(content);
    }

    // Process children recursively
    if (block.children) {
      block.children.forEach(processBlock);
    }
  };

  blocks.forEach(processBlock);
  return processedContent;
}

/**
 * Create a new template
 */
async function createNewTemplate(
  client: LogseqClient,
  params: ApplyTemplateParams
): Promise<ToolResult> {
  if (!params.templateContent || params.templateContent.length === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            createErrorResponse(
              ErrorCode.VALIDATION_ERROR,
              'Template content is required for creating templates',
              'Provide templateContent as array of strings'
            ),
            null,
            2
          ),
        },
      ],
    };
  }

  try {
    // Ensure the template name is formatted correctly
    let templatePageName = params.templateName;
    if (!templatePageName.toLowerCase().includes('template')) {
      templatePageName = `${params.templateName} Template`;
    }

    // Create the template page
    await client.callApi('logseq.Editor.createPage', [templatePageName]);

    // Normalize template content to use proper Logseq template syntax
    const normalizedContent = params.templateContent.map((content) =>
      normalizeTemplatePlaceholders(content)
    );

    // Create the template property block first
    await client.callApi('logseq.Editor.insertBlock', [
      templatePageName,
      `template:: ${params.templateName}`,
      { sibling: false },
    ]);

    // Add each content block
    for (const content of normalizedContent) {
      await client.callApi('logseq.Editor.insertBlock', [
        templatePageName,
        content,
        { sibling: false },
      ]);
    }

    // Extract placeholders for reporting
    const placeholders = extractTemplatePlaceholdersFromContent(normalizedContent);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            createResponse({
              success: true,
              operation: 'create',
              templateName: params.templateName,
              templatePage: templatePageName,
              blocksCreated: normalizedContent.length + 1, // +1 for template property
              placeholders: placeholders,
              message: `Template "${params.templateName}" created successfully`,
            }),
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            createErrorResponse(
              ErrorCode.INTERNAL,
              `Failed to create template: ${error}`,
              'Check template content and page permissions'
            ),
            null,
            2
          ),
        },
      ],
    };
  }
}

/**
 * Normalize template placeholders to proper Logseq syntax
 */
function normalizeTemplatePlaceholders(content: string): string {
  // Convert {variable} to {{variable}} for Logseq template syntax
  return content.replace(/\{([^{}]+)\}/g, '{{$1}}');
}

/**
 * Extract template placeholders from content strings
 */
function extractTemplatePlaceholdersFromContent(contents: string[]): string[] {
  const placeholders = new Set<string>();

  const extractFromContent = (content: string) => {
    // Match all template syntax: {{variable}}, <%variable%>, or {variable}
    const matches = content.match(/(\{\{[^}]+\}\}|<%[^%]+%>|\{[^{}]+\})/g);
    if (matches) {
      matches.forEach((match) => placeholders.add(match));
    }
  };

  contents.forEach(extractFromContent);
  return Array.from(placeholders);
}
