/**
 * Search Tool Handler
 * Main request handler logic for search operations
 */

import type { LogseqClient } from '../../logseq-client.js';
import { logger } from '../../utils/system/logger.js';
import { type ToolResult } from '../../types.js';
import { SearchParamsSchema } from '../../validation/schemas.js';
import { ErrorCode, createStructuredError } from '../../utils/system/errors.js';
import { formatError } from '../../utils/error-formatting.js';
import { createPerformanceAwareClient } from "../../adapters/client.js";
import { withPerformanceMonitoring } from "../../utils/performance/monitoring.js"

// Import modules
import { executeSearch } from './operations.js';
import { validateSearchParams, preprocessArgs } from './validation.js';

/**
 * Handle search tool requests
 */
export async function handleSearchRequest(client: LogseqClient, args: unknown): Promise<ToolResult> {
  logger.debug({ hasArgs: !!args }, 'Processing search request');

  try {
    // Create performance-aware client wrapper
    const perfClient = createPerformanceAwareClient(client);

    // Preprocess and validate arguments
    const preprocessedArgs = preprocessArgs(args);
    logger.debug({ preprocessedArgs }, 'Arguments preprocessed');

    // Validate with Zod schema first
    const schemaResult = SearchParamsSchema.safeParse(preprocessedArgs);
    if (!schemaResult.success) {
      const errors = schemaResult.error.errors;
      const mainError = errors[0];
      
      // Check for specific validation errors with better messages
      if (mainError?.path.includes('limit')) {
        throw createStructuredError(
          ErrorCode.VALIDATION_ERROR,
          {
            field: 'limit',
            reason: mainError.message,
            value: preprocessedArgs && typeof preprocessedArgs === 'object' ? (preprocessedArgs as Record<string, unknown>).limit : undefined
          },
          'Invalid limit parameter',
          'Limit must be between 1 and 100'
        );
      }
      
      if (mainError?.path.includes('target') || mainError?.path.includes('sort') || mainError?.path.includes('order')) {
        throw createStructuredError(
          ErrorCode.VALIDATION_ERROR,
          {
            field: mainError.path.join('.'),
            reason: mainError.message,
            allowed_values: mainError.code === 'invalid_enum_value' ? 'See tool schema for allowed values' : undefined
          },
          'Invalid parameter value',
          `${mainError.path.join('.')} must be one of the allowed values`
        );
      }
      
      throw createStructuredError(
        ErrorCode.VALIDATION_ERROR,
        {
          type: 'search_params',
          errors: errors.map(e => ({ path: e.path.join('.'), message: e.message }))
        },
        'Invalid search parameters',
        'Check the search parameters and ensure they match the expected format'
      );
    }

    const params = schemaResult.data;

    // Additional validation
    const validationError = validateSearchParams(params);
    if (validationError) {
      throw validationError;
    }
    logger.debug({ searchTarget: params.target, hasQuery: !!params.query }, 'Search parameters validated');

    // Execute search with performance monitoring
    const monitoredExecute = withPerformanceMonitoring(
      'search.execute',
      executeSearch
    );
    const result = await monitoredExecute(perfClient, params);

    logger.info({
      resultCount: result.results.length,
      hasNextPage: result.has_more,
      totalFound: result.total_found,
      target: params.target
    }, 'Search completed successfully');

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };

  } catch (error) {
    logger.error({
      error: formatError(error)
    }, 'Search request failed');

    // Re-throw structured errors as-is
    if (error && typeof error === 'object' && 'code' in error) {
      throw error;
    }

    // Wrap other errors
    throw createStructuredError(
      ErrorCode.INTERNAL,
      { 
        type: 'search_operation'
      },
      `Search failed: ${formatError(error)}`
    );
  }
}