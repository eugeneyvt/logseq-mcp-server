/**
 * Templates Entity Module
 * Thin aggregator for all template operations
 */

// Core template operations
export * from './core.js';

// CRUD operations
export { createTemplate } from './create.js';
export { updateTemplate } from './update.js';
export { insertTemplate } from './insert.js';
export { deleteTemplate } from './delete.js';

// Main operation dispatcher
import type { LogseqClient } from '../../logseq-client.js';
import type { EditParams } from '../../validation/schemas.js';
import { ErrorCode, createStructuredError } from '../../utils/system/errors.js';
import { createTemplate } from './create.js';
import { updateTemplate } from './update.js';
import { insertTemplate } from './insert.js';
import { deleteTemplate } from './delete.js';

/**
 * Main template edit dispatcher
 */
export async function editTemplate(client: LogseqClient, params: EditParams): Promise<unknown> {
  switch (params.operation) {
    case 'create':
      return await createTemplate(client, params);
    case 'update':
      return await updateTemplate(client, params);
    case 'append':
      return await insertTemplate(client, params);
    case 'remove': {
      const targetName = Array.isArray(params.target) ? params.target[0] : params.target;
      return await deleteTemplate(client, targetName, false);
    }
    default:
      return {
        error: createStructuredError(ErrorCode.INVALID_COMBINATION, {
          type: 'template',
          operation: params.operation,
          validOps: ['create', 'update', 'append', 'remove']
        }, 
        `Invalid operation "${params.operation}" for template`,
        'Use one of: create, update, append, remove')
      };
  }
}