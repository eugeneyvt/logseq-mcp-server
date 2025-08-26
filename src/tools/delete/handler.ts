/**
 * Delete Tool Handler
 * Main request handler logic for delete operations
 */

import type { LogseqClient } from '../../logseq-client.js';
import { logger } from '../../utils/system/logger.js';
import { type ToolResult } from '../../types.js';
import { DeleteParamsSchema } from '../../validation/schemas.js';
import { ErrorCode, createStructuredError } from '../../utils/system/errors.js';
import { formatError } from '../../utils/error-formatting.js';
import { createPerformanceAwareClient } from "../../adapters/client.js";
import { withPerformanceMonitoring } from "../../utils/performance/monitoring.js"

// Import core modules
import { validateDeleteParams, preprocessArgs } from './validation.js';
import { executeDelete, analyzeDeletionImpact } from './operations.js';

/**
 * Handle delete tool requests
 */
export async function handleDeleteRequest(client: LogseqClient, args: unknown): Promise<ToolResult> {
  logger.debug({ hasArgs: !!args }, 'Processing delete request');

  try {
    // Create performance-aware client wrapper
    const perfClient = createPerformanceAwareClient(client);

    // Preprocess and validate arguments
    const preprocessedArgs = preprocessArgs(args);
    logger.debug({ preprocessedArgs }, 'Arguments preprocessed');

    // Validate with Zod schema first
    const schemaResult = DeleteParamsSchema.safeParse(preprocessedArgs);
    if (!schemaResult.success) {
      const errors = schemaResult.error.errors;
      const mainError = errors[0];
      
      // Check for confirmDestroy specific errors
      if (mainError?.path.includes('confirmDestroy')) {
        throw createStructuredError(
          ErrorCode.VALIDATION_ERROR,
          {
            field: 'confirmDestroy',
            reason: mainError.message
          },
          'Delete confirmation required',
          'Set confirmDestroy: true to confirm deletion'
        );
      }
      
      throw createStructuredError(
        ErrorCode.VALIDATION_ERROR,
        {
          type: 'delete_params',
          errors: errors.map(e => ({ path: e.path.join('.'), message: e.message }))
        },
        'Invalid delete parameters',
        'Check the delete parameters and ensure they match the expected format'
      );
    }

    const params = schemaResult.data;

    // Additional validation
    const validationError = validateDeleteParams(params);
    if (validationError) {
      throw validationError;
    }

    // confirmDestroy is already validated by validateDeleteParams

    logger.debug({
      deleteType: params.type,
      hasTarget: !!params.target,
      isSimulation: params.simulate,
      cascade: params.cascade,
      softDelete: params.softDelete
    }, 'Delete parameters validated');

    // Analyze deletion impact first
    const impact = await analyzeDeletionImpact(perfClient, params);

    // Execute delete with performance monitoring
    const monitoredExecute = withPerformanceMonitoring(
      `delete.${params.type}`,
      executeDelete
    );
    const result: ToolResult = await monitoredExecute(perfClient, params, impact);

    logger.info({
      deleteType: params.type,
      hasContent: !!result.content,
      contentLength: result.content?.length || 0,
      isSimulation: params.simulate,
      cascade: params.cascade
    }, 'Delete completed');

    return result;

  } catch (error) {
    logger.error({
      error: formatError(error)
    }, 'Delete request failed');

    // Re-throw structured errors as-is
    if (error && typeof error === 'object' && 'code' in error) {
      throw error;
    }

    // Wrap other errors
    throw createStructuredError(
      ErrorCode.INTERNAL,
      { 
        type: 'delete_operation'
      },
      `Delete failed: ${formatError(error)}`
    );
  }
}