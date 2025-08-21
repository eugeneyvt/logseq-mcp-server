import type { LogseqClient } from '../../logseq-client.js';
import { ErrorCode } from '../../schemas/logseq.js';
import { createResponse, createErrorResponse, type ToolResult } from '../common.js';
import type { ApplyTemplateParams } from './template-types.js';
import {
  normalizeTemplatePlaceholders,
  extractTemplatePlaceholdersFromContent,
} from './template-utils.js';

/**
 * Create a new template
 */
export async function createNewTemplate(
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
