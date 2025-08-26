/**
 * Relations Entity Operations
 * CRUD operations and analysis for relationship management
 */

import type { PerformanceAwareLogseqClient } from '../../adapters/client.js';
import { logger } from '../../utils/system/logger.js';
import type { 
  Relation, 
  RelationCollection, 
  RelationAnalysis, 
  RelationType,
} from './core.js';
import { 
  extractPageReferences, 
  extractBlockReferences, 
  extractTagReferences,
  createRelationFromContent,
  calculateConnectionStrength,
  generateRelationId
} from './core.js';
import { SecureValidationHelpers } from '../../utils/validation.js';
import type { EditParams } from '../../validation/schemas.js';

/**
 * Analyze relations for a specific entity
 */
export async function analyzeEntityRelations(
  client: PerformanceAwareLogseqClient,
  entityId: string,
  entityType: 'page' | 'block' = 'page',
  options?: { limit?: number; depth?: number; scope?: 'outgoing' | 'incoming' | 'both' }
): Promise<RelationCollection> {
  logger.debug({ entityId, entityType }, 'Starting relation analysis');
  
  try {
    const limit = options?.limit ?? 500;
    const scope = options?.scope ?? 'both';
    let entity;
    let content = '';
    
    if (entityType === 'page') {
      entity = await client.getPageCached(entityId);
      if (!entity) {
        throw new Error(`Page not found: ${entityId}`);
      }
      
      // Get page content by getting all blocks
      const blocks = await client.getPageBlocksTreeCached(entityId);
      content = blocks?.map(block => block.content || '').join(' ') || '';
    } else {
      entity = await client.getBlockCached(entityId);
      if (!entity) {
        throw new Error(`Block not found: ${entityId}`);
      }
      content = entity.content || '';
    }
    
    const relations: Relation[] = [];
    let truncated = false;
    
    // Extract page references
    if (scope !== 'incoming') {
      const pageRefs = extractPageReferences(content);
      for (const pageRef of pageRefs) {
        if (relations.length >= limit) { truncated = true; break; }
        const relation = createRelationFromContent(entityId, entityType, content, pageRef, 'reference');
        relations.push(relation);
      }
    }
    
    // Extract block references
    if (!truncated && scope !== 'incoming') {
      const blockRefs = extractBlockReferences(content);
      for (const blockRef of blockRefs) {
        if (relations.length >= limit) { truncated = true; break; }
        const relation = createRelationFromContent(entityId, entityType, content, blockRef, 'block-ref');
        relation.targetType = 'block';
        relations.push(relation);
      }
    }
    
    // Extract tag references
    if (!truncated && scope !== 'incoming') {
      const tagRefs = extractTagReferences(content);
      for (const tagRef of tagRefs) {
        if (relations.length >= limit) { truncated = true; break; }
        const relation = createRelationFromContent(entityId, entityType, content, tagRef, 'tag');
        relations.push(relation);
      }
    }
    
    // For pages, check namespace relationships
    if (!truncated && entityType === 'page' && entityId.includes('/')) {
      const namespaceParts = entityId.split('/');
      for (let i = 0; i < namespaceParts.length - 1; i++) {
        if (relations.length >= limit) { truncated = true; break; }
        const parentNamespace = namespaceParts.slice(0, i + 1).join('/');
        const relation: Relation = {
          id: generateRelationId(entityId, parentNamespace, 'namespace'),
          type: 'namespace',
          direction: 'outgoing',
          sourceId: entityId,
          targetId: parentNamespace,
          sourceType: 'page',
          targetType: 'page',
          createdAt: Date.now()
        };
        relations.push(relation);
      }
    }
    
    logger.debug({ entityId, relationCount: relations.length }, 'Relation analysis completed');
    
    return {
      entityId,
      entityType,
      relations,
      lastAnalyzed: Date.now(),
      totalCount: relations.length,
      truncated,
      limit
    };
    
  } catch (error) {
    logger.error({ error, entityId }, 'Failed to analyze entity relations');
    throw error;
  }
}

/**
 * Find backlinks for an entity
 */
export async function findEntityBacklinks(
  client: PerformanceAwareLogseqClient,
  entityId: string,
  entityType: 'page' | 'block' = 'page',
  options?: { limit?: number }
): Promise<Relation[]> {
  logger.debug({ entityId, entityType }, 'Finding backlinks');
  
  try {
    const backlinks: Relation[] = [];
    const limit = options?.limit ?? 500;
    
    if (entityType === 'page') {
      // For pages, we need to search all other pages and blocks for references
      // This is a simplified implementation - in reality, Logseq maintains an index
      
      const allPages = await client.getAllPagesCached();
      
      for (const page of allPages) {
        if (page.name === entityId) {continue;} // Skip self
        
        const pageBlocks = await client.getPageBlocksTreeCached(page.name);
        const allContent = pageBlocks?.map(b => b.content || '').join(' ') || '';
        
        const pageRefs = extractPageReferences(allContent);
        if (pageRefs.includes(entityId)) {
          if (backlinks.length >= limit) { break; }
          const relation: Relation = {
            id: generateRelationId(page.name, entityId, 'backlink'),
            type: 'backlink',
            direction: 'incoming',
            sourceId: page.name,
            targetId: entityId,
            sourceType: 'page',
            targetType: 'page',
            context: allContent.slice(0, 200), // First 200 chars as context
            createdAt: Date.now()
          };
          backlinks.push(relation);
        }
      }
    }
    
    logger.debug({ entityId, backlinkCount: backlinks.length }, 'Backlink analysis completed');
    return backlinks;
    
  } catch (error) {
    logger.error({ error, entityId }, 'Failed to find backlinks');
    throw error;
  }
}

/**
 * Create a custom relation between two entities
 */
export async function createCustomRelation(
  client: PerformanceAwareLogseqClient,
  sourceId: string,
  targetId: string,
  relationType: RelationType = 'custom',
  metadata?: Record<string, unknown>
): Promise<Relation> {
  logger.debug({ sourceId, targetId, relationType }, 'Creating custom relation');
  
  try {
    // Verify both entities exist
    const source = await client.getPageCached(sourceId) || await client.getBlockCached(sourceId);
    const target = await client.getPageCached(targetId) || await client.getBlockCached(targetId);
    
    if (!source) {
      throw new Error(`Source entity not found: ${sourceId}`);
    }
    if (!target) {
      throw new Error(`Target entity not found: ${targetId}`);
    }
    
    const relation: Relation = {
      id: generateRelationId(sourceId, targetId, relationType),
      type: relationType,
      direction: 'outgoing',
      sourceId,
      targetId,
      sourceType: 'uuid' in source ? 'block' : 'page',
      targetType: 'uuid' in target ? 'block' : 'page',
      createdAt: Date.now(),
      metadata
    };
    
    // In a real implementation, this would be stored in a relations index
    // For now, we just return the created relation
    
    logger.debug({ relationId: relation.id }, 'Custom relation created');
    return relation;
    
  } catch (error) {
    logger.error({ error, sourceId, targetId }, 'Failed to create custom relation');
    throw error;
  }
}

/**
 * Remove a relation
 */
export async function removeRelation(
  client: PerformanceAwareLogseqClient,
  relationId: string
): Promise<boolean> {
  logger.debug({ relationId }, 'Removing relation');
  
  try {
    // In a real implementation, this would remove from relations index
    // For now, we just log the operation
    
    logger.debug({ relationId }, 'Relation removed');
    return true;
    
  } catch (error) {
    logger.error({ error, relationId }, 'Failed to remove relation');
    throw error;
  }
}

/**
 * Get comprehensive relation analysis for an entity
 */
export async function getRelationAnalysis(
  client: PerformanceAwareLogseqClient,
  entityId: string,
  entityType: 'page' | 'block' = 'page'
): Promise<RelationAnalysis> {
  logger.debug({ entityId, entityType }, 'Starting comprehensive relation analysis');
  
  try {
    // Get outgoing relations
    const outgoingRelations = await analyzeEntityRelations(client, entityId, entityType);
    
    // Get incoming relations (backlinks)
    const incomingRelations = await findEntityBacklinks(client, entityId, entityType);
    
    // Combine all relations
    const allRelations = [...outgoingRelations.relations, ...incomingRelations];
    
    // Count by type
    const relationTypes: Record<RelationType, number> = {
      reference: 0,
      backlink: 0,
      tag: 0,
      'block-ref': 0,
      'parent-child': 0,
      namespace: 0,
      alias: 0,
      custom: 0
    };
    
    for (const relation of allRelations) {
      relationTypes[relation.type] = (relationTypes[relation.type] || 0) + 1;
    }
    
    // Calculate strongest connections
    const connectionMap = new Map<string, Relation[]>();
    for (const relation of allRelations) {
      const targetId = relation.direction === 'outgoing' ? relation.targetId : relation.sourceId;
      if (!connectionMap.has(targetId)) {
        connectionMap.set(targetId, []);
      }
      connectionMap.get(targetId)!.push(relation);
    }
    
    const strongestConnections = Array.from(connectionMap.entries())
      .map(([targetId, relations]) => ({
        targetId,
        connectionStrength: calculateConnectionStrength(relations),
        relationTypes: [...new Set(relations.map(r => r.type))]
      }))
      .sort((a, b) => b.connectionStrength - a.connectionStrength)
      .slice(0, 10); // Top 10 connections
    
    const analysis: RelationAnalysis = {
      entityId,
      outgoingCount: outgoingRelations.relations.length,
      incomingCount: incomingRelations.length,
      relationTypes,
      strongestConnections
    };
    
    logger.debug({ 
      entityId, 
      totalRelations: allRelations.length,
      strongestConnectionsCount: strongestConnections.length 
    }, 'Relation analysis completed');
    
    return analysis;
    
  } catch (error) {
    logger.error({ error, entityId }, 'Failed to get relation analysis');
    throw error;
  }
}

/**
 * Resolve a source entity (page name or block UUID) to a block UUID for content updates
 */
async function resolveSourceUuid(
  perfClient: PerformanceAwareLogseqClient,
  sourceEntity: string
): Promise<string> {
  // If already looks like a UUID
  if (sourceEntity.length >= 32 && sourceEntity.includes('-')) {
    return sourceEntity;
  }
  // Page name: get first block uuid
  const page = await perfClient.getPageCached(sourceEntity) || await perfClient.underlyingClient.getPage(sourceEntity);
  if (!page) {
    throw new Error(`Page not found: ${sourceEntity}`);
  }
  const blocks = await perfClient.getPageBlocksTreeCached(sourceEntity) || await perfClient.underlyingClient.getPageBlocksTree(sourceEntity);
  if (!Array.isArray(blocks) || blocks.length === 0) {
    throw new Error(`Page has no blocks: ${sourceEntity}`);
  }
  const first = blocks[0] as unknown as Record<string, unknown>;
  const uuid = typeof (first as { uuid?: unknown }).uuid === 'string' ? String((first as { uuid?: unknown }).uuid) : undefined;
  if (!uuid) {
    throw new Error('Failed to resolve source to block uuid');
  }
  return uuid;
}

/**
 * Create relation and append visible link to source content
 */
export async function createRelationFromParams(
  perfClient: PerformanceAwareLogseqClient,
  params: EditParams
): Promise<unknown> {
  // Build [source, target]
  const targets = Array.isArray(params.target) ? params.target.slice() : [params.target];
  if (targets.length < 2) {
    if (!params.content) {
      return { error: { code: 'INVALID_ARGUMENT', message: 'Relations require [source,target] or target + content parameters' } };
    }
    targets.push(String(params.content));
  }
  if (targets.length !== 2) {
    return { error: { code: 'INVALID_ARGUMENT', message: 'Relations require exactly two entities: [source, target]' } };
  }

  const [sourceEntity, targetEntity] = targets;
  const sourceUuid = await resolveSourceUuid(perfClient, sourceEntity);

  // Sanitize link context
  let linkContext = params.linkContext ? String(params.linkContext) : '';
  if (linkContext) {
    const v = SecureValidationHelpers.validateAndSanitizeBlockContent(linkContext, true);
    linkContext = v.sanitizedContent || linkContext;
  }

  // Create metadata relation (non-persistent store for now)
  const relation = await createCustomRelation(perfClient, sourceUuid, targetEntity, 'custom', {
    context: linkContext,
    createdVia: 'edit-tool',
    originalSource: sourceEntity
  });

  // Also append visible link
  const currentBlock = await perfClient.underlyingClient.getBlock(sourceUuid);
  const currentContent = (currentBlock && typeof currentBlock === 'object' && 'content' in currentBlock)
    ? String((currentBlock as { content: unknown }).content) : '';
  const linkPattern = new RegExp(`\\[\\[${String(targetEntity).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\]`, 'i');
  if (!linkPattern.test(currentContent)) {
    const linkText = linkContext ? `${linkContext} [[${targetEntity}]]` : `[[${targetEntity}]]`;
    let newContent = currentContent ? `${currentContent}\n${linkText}` : linkText;
    const v2 = SecureValidationHelpers.validateAndSanitizeBlockContent(newContent, true);
    newContent = v2.sanitizedContent || newContent;
    await perfClient.underlyingClient.callApi('logseq.Editor.updateBlock', [sourceUuid, newContent]);
  }

  return { source: sourceEntity, target: targetEntity, relation_id: relation.id, link_context: linkContext, created: true };
}

/**
 * Remove relation and visible link from source content
 */
export async function removeRelationFromParams(
  perfClient: PerformanceAwareLogseqClient,
  params: EditParams
): Promise<unknown> {
  if (!params.content) {
    return { error: { code: 'INVALID_ARGUMENT', message: 'Target page/block required for relation removal' } };
  }
  const sourceTarget = Array.isArray(params.target) ? params.target[0] : params.target;
  const sourceUuid = await resolveSourceUuid(perfClient, sourceTarget);
  const targetPage = String(params.content);

  // Remove relation record (no-op storage currently)
  const relationId = `${sourceUuid}-custom-${targetPage}`;
  await removeRelation(perfClient, relationId);

  // Remove visible link
  const currentBlock = await perfClient.underlyingClient.getBlock(sourceUuid);
  const currentContent = (currentBlock && typeof currentBlock === 'object' && 'content' in currentBlock)
    ? String((currentBlock as { content: unknown }).content) : '';
  const targetStr = targetPage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const linkPatterns = [
    new RegExp(`\\[\\[${targetStr}\\]\\]`, 'g'),
    new RegExp(`\\(\\(${targetStr}\\)\\)`, 'g'),
    new RegExp(`\\[\\[[\t\r\n ]*${targetStr}[\t\r\n ]*[|][^\\]]+]]`, 'gi')
  ];
  let newContent = currentContent;
  for (const pattern of linkPatterns) {
    newContent = newContent.replace(pattern, '').replace(/\n\s*\n/g, '\n').trim();
  }
  await perfClient.underlyingClient.callApi('logseq.Editor.updateBlock', [sourceUuid, newContent]);
  return { source: params.target, target: targetPage, relation_id: relationId, removed: true };
}

/**
 * Provide relation update suggestions (analyze and list current)
 */
export async function updateRelationFromParams(
  perfClient: PerformanceAwareLogseqClient,
  params: EditParams
): Promise<unknown> {
  const sourceTarget = Array.isArray(params.target) ? params.target[0] : params.target;
  const sourceUuid = await resolveSourceUuid(perfClient, sourceTarget);
  const relations = await analyzeEntityRelations(perfClient, sourceUuid, 'block');
  return {
    source: params.target,
    resolved_source: sourceUuid,
    current_relations: relations.relations.map(r => ({ id: r.id, type: r.type, target: r.targetId })),
    suggestion: 'Use remove + create operations for specific relation updates'
  };
}
