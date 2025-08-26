/**
 * Get Tool Retrieval Module
 * Thin orchestration layer that delegates to entity modules
 */

import type { PerformanceAwareLogseqClient } from "../../adapters/client.js";
import { logger } from '../../utils/system/logger.js';
import type { GetParams } from '../../validation/schemas.js';

// Entity operations - business logic lives here
import { getPages as getMultiplePages, type PageRetrievalOptions } from '../../entities/pages/retrieval.js';
import { getBlocks as getMultipleBlocks, type BlockRetrievalOptions } from '../../entities/blocks/retrieval.js';
import { getAllProperties } from '../../entities/properties/operations.js';
import { analyzeEntityRelations } from '../../entities/relations/operations.js';
import { collectSystemInfo } from '../../entities/system/info.js';

// Formatting utilities (will be deprecated)
import { 
  formatBlocks, 
  extractTemplatePlaceholders,
  getPageTasks,
  isTaskBlock,
  formatTaskBlock,
  getTaskStateCounts
} from './formatting.js';

/**
 * Safely format date values, handling invalid dates
 */
function formatDateSafely(dateValue: unknown): string | undefined {
  if (!dateValue) {
    return undefined;
  }
  
  try {
    const date = new Date(dateValue as string | number);
    if (isNaN(date.getTime())) {
      return undefined;
    }
    return date.toISOString();
  } catch {
    return undefined;
  }
}

/**
 * Get page(s) - delegates to Pages entity
 */
export async function getPages(perfClient: PerformanceAwareLogseqClient, params: GetParams): Promise<{ data: unknown; truncated?: boolean }> {
  const targets = Array.isArray(params.target) ? params.target : [params.target];
  
  // Convert GetParams to PageRetrievalOptions
  const options: PageRetrievalOptions = {
    includeChildren: params.include?.children,
    includeBacklinks: params.include?.backlinks,
    includeContent: params.include?.content,
    includeProperties: params.include?.properties,
    format: params.format,
    depth: params.depth,
    previewLength: params.preview_length
  };
  
  // Delegate to Pages entity - all business logic is there
  const result = await getMultiplePages(perfClient, targets, options);
  
  return {
    data: Array.isArray(params.target) ? result.data : result.data[0],
    truncated: result.truncated
  };
}

/**
 * Get block(s) - delegates to Blocks entity
 */
export async function getBlocks(perfClient: PerformanceAwareLogseqClient, params: GetParams): Promise<{ data: unknown; truncated?: boolean }> {
  const targets = Array.isArray(params.target) ? params.target : [params.target];
  
  // Convert GetParams to BlockRetrievalOptions
  const options: BlockRetrievalOptions = {
    includeChildren: params.include?.children,
    includeProperties: params.include?.properties,
    format: params.format,
    depth: params.depth,
    previewLength: params.preview_length
  };
  
  // Delegate to Blocks entity - all business logic is there
  const result = await getMultipleBlocks(perfClient, targets, options);
  
  return {
    data: Array.isArray(params.target) ? result.data : result.data[0],
    truncated: result.truncated
  };
}

/**
 * Get template(s) with placeholder analysis
 */
export async function getTemplates(perfClient: PerformanceAwareLogseqClient, params: GetParams): Promise<{ data: unknown; truncated?: boolean }> {
  const targets = Array.isArray(params.target) ? params.target : [params.target];
  const results = [];
  
  for (const templateName of targets) {
    try {
      // Find template by name
      const allPages = await perfClient.getAllPagesCached();
      const template = allPages.find((p: unknown) => {
        if (!(p && typeof p === 'object' && 'name' in p)) {
          return false;
        }
        const page = p as { name: unknown; properties?: { template?: unknown; 'page-type'?: unknown } };
        const pageName = String(page.name);
        return pageName.toLowerCase() === templateName.toLowerCase() ||
          (pageName.toLowerCase().includes(templateName.toLowerCase()) &&
            (pageName.toLowerCase().includes('template') ||
              page.properties?.template ||
              page.properties?.['page-type'] === 'template'));
      });
      
      if (!template) {
        results.push({
          name: templateName,
          error: 'Template not found',
          not_found: true,
          suggestion: 'Check template name or use Search tool to find available templates'
        });
        continue;
      }
      
      // Get template blocks
      const templateName_actual = (template && typeof template === 'object' && 'name' in template) ? String((template as { name: unknown }).name) : '';
      const templateBlocks = await perfClient.getPageBlocksTreeCached(templateName_actual);
      const contentBlocks = templateBlocks?.filter((block: unknown) => {
        if (!(block && typeof block === 'object' && 'content' in block)) {
          return false;
        }
        const content = String((block as { content: unknown }).content);
        return !content.startsWith('template::');
      }) || [];
      
      // For template consistency: present as single-block content (not individual blocks)
      const templateContent = contentBlocks.map((block: unknown) => {
        if (!(block && typeof block === 'object' && 'content' in block)) {
          return '';
        }
        return String((block as { content: unknown }).content);
      }).join('\n');
      
      const templateData = {
        name: templateName,
        template_page: templateName_actual,
        content: templateContent, // Single unified content instead of blocks array
        is_single_block_template: true, // Indicate this follows single-block standard
        // Only include blocks array if explicitly requested for debugging
        blocks: params.include?.children ? formatBlocks(contentBlocks, params.format || 'tree', params.depth || 2, params.preview_length || 500) : undefined,
        block_count: contentBlocks.length,
        placeholders: extractTemplatePlaceholders(contentBlocks),
        properties: params.include?.properties !== false ? ((template && typeof template === 'object' && 'properties' in template) ? (template as { properties: unknown }).properties || {} : {}) : undefined,
        created: formatDateSafely((template && typeof template === 'object' && 'createdAt' in template) ? (template as { createdAt: unknown }).createdAt : undefined),
        updated: formatDateSafely((template && typeof template === 'object' && 'updatedAt' in template) ? (template as { updatedAt: unknown }).updatedAt : undefined)
      };
      
      results.push(templateData);
      
    } catch (error) {
      logger.error({ error, templateName }, 'Failed to get template');
      results.push({
        name: templateName,
        error: String(error),
        not_found: true
      });
    }
  }
  
  return { 
    data: Array.isArray(params.target) ? results : results[0]
  };
}

/**
 * Get properties - delegates to Properties entity
 */
export async function getProperties(perfClient: PerformanceAwareLogseqClient, params: GetParams): Promise<{ data: unknown; truncated?: boolean }> {
  const targets = Array.isArray(params.target) ? params.target : [params.target];
  const results = [];
  
  for (const target of targets) {
    try {
      // Determine entity type for response formatting
      const entityType = (target.length >= 32 && target.includes('-')) ? 'block' : 'page';
      
      // Delegate to Properties entity for all business logic
      const propertyCollection = await getAllProperties(perfClient, target, entityType);
      
      // Format properties as key-value pairs
      const propertiesObject: Record<string, unknown> = {};
      for (const prop of propertyCollection.properties as Array<{ key: string; value: unknown }>) {
        propertiesObject[prop.key] = prop.value;
      }
      
      results.push({
        target,
        entity_type: entityType,
        entity_id: propertyCollection.entityId,
        properties: propertiesObject,
        property_count: propertyCollection.properties.length,
        property_keys: (propertyCollection.properties as Array<{ key: string; value: unknown }>).map((p) => p.key),
        last_modified: propertyCollection.lastModified
      });
      
    } catch (error) {
      logger.error({ error, target }, 'Failed to get properties');
      results.push({
        target,
        error: String(error),
        not_found: true
      });
    }
  }
  
  return { 
    data: Array.isArray(params.target) ? results : results[0]
  };
}

/**
 * Get relations for page(s) or block(s) using Relations entity
 */
export async function getRelations(perfClient: PerformanceAwareLogseqClient, params: GetParams): Promise<{ data: unknown; truncated?: boolean }> {
  const targets = Array.isArray(params.target) ? params.target : [params.target];
  const results = [];
  
  for (const target of targets) {
    try {
      // Determine entity type (page or block)
      let entityType: 'page' | 'block';
      let entityId = target;
      
      if (target.length >= 32 && target.includes('-')) {
        entityType = 'block';
      } else {
        entityType = 'page';
        // For pages, we need to resolve to the page entity
        const page = await perfClient.getPageCached(target);
        if (!page) {
          results.push({
            target,
            error: 'Page not found',
            not_found: true
          });
          continue;
        }
        entityId = target; // Keep page name as entityId for relations
      }
      
      // Use Relations entity to perform comprehensive analysis
      const relationAnalysis = await analyzeEntityRelations(perfClient, entityId, entityType);
      
      results.push({
        target,
        entity_type: entityType,
        entity_id: entityId,
        relations: relationAnalysis.relations.map(r => ({
          id: r.id,
          type: r.type,
          target: r.targetId,
          source_type: r.sourceType,
          target_type: r.targetType,
          direction: r.direction,
          context: r.context,
          metadata: r.metadata
        })),
        relation_count: relationAnalysis.relations.length,
        total_count: relationAnalysis.totalCount,
        last_analyzed: relationAnalysis.lastAnalyzed
      });
      
    } catch (error) {
      logger.error({ error, target }, 'Failed to get relations using entity module');
      results.push({
        target,
        error: String(error),
        not_found: true
      });
    }
  }
  
  return { 
    data: Array.isArray(params.target) ? results : results[0]
  };
}

/**
 * Get tasks from page(s) or specific task blocks
 */
export async function getTasks(perfClient: PerformanceAwareLogseqClient, params: GetParams): Promise<{ data: unknown; truncated?: boolean }> {
  const targets = Array.isArray(params.target) ? params.target : [params.target];
  const results = [];
  
  for (const target of targets) {
    try {
      let tasks: unknown[] = [];
      
      if (target.length >= 32 && target.includes('-')) {
        // Single block - check if it's a task
        const block = await perfClient.getBlockCached(target);
        if (block && isTaskBlock(block)) {
          tasks = [formatTaskBlock(block)];
        }
      } else {
        // Page - get all tasks from page
        tasks = await getPageTasks(perfClient.underlyingClient, target);
      }
      
      const taskStateCounts = getTaskStateCounts(tasks);
      
      results.push({
        target,
        tasks,
        task_count: tasks.length,
        task_states: taskStateCounts,
        completed_tasks: taskStateCounts.DONE || 0,
        pending_tasks: (taskStateCounts.TODO || 0) + (taskStateCounts.DOING || 0)
      });
      
    } catch (error) {
      logger.error({ error, target }, 'Failed to get tasks');
      results.push({
        target,
        error: String(error),
        not_found: true
      });
    }
  }
  
  return { 
    data: Array.isArray(params.target) ? results : results[0]
  };
}

/**
 * Get system information - delegates to System entity
 */
export async function getSystemInfo(perfClient: PerformanceAwareLogseqClient, _params: GetParams): Promise<{ data: unknown; truncated?: boolean }> {
  try {
    // Delegate to System entity - all business logic is there
    const systemInfo = await collectSystemInfo(perfClient);
    return { data: systemInfo };
  } catch (error) {
    logger.error({ error }, 'Failed to get system info');
    return { 
      data: { 
        error: String(error),
        system_info_available: false 
      } 
    };
  }
}

/**
 * Get graph information - delegates to System entity
 */
export async function getGraphInfo(perfClient: PerformanceAwareLogseqClient, _params: GetParams): Promise<{ data: unknown; truncated?: boolean }> {
  try {
    // Delegate to System entity - all business logic is there
    const systemInfo = await collectSystemInfo(perfClient);
    
    // Tool-specific formatting of system data for graph view
    const graphInfo = {
      nodes: {
        total_pages: systemInfo.graph.totalPages,
        total_blocks: systemInfo.graph.totalBlocks,
        journal_pages: systemInfo.graph.journalPages,
        template_count: systemInfo.graph.templateCount,
        orphaned_pages: systemInfo.graph.orphanedPages
      },
      connections: {
        total_connections: systemInfo.graph.totalConnections,
        avg_blocks_per_page: systemInfo.graph.avgBlocksPerPage,
        graph_density: systemInfo.graph.graphDensity
      },
      health: {
        status: systemInfo.health.status,
        checks: systemInfo.health.checks.length,
        overall_message: systemInfo.health.overallMessage
      },
      performance: {
        response_time: systemInfo.performance.responseTime,
        cache_hit_rate: systemInfo.performance.cacheHitRate,
        operations_per_second: systemInfo.performance.operationsPerSecond,
        error_rate: systemInfo.performance.errorRate
      },
      capabilities: systemInfo.capabilities
    };
    
    return { data: graphInfo };
  } catch (error) {
    logger.error({ error }, 'Failed to get graph info');
    return { 
      data: { 
        error: String(error),
        graph_analysis_available: false 
      } 
    };
  }
}
