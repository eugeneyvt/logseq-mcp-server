import type { LogseqClient } from '../../logseq-client.js';
import { EnsurePageParamsSchema, ErrorCode, type EnsurePageParams } from '../../schemas/logseq.js';
import { validatePageName } from '../../utils/formatting.js';
import { normalizeJournalPageName, findJournalPage, looksLikeDate } from '../../utils/date-formats.js';
import { logger } from '../../utils/logger.js';
import { createResponse, createErrorResponse, type ToolResult } from '../common.js';

export async function handleEnsurePage(client: LogseqClient, args: unknown): Promise<ToolResult> {
  try {
    const params = EnsurePageParamsSchema.parse(args) as EnsurePageParams;
    const { control } = params;

    logger.debug({ params }, 'Ensuring page exists');

    const nameValidation = validatePageName(params.name);
    if (!nameValidation.isValid && control?.strict !== false) {
      const response = createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        `Invalid page name: ${nameValidation.errors.join(', ')}`,
        'Use validatePageName utility to check page names before calling ensure_page'
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

    if (control?.dryRun) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              createResponse({ action: 'would_ensure_page', page: params.name }),
              null,
              2
            ),
          },
        ],
      };
    }

    // Try original name first
    let existingPage = await client.getPage(params.name);
    let actualPageName = params.name;

    // If not found and looks like a date, check for journal format variations
    if (!existingPage && looksLikeDate(params.name)) {
      logger.debug({ pageName: params.name }, 'Checking journal date format variations');
      
      const dateVariations = normalizeJournalPageName(params.name);
      const foundPageName = await findJournalPage(
        dateVariations,
        async (name: string) => {
          const testPage = await client.getPage(name);
          return !!testPage;
        }
      );

      if (foundPageName) {
        existingPage = await client.getPage(foundPageName);
        actualPageName = foundPageName;
        logger.info({ 
          originalName: params.name, 
          foundName: foundPageName 
        }, 'Found existing journal page with date format conversion');
      }
    }

    if (existingPage) {
      logger.info({ pageName: actualPageName }, 'Page already exists');
      
      // If we converted the date format, include a warning
      const response = actualPageName !== params.name 
        ? {
            ok: true,
            data: {
              action: 'page_exists',
              page: existingPage,
            },
            warning: {
              message: `Date format converted from "${params.name}" to "${actualPageName}"`,
              hint: `For future requests, please use the Logseq journal format: "${actualPageName}". This follows the pattern "MMM do, yyyy" (e.g., "Aug 20th, 2025").`
            }
          }
        : createResponse({
            action: 'page_exists',
            page: existingPage,
          });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    }

    if (params.ifAbsent === 'error') {
      const response = createErrorResponse(
        ErrorCode.NOT_FOUND,
        `Page "${params.name}" does not exist`,
        'Set ifAbsent to "create" to create the page automatically'
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

    if (params.ifAbsent === 'skip') {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              createResponse({ action: 'skipped', reason: 'page_not_found' }),
              null,
              2
            ),
          },
        ],
      };
    }

    const newPage = await client.createPage(params.name);
    logger.info({ pageName: params.name, pageId: newPage.id }, 'Page created successfully');

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            createResponse({ action: 'page_created', page: newPage }),
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    logger.error({ error }, 'Failed to ensure page');
    const response = createErrorResponse(ErrorCode.INTERNAL, `Failed to ensure page: ${error}`);
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