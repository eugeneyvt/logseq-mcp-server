/**
 * Template Deletion Operations
 * Focused operations for deleting templates
 */

import { logger } from '../../utils/system/logger.js';
import { ErrorCode, createStructuredError } from '../../utils/system/errors.js';
import { formatError } from '../../utils/error-formatting.js';
import { SecureValidationHelpers } from '../../utils/validation.js';
import type { LogseqClient } from '../../logseq-client.js';
import { isLogseqPage, type LogseqPage } from '../../schemas/types.js';

/**
 * Delete a template
 */
export async function deleteTemplate(
  client: LogseqClient, 
  templateName: string, 
  cascade = false
): Promise<unknown> {
  try {
    const templateNameError = SecureValidationHelpers.validatePageName(templateName);
    if (templateNameError) {
      return { error: templateNameError };
    }

    // Find template page
    const allPages = await client.getAllPages();
    if (!Array.isArray(allPages)) {
      return {
        error: createStructuredError(ErrorCode.INTERNAL, {
          error: 'Failed to get pages from client'
        })
      };
    }

    const templatePage = allPages.find((p: unknown): p is LogseqPage => {
      if (!isLogseqPage(p)) {return false;}
      
      const props = p.properties as Record<string, unknown> | undefined;
      return props?.template === templateName ||
             p.name === templateName ||
             p.name === `${templateName} Template`;
    });

    if (!templatePage) {
      return {
        error: createStructuredError(ErrorCode.NOT_FOUND, {
          type: 'template',
          target: templateName,
          suggestion: 'Check template name or list available templates'
        })
      };
    }

    // Delete the template page
    await client.callApi('logseq.Editor.deletePage', [String(templatePage.name)]);

    return {
      template_name: templateName,
      template_page: String(templatePage.name),
      deleted: true,
      cascade
    };
  } catch (error) {
    logger.error({ templateName, error }, 'Failed to delete template');
    return {
      error: createStructuredError(ErrorCode.INTERNAL, {
        error: formatError(error)
      })
    };
  }
}