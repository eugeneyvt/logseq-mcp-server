import type { LogseqClient } from '../../logseq-client.js';
import type { LogseqBlock } from '../../schemas/base-types.js';
import { ErrorCode } from '../../schemas/logseq.js';
import { createResponse, createErrorResponse, type ToolResult } from '../common.js';
import { logger } from '../../utils/logger.js';
import type { ApplyTemplateParams, TemplateInfo, TemplateListItem } from './template-types.js';
import { extractTemplatePlaceholders, substituteTemplateVariables } from './template-utils.js';

/**
 * List all available templates in the graph
 */
export async function listAllTemplates(client: LogseqClient): Promise<ToolResult> {
  try {
    const allPages = await client.getAllPages();
    const templates = allPages.filter(
      (page) =>
        page.name.toLowerCase().includes('template') ||
        (page.properties && page.properties.template) ||
        (page.properties && page.properties['page-type'] === 'template') ||
        (page.properties && page.properties.type === 'template')
    );

    const templateInfo: TemplateListItem[] = [];

    for (const template of templates.slice(0, 20)) {
      // Limit to 20 for performance
      try {
        const blocks = await client.getPageBlocksTree(template.name);
        const placeholders = extractTemplatePlaceholders(blocks || []);

        templateInfo.push({
          name: template.name,
          id: String(template.id),
          properties: template.properties || {},
          placeholders: placeholders,
          blockCount: blocks ? blocks.length : 0,
          templateType: String(
            template.properties?.['template-type'] || template.properties?.type || 'page'
          ),
        });
      } catch (error) {
        // Skip templates with access errors
        templateInfo.push({
          name: template.name,
          id: String(template.id),
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
export async function findTemplateByName(
  client: LogseqClient,
  templateName: string
): Promise<TemplateInfo | null> {
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
export async function applyTemplateToPage(
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
  const processedContent = substituteTemplateVariables(
    templateInfo.blocks as readonly LogseqBlock[],
    params.variables || {}
  );

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
