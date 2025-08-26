/**
 * Delete Tool Operations Module
 * Core deletion logic, impact analysis, and execution functions
 */

import type { LogseqClient } from '../../logseq-client.js';
import { logger } from '../../utils/system/logger.js';
import type { DeleteParams } from '../../validation/schemas.js';
import type { ContentType } from '../../schemas/unified-types.js';
import type { ToolResult } from '../../types.js';
import type { DeletionImpact, ItemImpact } from './types.js';
import type { PerformanceAwareLogseqClient } from "../../adapters/client.js";

// Import entity modules
import { analyzePageDeletionImpact, deletePage } from '../../entities/pages/operations.js';
import { analyzeBlockDeletionImpact, deleteBlock } from '../../entities/blocks/operations.js';
import { analyzeEntityRelations } from '../../entities/relations/operations.js';
import { removeProperty, getAllProperties } from '../../entities/properties/operations.js';

/**
 * Analyze deletion impact across all targets
 */
export async function analyzeDeletionImpact(
  perfClient: PerformanceAwareLogseqClient,
  params: DeleteParams
): Promise<DeletionImpact> {
  
  const targets = Array.isArray(params.target) ? params.target : [params.target];
  const impact: DeletionImpact = {
    items_to_delete: [],
    cascaded_items: [],
    orphaned_references: [],
    estimated_impact_score: 0
  };

  for (const target of targets) {
    try {
      const itemImpact = await analyzeItemImpact(perfClient, params.type, target, params.cascade || false);
      
      impact.items_to_delete.push({
        id: target,
        type: params.type,
        title: itemImpact.title,
        dependencies: itemImpact.dependencies
      });
      
      impact.cascaded_items.push(...itemImpact.cascaded_items);
      impact.orphaned_references.push(...itemImpact.orphaned_references);
      impact.estimated_impact_score += itemImpact.impact_score;
      
    } catch (error) {
      logger.warn({ target, error }, 'Failed to analyze item impact');
      // Continue with other items
    }
  }
  
  return impact;
}

/**
 * Analyze impact for a single item - delegates to entities
 */
async function analyzeItemImpact(
  perfClient: PerformanceAwareLogseqClient,
  type: ContentType,
  target: string,
  cascade: boolean
): Promise<ItemImpact> {
  
  switch (type) {
    case 'page': {
      // Delegate to Pages entity
      const impact = await analyzePageDeletionImpact(perfClient, target, cascade);
      return impact;
    }
    case 'block': {
      // Delegate to Blocks entity
      const impact = await analyzeBlockDeletionImpact(perfClient, target, cascade);
      return impact;
    }
    case 'template':
      return await analyzeTemplateImpact(perfClient, target, cascade);
    case 'properties':
      return await analyzePropertyImpact(perfClient, target, cascade);
    case 'relations':
      return await analyzeRelationImpact(perfClient, target, cascade);
    case 'tasks':
      return await analyzeTaskImpact(perfClient, target, cascade);
    default:
      throw new Error(`Unsupported deletion type: ${type}`);
  }
}

// Page and Block impact analysis moved to their respective entities

// Block impact analysis moved to Blocks entity

/**
 * Analyze template deletion impact
 */
async function analyzeTemplateImpact(
  perfClient: PerformanceAwareLogseqClient,
  templateName: string,
  _cascade: boolean
): Promise<ItemImpact> {
  
  const impact = {
    title: templateName,
    dependencies: [] as string[],
    cascaded_items: [] as Array<{ id: string; type: string; reason: string }>,
    orphaned_references: [] as string[],
    impact_score: 2 // Templates are more important
  };

  // Find template usage
  const usage = await findTemplateUsage(perfClient.underlyingClient, templateName);
  impact.orphaned_references.push(...usage);
  impact.impact_score += usage.length * 1.0; // Template usage has high impact

  return impact;
}

/**
 * Analyze property deletion impact using Properties entity
 */
async function analyzePropertyImpact(
  perfClient: PerformanceAwareLogseqClient,
  target: string,
  _cascade: boolean
): Promise<ItemImpact> {
  
  try {
    // Use Properties entity to get all properties for analysis
    const properties = await getAllProperties(perfClient, target);
    const propertyCount = Object.keys(properties).length;
    
    return {
      title: `Properties of ${target} (${propertyCount} properties)`,
      dependencies: [],
      cascaded_items: [],
      orphaned_references: [],
      impact_score: Math.min(propertyCount * 0.1, 2.0) // Scale based on property count, capped at 2.0
    };
  } catch (error) {
    logger.warn({ target, error }, 'Failed to analyze properties for impact assessment');
    return {
      title: `Properties of ${target}`,
      dependencies: [],
      cascaded_items: [],
      orphaned_references: [],
      impact_score: 0.5 // Default fallback impact
    };
  }
}

/**
 * Analyze relation deletion impact using Relations entity
 */
async function analyzeRelationImpact(
  perfClient: PerformanceAwareLogseqClient,
  target: string,
  _cascade: boolean
): Promise<ItemImpact> {
  
  try {
    // Use Relations entity to analyze current relations
    const relationAnalysis = await analyzeEntityRelations(perfClient, target, 'page');
    const relationCount = relationAnalysis.relations.length;
    
    // Extract references that would be orphaned
    const orphanedRefs = relationAnalysis.relations
      .filter(rel => rel.direction === 'outgoing')
      .map(rel => rel.targetId);
    
    return {
      title: `Relations of ${target} (${relationCount} relations)`,
      dependencies: [],
      cascaded_items: [],
      orphaned_references: orphanedRefs,
      impact_score: Math.min(relationCount * 0.2, 3.0) // Scale based on relation count, capped at 3.0
    };
  } catch (error) {
    logger.warn({ target, error }, 'Failed to analyze relations for impact assessment');
    return {
      title: `Relations of ${target}`,
      dependencies: [],
      cascaded_items: [],
      orphaned_references: [],
      impact_score: 0.5 // Default fallback impact
    };
  }
}

/**
 * Analyze task deletion impact
 */
async function analyzeTaskImpact(
  perfClient: PerformanceAwareLogseqClient,
  target: string,
  _cascade: boolean
): Promise<ItemImpact> {
  
  return {
    title: `Task ${target}`,
    dependencies: [],
    cascaded_items: [],
    orphaned_references: [],
    impact_score: 0.8 // Tasks have moderate impact
  };
}

/**
 * Execute deletion with safety controls
 */
export async function executeDelete(
  perfClient: PerformanceAwareLogseqClient,
  params: DeleteParams,
  impact: DeletionImpact
): Promise<ToolResult> {
  
  const targets = Array.isArray(params.target) ? params.target : [params.target];
  const deletedItems: string[] = [];
  const failures: Array<{ target: string; error: string }> = [];

  // Check operation limits
  const totalOps = impact.items_to_delete.length + impact.cascaded_items.length;
  const maxOps = params.control?.maxOps || 100;
  
  if (totalOps > maxOps) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          error: {
            code: 'LIMIT_EXCEEDED',
            message: `Operation would exceed maximum limit (${totalOps} > ${maxOps})`,
            hint: 'Reduce the number of items or increase control.maxOps'
          }
        }, null, 2)
      }]
    };
  }

  // In simulation mode, skip actual deletion
  if (params.simulate) {
    logger.info('Simulation mode - skipping actual deletion');
    deletedItems.push(...targets);
  } else {
    for (const target of targets) {
      try {
        if (params.softDelete) {
          await performSoftDelete(perfClient, params.type, target);
        } else {
          await performHardDelete(perfClient, params.type, target);
        }
        
        deletedItems.push(target);
        
        // Invalidate cache after deletion
        if (params.type === 'page') {
          perfClient.invalidateCache('page', target);
        } else if (params.type === 'block') {
          perfClient.invalidateCache('block', target);
        }
        
      } catch (error) {
        logger.error({ target, error }, 'Failed to delete item');
        failures.push({ 
          target, 
          error: String(error) 
        });
      }
    }
  }

  // Handle cascaded deletions if enabled
  if (params.cascade) {
    if (params.simulate) {
      logger.info('Simulation mode - skipping cascaded deletions');
      deletedItems.push(...impact.cascaded_items.map(item => item.id));
    } else {
      for (const cascaded of impact.cascaded_items) {
        try {
          if (params.softDelete) {
            await performSoftDelete(perfClient, cascaded.type as ContentType, cascaded.id);
          } else {
            await performHardDelete(perfClient, cascaded.type as ContentType, cascaded.id);
          }
          deletedItems.push(cascaded.id);
        } catch (error) {
          logger.warn({ cascaded, error }, 'Failed to delete cascaded item');
          failures.push({ 
            target: cascaded.id, 
            error: String(error) 
          });
        }
      }
    }
  }

  if (failures.length > 0) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          error: {
            code: 'INTERNAL',
            message: 'Deletion failed for some items',
            details: failures
          }
        }, null, 2)
      }]
    };
  }

  const response = {
    successful: true,
    type: params.type,
    target: params.target,
    impact: {
      items_deleted: impact.items_to_delete.length,
      cascaded_deletions: impact.cascaded_items.length,
      orphaned_references: impact.orphaned_references,
      soft_deleted: params.softDelete || false
    },
    simulation: params.simulate || false
  };

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(response, null, 2)
    }]
  };
}

/**
 * Perform soft delete (move to trash/archive)
 */
async function performSoftDelete(perfClient: PerformanceAwareLogseqClient, type: ContentType, target: string): Promise<void> {
  logger.info({ type, target }, 'Performing soft delete - delegating to entities');
  
  switch (type) {
    case 'page': {
      // Delegate to Pages entity for soft delete
      const { archivePage } = await import('../../entities/pages/operations.js');
      await archivePage(perfClient.underlyingClient, target);
      break;
    }
    case 'block': {
      // Delegate to Blocks entity for soft delete  
      const { archiveBlock } = await import('../../entities/blocks/operations.js');
      await archiveBlock(perfClient.underlyingClient, target);
      break;
    }
    default:
      logger.warn({ type, target }, 'Soft delete not implemented for this type');
  }
}

/**
 * Perform hard delete (permanent removal)
 */
async function performHardDelete(perfClient: PerformanceAwareLogseqClient, type: ContentType, target: string): Promise<void> {
  logger.info({ type, target }, 'Performing hard delete - delegating to entities');
  
  switch (type) {
    case 'page':
      // Delegate to Pages entity
      await deletePage(perfClient.underlyingClient, target);
      break;
    case 'block':
      // Delegate to Blocks entity
      await deleteBlock(perfClient.underlyingClient, target);
      break;
    case 'template':
      // Template is a page, so delegate to Pages entity
      await deletePage(perfClient.underlyingClient, target);
      break;
    case 'properties': {
      // Delegate to Properties entity
      const properties = await getAllProperties(perfClient, target);
      for (const key of Object.keys(properties)) {
        await removeProperty(perfClient, target, key);
      }
      break;
    }
    default:
      throw new Error(`Hard delete not implemented for type: ${type}`);
  }
}

/**
 * Helper functions
 */


async function findTemplateUsage(_client: LogseqClient, _templateName: string): Promise<string[]> {
  // TODO: Implement template usage discovery using Relations entity
  // For now, return empty array until template tracking is implemented
  return [];
}
