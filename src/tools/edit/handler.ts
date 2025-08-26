/**
 * Edit Tool Handler
 * Main request handler logic for edit operations
 */

import type { LogseqClient } from '../../logseq-client.js';
import { logger } from '../../utils/system/logger.js';
import { type ToolResult } from '../../types.js';
import { EditParamsSchema, type EditParams } from '../../validation/schemas.js';
import { ErrorCode, createStructuredError, validateTypeOperation } from '../../utils/system/errors.js';
import { formatError } from '../../utils/error-formatting.js';
import { createPerformanceAwareClient } from "../../adapters/client.js";
import { withPerformanceMonitoring } from "../../utils/performance/monitoring.js"

// Import core modules
import { validateEditParams, preprocessArgs } from './validation.js';
import { executeEdit } from './operations.js';
import { checkIdempotency, storeIdempotencyResult, createErrorResult } from './utils.js';

/**
 * Handle edit tool requests
 */
export async function handleEditRequest(client: LogseqClient, args: unknown): Promise<ToolResult> {
  logger.debug({ hasArgs: !!args }, 'Processing edit request');

  try {
    // Create performance-aware client wrapper
    const perfClient = createPerformanceAwareClient(client);

    // Preprocess and validate arguments
    const preprocessedArgs = preprocessArgs(args);
    logger.debug({ preprocessedArgs }, 'Arguments preprocessed');

    // Validate with Zod schema first
    const schemaResult = EditParamsSchema.safeParse(preprocessedArgs);
    if (!schemaResult.success) {
      const errors = schemaResult.error.errors;
      const mainError = errors[0];
      
      // Check for specific validation errors with better messages
      if (mainError?.path.includes('type')) {
        throw createStructuredError(
          ErrorCode.VALIDATION_ERROR,
          {
            field: 'type',
            reason: mainError.message,
            allowed_values: 'page, block, template, properties, relations, tasks'
          },
          'Invalid type parameter',
          'Type must be one of the supported content types'
        );
      }
      
      if (mainError?.path.includes('operation')) {
        throw createStructuredError(
          ErrorCode.VALIDATION_ERROR,
          {
            field: 'operation',
            reason: mainError.message,
            allowed_values: 'create, update, append, prepend, move, remove'
          },
          'Invalid operation parameter',
          'Operation must be one of the supported operations'
        );
      }
      
      throw createStructuredError(
        ErrorCode.VALIDATION_ERROR,
        {
          type: 'edit_params',
          errors: errors.map(e => ({ path: e.path.join('.'), message: e.message }))
        },
        'Invalid edit parameters',
        'Check the edit parameters and ensure they match the expected format'
      );
    }

    const params = schemaResult.data;

    // Additional validation
    const validationError = validateEditParams(params);
    if (validationError) {
      throw validationError;
    }
    
    // Validate type+operation combination
    const typeOpValidation = validateTypeOperation(params.type, params.operation);
    if (typeOpValidation) {
      throw typeOpValidation;
    }

    logger.debug({
      editType: params.type,
      operation: params.operation,
      hasTarget: !!params.target,
      isDryRun: params.dryRun
    }, 'Edit parameters validated');

    // Check idempotency
    if (params.idempotencyKey) {
      const cachedResult = checkIdempotency(params.idempotencyKey, params);
      if (cachedResult) {
        logger.info({ idempotencyKey: params.idempotencyKey }, 'Returning cached result');
        return cachedResult as ToolResult;
      }
    }

    // Execute edit with performance monitoring
    const monitoredExecute = withPerformanceMonitoring(
      `edit.${params.type}.${params.operation}`,
      executeEdit
    );
    const editResult = await monitoredExecute(perfClient, params);

    // Create tool result from edit result
    // For templates, elevate key fields to root level for test compatibility
    const responseData: Record<string, unknown> = {
      successful: true,
      type: params.type,
      operation: params.operation,
      changes: editResult.changes,
      data: editResult.data
    };

    // Elevate template-specific fields to root level
    if (params.type === 'template' && editResult.data && typeof editResult.data === 'object') {
      const templateData = editResult.data as Record<string, unknown>;
      if ('single_block_enforced' in templateData) {
        responseData.single_block_enforced = templateData.single_block_enforced;
      }
      if ('placeholders' in templateData) {
        responseData.placeholders = templateData.placeholders;
      }
    }

    // Elevate dry_run field to root level if present
    if (editResult.data && typeof editResult.data === 'object' && 'dry_run' in editResult.data) {
      responseData.dry_run = (editResult.data as Record<string, unknown>).dry_run;
    }

    const toolResult: ToolResult = {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(responseData, null, 2)
        }
      ]
    };

    // Store idempotent result if key provided
    if (params.idempotencyKey) {
      storeIdempotencyResult(params.idempotencyKey, params, toolResult);
    }

    logger.info({
      editType: params.type,
      operation: params.operation,
      hasChanges: !!editResult.changes,
      hasData: !!editResult.data,
      isDryRun: params.dryRun
    }, 'Edit completed');

    return toolResult;

  } catch (error) {
    logger.error({
      error: formatError(error)
    }, 'Edit request failed');

    // Handle idempotency for errors too
    const args_parsed = preprocessArgs(args);
    if (args_parsed && typeof args_parsed === 'object' && 'idempotencyKey' in args_parsed) {
      const errorResult = createErrorResult(error);
      const toolResult = {
        content: [
          {
            type: 'text',
            text: JSON.stringify(errorResult, null, 2)
          }
        ]
      };
      // Create dummy params for idempotency storage in error case
      const errorParams = args_parsed as unknown as EditParams;
      storeIdempotencyResult(args_parsed.idempotencyKey as string, errorParams, toolResult);
    }

    // Re-throw structured errors as-is
    if (error && typeof error === 'object' && 'code' in error) {
      throw error;
    }

    // Wrap other errors
    throw createStructuredError(
      ErrorCode.INTERNAL,
      { 
        type: 'edit_operation'
      },
      `Edit failed: ${formatError(error)}`
    );
  }
}