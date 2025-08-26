/**
 * Task Retrieval Operations
 * Focused retrieval functionality for individual tasks and task collections
 */

import { logger } from '../../utils/system/logger.js';
import { ErrorCode, createStructuredError } from '../../utils/system/errors.js';
import { SecureValidationHelpers } from '../../utils/validation.js';
import type { PerformanceAwareLogseqClient } from "../../adapters/client.js";

/**
 * Get a specific task by block UUID
 */
export async function getTask(
  perfClient: PerformanceAwareLogseqClient,
  blockUuid: string
): Promise<unknown> {
  try {
    const blockUuidError = SecureValidationHelpers.validateBlockUuid(blockUuid);
    if (blockUuidError) {
      return { error: blockUuidError };
    }

    logger.debug({ blockUuid }, 'Getting task');
    
    const block = await perfClient.getBlockCached(blockUuid);
    
    if (!block) {
      return {
        error: createStructuredError(ErrorCode.NOT_FOUND, {
          type: 'task',
          target: blockUuid,
          suggestion: 'Check block UUID or use search to find tasks'
        })
      };
    }

    // Parse task content
    const taskMatch = block.content?.match(/^(TODO|DOING|DONE|WAITING|LATER|NOW|CANCELED)\s+(.+)$/);
    if (!taskMatch) {
      return {
        error: createStructuredError(ErrorCode.NOT_FOUND, {
          type: 'task',
          target: blockUuid,
          reason: 'Block is not a task',
          suggestion: 'Block must start with a task marker (TODO, DOING, etc.)'
        })
      };
    }

    const [, status, content] = taskMatch;

    return {
      uuid: block.uuid,
      content: content,
      status: status,
      page: block.page?.name || 'Unknown',
      scheduled: extractScheduledDate(block.content),
      deadline: extractDeadlineDate(block.content),
      properties: block.properties,
      createdAt: block['created-at'],
      updatedAt: block['updated-at']
    };
  } catch (error) {
    logger.error({ blockUuid, error }, 'Failed to get task');
    return {
      error: createStructuredError(ErrorCode.INTERNAL, {
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}

/**
 * Get all tasks across all pages
 */
export async function getAllTasks(perfClient: PerformanceAwareLogseqClient): Promise<unknown[]> {
  try {
    const allPages = await perfClient.getAllPagesCached();
    const tasks: unknown[] = [];

    for (const page of allPages) {
      try {
        const blocks = await perfClient.getPageBlocksTreeCached(page.name);
        
        for (const block of blocks) {
          const taskMatch = block.content?.match(/^(TODO|DOING|DONE|WAITING|LATER|NOW|CANCELED)\s+(.+)$/);
          if (taskMatch) {
            const [, status, content] = taskMatch;
            tasks.push({
              uuid: block.uuid,
              content: content,
              status: status,
              page: page.name,
              scheduled: extractScheduledDate(block.content),
              deadline: extractDeadlineDate(block.content),
              properties: block.properties,
              createdAt: block['created-at'],
              updatedAt: block['updated-at']
            });
          }
        }
      } catch (error) {
        logger.warn({ pageName: page.name, error }, 'Failed to get tasks from page');
        continue;
      }
    }

    return tasks;
  } catch (error) {
    logger.error({ error }, 'Failed to get all tasks');
    return [];
  }
}

function extractScheduledDate(content: string): string | undefined {
  const scheduledMatch = content.match(/SCHEDULED:\s*<([^>]+)>/);
  return scheduledMatch ? scheduledMatch[1] : undefined;
}

function extractDeadlineDate(content: string): string | undefined {
  const deadlineMatch = content.match(/DEADLINE:\s*<([^>]+)>/);
  return deadlineMatch ? deadlineMatch[1] : undefined;
}