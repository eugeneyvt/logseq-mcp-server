/**
 * Get Tool Handler
 * Main request handler logic for get operations
 */

import type { LogseqClient } from '../../logseq-client.js';
import type { PerformanceAwareLogseqClient } from "../../adapters/client.js";
import { withPerformanceMonitoring } from "../../utils/performance/monitoring.js"
import { logger } from '../../utils/system/logger.js';
import { type ToolResult } from '../../types.js';
import { GetParamsSchema, type GetParams, type GetResponse } from '../../validation/schemas.js';
import { ErrorCode, createStructuredError } from '../../utils/system/errors.js';
import { formatError } from '../../utils/error-formatting.js';
import { createPerformanceAwareClient } from "../../adapters/client.js";

// Import core modules
import { validateGetParams, preprocessArgs } from './validation.js';
import { 
  getPages, 
  getBlocks, 
  getTemplates, 
  getProperties, 
  getRelations, 
  getTasks, 
  getSystemInfo, 
  getGraphInfo 
} from './retrieval.js';

/**
 * Execute get operation by routing to appropriate handler
 */
async function executeGet(perfClient: PerformanceAwareLogseqClient, params: GetParams): Promise<{ data: unknown; truncated?: boolean }> {
  switch (params.type) {
    case 'page':
      return await getPages(perfClient, params);
    case 'block':
      return await getBlocks(perfClient, params);
    case 'template':
      return await getTemplates(perfClient, params);
    case 'properties':
      return await getProperties(perfClient, params);
    case 'relations':
      return await getRelations(perfClient, params);
    case 'tasks':
      return await getTasks(perfClient, params);
    case 'system':
      return await getSystemInfo(perfClient, params);
    case 'graph':
      return await getGraphInfo(perfClient, params);
    default:
      throw createStructuredError(
        ErrorCode.VALIDATION_ERROR,
        {
          type: 'get_type',
          target: (params as Record<string, unknown>).type as string
        },
        `Unsupported get type: ${(params as Record<string, unknown>).type}`,
        'Use one of the supported content types'
      );
  }
}

/**
 * Handle get tool requests
 */
export async function handleGetRequest(client: LogseqClient, args: unknown): Promise<ToolResult> {
  logger.debug({ hasArgs: !!args }, 'Processing get request');

  try {
    // Create performance-aware client wrapper
    const perfClient = createPerformanceAwareClient(client);

    // Preprocess and validate arguments
    const preprocessedArgs = preprocessArgs(args);
    logger.debug({ preprocessedArgs }, 'Arguments preprocessed');

    // Validate with Zod schema first
    const schemaResult = GetParamsSchema.safeParse(preprocessedArgs);
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
            allowed_values: 'page, block, template, properties, relations, tasks, system, graph'
          },
          'Invalid type parameter',
          'Type must be one of the supported content types'
        );
      }
      
      if (mainError?.path.includes('depth')) {
        throw createStructuredError(
          ErrorCode.VALIDATION_ERROR,
          {
            field: 'depth',
            reason: mainError.message,
            value: preprocessedArgs && typeof preprocessedArgs === 'object' ? (preprocessedArgs as Record<string, unknown>).depth : undefined
          },
          'Invalid depth parameter',
          'Depth must be between 1 and 5'
        );
      }
      
      if (mainError?.path.includes('preview_length')) {
        throw createStructuredError(
          ErrorCode.VALIDATION_ERROR,
          {
            field: 'preview_length',
            reason: mainError.message,
            value: preprocessedArgs && typeof preprocessedArgs === 'object' ? (preprocessedArgs as Record<string, unknown>).preview_length : undefined
          },
          'Invalid preview_length parameter',
          'Preview length must be between 100 and 5000 characters'
        );
      }
      
      if (mainError?.path.includes('format')) {
        throw createStructuredError(
          ErrorCode.VALIDATION_ERROR,
          {
            field: 'format',
            reason: mainError.message,
            allowed_values: 'tree, flat'
          },
          'Invalid format parameter',
          'Format must be either "tree" or "flat"'
        );
      }
      
      throw createStructuredError(
        ErrorCode.VALIDATION_ERROR,
        {
          type: 'get_params',
          errors: errors.map(e => ({ path: e.path.join('.'), message: e.message }))
        },
        'Invalid get parameters',
        'Check the get parameters and ensure they match the expected format'
      );
    }

    const params = schemaResult.data;

    // Additional validation
    const validationError = validateGetParams(params);
    if (validationError) {
      throw validationError;
    }
    logger.debug({ getType: params.type, hasTarget: !!params.target }, 'Get parameters validated');

    // Execute get with performance monitoring
    const monitoredExecute = withPerformanceMonitoring(
      `get.${params.type}`,
      executeGet
    );
    const result = await monitoredExecute(perfClient, params);

    logger.info({
      contentType: params.type,
      targetCount: Array.isArray(params.target) ? params.target.length : 1,
      truncated: result.truncated
    }, 'Get completed successfully');

    const response: GetResponse = {
      type: params.type,
      data: result.data,
      truncated: result.truncated
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }
      ]
    };

  } catch (error) {
    logger.error({
      error: formatError(error)
    }, 'Get request failed');

    // Re-throw structured errors as-is
    if (error && typeof error === 'object' && 'code' in error) {
      throw error;
    }

    // Wrap other errors
    throw createStructuredError(
      ErrorCode.INTERNAL,
      { 
        type: 'get_operation'
      },
      `Get failed: ${formatError(error)}`
    );
  }
}