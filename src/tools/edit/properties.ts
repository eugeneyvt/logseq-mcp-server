/**
 * Edit Tool Properties Module
 * Handles property creation, update, and removal operations
 * Refactored to use Properties and Relations entities
 */

import type { LogseqClient } from '../../logseq-client.js';
import { createPerformanceAwareClient } from '../../adapters/client.js';
import type { EditParams } from '../../validation/schemas.js';


import { 
  createRelationFromParams,
  removeRelationFromParams,
  updateRelationFromParams
} from '../../entities/relations/operations.js';
//

/**
 * Edit properties operations dispatcher
 */
export async function editProperties(client: LogseqClient, params: EditParams): Promise<unknown> {
  const perfClient = createPerformanceAwareClient(client);
  
  // For properties, we need to handle both page names and block UUIDs properly
  const target = Array.isArray(params.target) ? params.target[0] : params.target;
  
  switch (params.operation) {
    case 'create':
    case 'update':
      return await setPropertyForTarget(perfClient, target, params);
    case 'remove':
      return await removePropertyForTarget(perfClient, target, params);
    default:
      throw new Error(`Unsupported property operation: ${params.operation}`);
  }
}

/**
 * Set or update a property for a target (page name or block UUID)
 */
// Delegate properties operations to entities module
import { setPropertyForTarget, removePropertyForTarget } from '../../entities/properties/index.js';


/**
 * Edit relations operations dispatcher using Relations entity
 */
export async function editRelations(client: LogseqClient, params: EditParams): Promise<unknown> {
  const perfClient = createPerformanceAwareClient(client);
  
  switch (params.operation) {
    case 'create':
      return await createRelationFromParams(perfClient, params);
    case 'remove':
      return await removeRelationFromParams(perfClient, params);
    case 'update':
      return await updateRelationFromParams(perfClient, params);
    default:
      throw new Error(`Unsupported relation operation: ${params.operation}`);
  }
}
