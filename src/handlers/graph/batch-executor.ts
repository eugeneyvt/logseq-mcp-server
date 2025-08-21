import { ErrorCode } from '../../schemas/logseq.js';
import { createResponse, createErrorResponse, type ToolResult } from '../common.js';
import { logger } from '../../utils/logger.js';
import type { BatchParams } from '../../schemas/logseq.js';
import type { BatchOperationResult } from './graph-types.js';

/**
 * Execute batch operations atomically
 */
export async function executeBatch(
  client: unknown,
  params: BatchParams,
  getAllHandlers: () => Record<string, (args: unknown) => Promise<ToolResult>>
): Promise<ToolResult> {
  try {
    logger.debug({ operationCount: params.ops.length }, 'Executing batch operations');

    if (params.control?.dryRun) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              createResponse({
                action: 'would_execute_batch',
                operationCount: params.ops.length,
                operations: params.ops.map((op) => ({
                  operation: op.operation,
                  argsKeys: Object.keys(op.args),
                })),
              }),
              null,
              2
            ),
          },
        ],
      };
    }

    // Get all handlers for execution
    const allHandlers = getAllHandlers();

    const results: BatchOperationResult[] = [];
    const errors: string[] = [];

    // Execute operations
    for (let i = 0; i < params.ops.length; i++) {
      const op = params.ops[i];

      try {
        const handler = allHandlers[op.operation];
        if (!handler) {
          const error = `Unknown operation: ${op.operation}`;
          errors.push(error);
          results.push({ operation: op.operation, success: false, error });

          // If atomic mode and we hit an error, stop execution
          if (params.atomic) {
            break;
          }
          continue;
        }

        logger.debug({ operation: op.operation, opIndex: i }, 'Executing batch operation');
        const result = await handler(op.args);

        results.push({ operation: op.operation, success: true, result });
        logger.debug(
          { operation: op.operation, opIndex: i },
          'Batch operation completed successfully'
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`Operation ${op.operation}: ${errorMsg}`);
        results.push({ operation: op.operation, success: false, error: errorMsg });

        // If atomic mode and we hit an error, stop execution
        if (params.atomic) {
          logger.warn(
            { operation: op.operation, error: errorMsg },
            'Atomic batch operation failed, stopping execution'
          );
          break;
        }

        logger.warn(
          { operation: op.operation, error: errorMsg },
          'Batch operation failed, continuing with next'
        );
      }
    }

    // Check if we should fail the entire batch in atomic mode
    if (params.atomic && errors.length > 0) {
      const response = createErrorResponse(
        ErrorCode.INTERNAL,
        `Batch operation failed (atomic mode): ${errors[0]}`,
        `${errors.length} operation(s) failed. In atomic mode, all operations must succeed.`
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

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    logger.info(
      {
        totalOperations: params.ops.length,
        successCount,
        failureCount,
        atomic: params.atomic,
      },
      'Batch operations completed'
    );

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            createResponse({
              results,
              summary: {
                total: params.ops.length,
                successful: successCount,
                failed: failureCount,
                atomic: params.atomic,
              },
              errors: errors.length > 0 ? errors : undefined,
            }),
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    logger.error({ error }, 'Failed to execute batch operations');
    const response = createErrorResponse(ErrorCode.INTERNAL, `Failed to execute batch: ${error}`);
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
