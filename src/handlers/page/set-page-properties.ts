import type { LogseqClient } from '../../logseq-client.js';
import { SetPagePropertiesParamsSchema, ErrorCode } from '../../schemas/logseq.js';
import { logger } from '../../utils/logger.js';
import { createResponse, createErrorResponse, type ToolResult } from '../common.js';

/**
 * Handle setting, updating, removing, and querying page properties
 */
export async function handleSetPageProperties(
  client: LogseqClient,
  args: unknown
): Promise<ToolResult> {
  try {
    const params = SetPagePropertiesParamsSchema.parse(args);

    logger.info({ pageName: params.name }, 'Setting page properties');

    // Handle dry run
    if (params.control?.dryRun) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              createResponse({
                success: true,
                dryRun: true,
                pageName: params.name,
                operations: {
                  upsert: params.upsert || {},
                  remove: params.remove || [],
                },
                message: 'Dry run - no changes were made',
              }),
              null,
              2
            ),
          },
        ],
      };
    }

    // Get current page to work with
    const allPages = await client.getAllPages();
    const targetPage = allPages.find(
      (p) =>
        p.name.toLowerCase() === params.name.toLowerCase() ||
        p.originalName?.toLowerCase() === params.name.toLowerCase()
    );

    if (!targetPage) {
      const response = createErrorResponse(
        ErrorCode.NOT_FOUND,
        `Page "${params.name}" not found`,
        'Use ensure_page to create the page first'
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

    // If neither upsert nor remove is provided, return current properties (query mode)
    if (!params.upsert && !params.remove) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              createResponse({
                success: true,
                pageName: targetPage.name,
                properties: targetPage.properties || {},
                propertyCount: Object.keys(targetPage.properties || {}).length,
                mode: 'query',
              }),
              null,
              2
            ),
          },
        ],
      };
    }

    // Apply property changes
    let updatedProperties = { ...(targetPage.properties || {}) };

    // Remove properties
    if (params.remove && params.remove.length > 0) {
      for (const key of params.remove) {
        delete updatedProperties[key];
      }
      logger.debug({ removedKeys: params.remove }, 'Removed properties');
    }

    // Upsert properties
    if (params.upsert) {
      updatedProperties = { ...updatedProperties, ...params.upsert };
      logger.debug({ upsertKeys: Object.keys(params.upsert) }, 'Upserted properties');
    }

    // Update the page properties using Logseq API
    try {
      // Set properties one by one as Logseq doesn't have a bulk upsert method
      for (const [key, value] of Object.entries(updatedProperties)) {
        await client.callApi('logseq.Editor.setPageProperty', [targetPage.name, key, value]);
      }

      logger.info({ pageName: targetPage.name }, 'Successfully updated page properties');

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              createResponse({
                success: true,
                pageName: targetPage.name,
                properties: updatedProperties,
                changes: {
                  upserted: params.upsert ? Object.keys(params.upsert) : [],
                  removed: params.remove || [],
                },
                propertyCount: Object.keys(updatedProperties).length,
              }),
              null,
              2
            ),
          },
        ],
      };
    } catch (apiError) {
      // Fallback: Try updating properties block by block if direct API fails
      logger.warn({ error: apiError }, 'Direct property API failed, trying block-based approach');

      try {
        const success = await updatePagePropertiesViaBlocks(
          client,
          targetPage.name,
          updatedProperties
        );

        if (success) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  createResponse({
                    success: true,
                    pageName: targetPage.name,
                    properties: updatedProperties,
                    changes: {
                      upserted: params.upsert ? Object.keys(params.upsert) : [],
                      removed: params.remove || [],
                    },
                    propertyCount: Object.keys(updatedProperties).length,
                    method: 'block-based',
                  }),
                  null,
                  2
                ),
              },
            ],
          };
        }
      } catch (blockError) {
        logger.error({ blockError }, 'Block-based property update also failed');
      }

      const response = createErrorResponse(
        ErrorCode.INTERNAL,
        `Failed to update properties for page "${params.name}"`,
        `API Error: ${apiError}`
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
  } catch (error) {
    logger.error({ error }, 'Set page properties failed');
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
}

/**
 * Update page properties by manipulating the properties block directly
 */
async function updatePagePropertiesViaBlocks(
  client: LogseqClient,
  pageName: string,
  properties: Record<string, unknown>
): Promise<boolean> {
  try {
    // Get page blocks
    const blocks = await client.getPageBlocksTree(pageName);
    if (!blocks || blocks.length === 0) {
      return false;
    }

    // Find the first block and check if it's a properties block
    const firstBlock = blocks[0];

    // Create properties content in Logseq format
    const propertiesContent = Object.entries(properties)
      .map(([key, value]) => `${key}:: ${formatPropertyValue(value)}`)
      .join('\n');

    // If first block looks like properties, update it; otherwise prepend properties
    if (firstBlock.content && firstBlock.content.includes('::')) {
      // Update existing properties block
      await client.callApi('logseq.Editor.updateBlock', [firstBlock.uuid, propertiesContent]);
    } else {
      // Insert new properties block at the beginning
      await client.callApi('logseq.Editor.insertBlock', [
        pageName,
        propertiesContent,
        { sibling: false, before: true },
      ]);
    }

    return true;
  } catch (error) {
    logger.error({ error }, 'Failed to update properties via blocks');
    return false;
  }
}

/**
 * Format property values for Logseq syntax
 */
function formatPropertyValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(formatPropertyValue).join(', ')}]`;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
