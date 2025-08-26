/**
 * Relations Entity Core
 * Core data structures and utilities for relationship management
 */


/**
 * Types of relationships in Logseq
 */
export type RelationType = 
  | 'reference'      // [[Page]] reference
  | 'backlink'       // Incoming reference
  | 'tag'           // #tag reference  
  | 'block-ref'     // ((block-uuid)) reference
  | 'parent-child'  // Hierarchical relationship
  | 'namespace'     // Page namespace relationship
  | 'alias'         // Page alias relationship
  | 'custom';       // User-defined relationship

/**
 * Direction of relationship
 */
export type RelationDirection = 'outgoing' | 'incoming' | 'bidirectional';

/**
 * Single relationship instance
 */
export interface Relation {
  id: string;
  type: RelationType;
  direction: RelationDirection;
  sourceId: string;
  targetId: string;
  sourceType: 'page' | 'block';
  targetType: 'page' | 'block';
  context?: string;           // Surrounding text context
  createdAt?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Collection of relationships for an entity
 */
export interface RelationCollection {
  entityId: string;
  entityType: 'page' | 'block';
  relations: Relation[];
  lastAnalyzed?: number;
  totalCount: number;
  truncated?: boolean;
  limit?: number;
}

/**
 * Relationship analysis result
 */
export interface RelationAnalysis {
  entityId: string;
  outgoingCount: number;
  incomingCount: number;
  relationTypes: Record<RelationType, number>;
  strongestConnections: Array<{
    targetId: string;
    connectionStrength: number;
    relationTypes: RelationType[];
  }>;
}

/**
 * Extract page references from text content
 */
export function extractPageReferences(content: string): string[] {
  const references: string[] = [];
  
  // Match [[Page Name]] references
  const pageRefMatches = content.matchAll(/\[\[([^\]]+)\]\]/g);
  for (const match of pageRefMatches) {
    const pageName = match[1].trim();
    if (pageName && !references.includes(pageName)) {
      references.push(pageName);
    }
  }
  
  return references;
}

/**
 * Extract block references from text content
 */
export function extractBlockReferences(content: string): string[] {
  const references: string[] = [];
  
  // Match ((block-uuid)) references
  const blockRefMatches = content.matchAll(/\(\(([a-f0-9-]{36})\)\)/g);
  for (const match of blockRefMatches) {
    const blockUuid = match[1];
    if (blockUuid && !references.includes(blockUuid)) {
      references.push(blockUuid);
    }
  }
  
  return references;
}

/**
 * Extract tag references from text content
 */
export function extractTagReferences(content: string): string[] {
  const references: string[] = [];
  
  // Match #tag references (simple version)
  const tagMatches = content.matchAll(/#([a-zA-Z][a-zA-Z0-9_-]*)/g);
  for (const match of tagMatches) {
    const tag = match[1];
    if (tag && !references.includes(tag)) {
      references.push(tag);
    }
  }
  
  return references;
}

/**
 * Generate relation ID
 */
export function generateRelationId(
  sourceId: string, 
  targetId: string, 
  type: RelationType
): string {
  return `${sourceId}-${type}-${targetId}`;
}

/**
 * Calculate connection strength between entities
 */
export function calculateConnectionStrength(relations: Relation[]): number {
  if (relations.length === 0) {return 0;}
  
  // Weight different relation types
  const weights: Record<RelationType, number> = {
    reference: 1.0,
    backlink: 0.8,
    tag: 0.6,
    'block-ref': 1.2,
    'parent-child': 1.5,
    namespace: 0.9,
    alias: 1.1,
    custom: 0.7
  };
  
  let totalWeight = 0;
  for (const relation of relations) {
    totalWeight += weights[relation.type] || 0.5;
  }
  
  // Normalize by logarithmic scale to prevent overwhelming scores
  return Math.log(1 + totalWeight) / Math.log(2);
}

/**
 * Check if relation creates a cycle
 */
export function wouldCreateCycle(
  relations: Relation[],
  newSourceId: string,
  newTargetId: string
): boolean {
  if (newSourceId === newTargetId) {
    return true; // Direct self-reference
  }
  
  // Build adjacency map
  const adjacency = new Map<string, Set<string>>();
  
  for (const relation of relations) {
    if (relation.direction === 'outgoing' || relation.direction === 'bidirectional') {
      if (!adjacency.has(relation.sourceId)) {
        adjacency.set(relation.sourceId, new Set());
      }
      adjacency.get(relation.sourceId)!.add(relation.targetId);
    }
    
    if (relation.direction === 'incoming' || relation.direction === 'bidirectional') {
      if (!adjacency.has(relation.targetId)) {
        adjacency.set(relation.targetId, new Set());
      }
      adjacency.get(relation.targetId)!.add(relation.sourceId);
    }
  }
  
  // DFS to check for path from newTargetId to newSourceId
  const visited = new Set<string>();
  
  function hasPath(from: string, to: string): boolean {
    if (from === to) {return true;}
    if (visited.has(from)) {return false;}
    
    visited.add(from);
    const neighbors = adjacency.get(from);
    
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (hasPath(neighbor, to)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  return hasPath(newTargetId, newSourceId);
}

/**
 * Create relation from content analysis
 */
export function createRelationFromContent(
  entityId: string,
  entityType: 'page' | 'block',
  content: string,
  targetId: string,
  relationType: RelationType
): Relation {
  // Extract context around the reference
  const contextLength = 100;
  let context = content;
  
  // Try to find the reference in content and extract surrounding context
  const patterns = {
    reference: new RegExp(`\\[\\[${targetId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\]`),
    'block-ref': new RegExp(`\\(\\(${targetId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)\\)`),
    tag: new RegExp(`#${targetId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
  };
  
  const pattern = patterns[relationType as keyof typeof patterns];
  if (pattern) {
    const match = pattern.exec(content);
    if (match) {
      const start = Math.max(0, match.index - contextLength / 2);
      const end = Math.min(content.length, match.index + match[0].length + contextLength / 2);
      context = content.slice(start, end);
    }
  }
  
  return {
    id: generateRelationId(entityId, targetId, relationType),
    type: relationType,
    direction: 'outgoing',
    sourceId: entityId,
    targetId,
    sourceType: entityType,
    targetType: relationType === 'tag' ? 'page' : 'page', // Assume page for now
    context: context.length < content.length ? context : undefined,
    createdAt: Date.now()
  };
}
