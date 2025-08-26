/**
 * Task Operations
 * Create, update, delete task operations
 */

import { logger } from '../../utils/system/logger.js';
import { ErrorCode, createStructuredError } from '../../utils/system/errors.js';
import { SecureValidationHelpers } from '../../utils/validation.js';
import type { LogseqClient } from '../../logseq-client.js';
import type { EditParams } from "../../validation/schemas.js";

/**
 * Main task edit dispatcher
 */
export async function editTask(client: LogseqClient, params: EditParams): Promise<unknown> {
  switch (params.operation) {
    case 'create':
      return await createTask(client, params);
    case 'update':
      return await updateTaskStatus(client, params);
    default:
      return {
        error: createStructuredError(ErrorCode.INVALID_COMBINATION, {
          type: 'task',
          operation: params.operation,
          validOps: ['create', 'update']
        })
      };
  }
}

async function createTask(client: LogseqClient, params: EditParams): Promise<unknown> {
  try {
    if (params.dryRun) {
      return {
        action: 'create_task',
        target: params.target,
        content: params.content,
        taskState: params.taskState,
        dry_run: true
      };
    }

    // Validate and sanitize content
    const contentValidation = SecureValidationHelpers.validateAndSanitizeBlockContent(String(params.content || ''), true);
    if (contentValidation.error) {
      return { error: contentValidation.error };
    }

    // Create task content with status
    const taskStatus = params.taskState || 'TODO';
    const taskContent = `${taskStatus} ${contentValidation.sanitizedContent}`;

    const target = Array.isArray(params.target) ? params.target[0] : params.target;
    let createdUuid: string | undefined;
    if (target.length >= 32 && target.includes('-')) {
      // Insert under a block UUID
      const block = await client.callApi('logseq.Editor.insertBlock', [
        target,
        taskContent,
        { sibling: false }
      ]);
      if (block && typeof block === 'object' && 'uuid' in block) { createdUuid = String((block as { uuid: unknown }).uuid); }
    } else {
      // Treat target as page name; ensure page exists
      await client.callApi('logseq.Editor.createPage', [target]);
      // Try to reuse initial empty block
      const pageBlocks = await client.getPageBlocksTree(target);
      if (Array.isArray(pageBlocks) && pageBlocks.length > 0) {
        const first = pageBlocks[0] as Record<string, unknown>;
        const firstUuid = typeof first.uuid === 'string' ? first.uuid : undefined;
        const firstContent = typeof first.content === 'string' ? first.content : '';
        if (firstUuid && (!firstContent || firstContent.trim().length === 0)) {
          await client.callApi('logseq.Editor.updateBlock', [firstUuid, taskContent]);
          createdUuid = firstUuid;
        }
      }
      if (!createdUuid) {
        const lastRoot = Array.isArray(pageBlocks) && pageBlocks.length > 0 ? String((pageBlocks[pageBlocks.length - 1] as Record<string, unknown>).uuid || target) : target;
        const inserted = await client.callApi('logseq.Editor.insertBlock', [
          lastRoot,
          taskContent,
          { sibling: true }
        ]);
        if (inserted && typeof inserted === 'object' && 'uuid' in inserted) { createdUuid = String((inserted as { uuid: unknown }).uuid); }
      }
    }

    return {
      task_uuid: createdUuid,
      content: contentValidation.sanitizedContent,
      status: taskStatus,
      parent: target
    };
  } catch (error) {
    logger.error({ params, error }, 'Failed to create task');
    return {
      error: createStructuredError(ErrorCode.INTERNAL, {
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}

async function updateTaskStatus(client: LogseqClient, params: EditParams): Promise<unknown> {
  try {
    const targetUuid = Array.isArray(params.target) ? params.target[0] : params.target;
    
    if (params.dryRun) {
      return {
        action: 'update_task_status',
        target: targetUuid,
        taskState: params.taskState,
        dry_run: true
      };
    }

    // Get current task block
    const block = await client.getBlock(targetUuid);
    if (!block || typeof block !== 'object' || !('content' in block)) {
      return {
        error: createStructuredError(ErrorCode.NOT_FOUND, {
          type: 'task',
          target: targetUuid,
          suggestion: 'Block not found or is not a task'
        })
      };
    }

    const currentContent = String((block as { content: unknown }).content || '');
    const taskMatch = currentContent.match(/^(TODO|DOING|DONE|WAITING|LATER|NOW|CANCELED)\s+(.+)$/);
    
    if (!taskMatch) {
      return {
        error: createStructuredError(ErrorCode.INVALID_ARGUMENT, {
          field: 'target',
          reason: 'Block is not a task',
          suggestion: 'Block must start with a task marker (TODO, DOING, etc.)'
        })
      };
    }

    const [, currentStatus, taskText] = taskMatch;
    const newStatus = (Array.isArray(params.taskState) ? params.taskState[0] : params.taskState) || currentStatus;
    const newContent = `${newStatus} ${taskText}`;

    await client.callApi('logseq.Editor.updateBlock', [targetUuid, newContent]);

    return {
      task_uuid: targetUuid,
      previous_status: currentStatus,
      new_status: newStatus,
      content: taskText
    };
  } catch (error) {
    logger.error({ params, error }, 'Failed to update task status');
    return {
      error: createStructuredError(ErrorCode.INTERNAL, {
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}

/**
 * Delete a task
 */
export async function deleteTask(
  client: LogseqClient, 
  blockUuid: string, 
  cascade = false
): Promise<unknown> {
  try {
    const blockUuidError = SecureValidationHelpers.validateBlockUuid(blockUuid);
    if (blockUuidError) {
      return { error: blockUuidError };
    }

    // Verify it's a task before deleting
    const block = await client.getBlock(blockUuid);
    if (block && typeof block === 'object' && 'content' in block) {
      const content = String((block as { content: unknown }).content || '');
      const taskMatch = content.match(/^(TODO|DOING|DONE|WAITING|LATER|NOW|CANCELED)\s+(.+)$/);
      
      if (!taskMatch) {
        return {
          error: createStructuredError(ErrorCode.INVALID_ARGUMENT, {
            field: 'target',
            reason: 'Block is not a task',
            suggestion: 'Can only delete blocks that are tasks'
          })
        };
      }
    }

    await client.callApi('logseq.Editor.removeBlock', [blockUuid]);

    return {
      task_uuid: blockUuid,
      deleted: true,
      cascade
    };
  } catch (error) {
    logger.error({ blockUuid, error }, 'Failed to delete task');
    return {
      error: createStructuredError(ErrorCode.INTERNAL, {
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}
