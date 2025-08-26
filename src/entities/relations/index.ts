/**
 * Relations Entity Module
 * Complete relationship management functionality
 */

// Core types and utilities
export type {
  RelationType,
  RelationDirection,
  Relation,
  RelationCollection,
  RelationAnalysis
} from './core.js';

export {
  extractPageReferences,
  extractBlockReferences,
  extractTagReferences,
  generateRelationId,
  calculateConnectionStrength,
  wouldCreateCycle,
  createRelationFromContent
} from './core.js';

// Operations
export {
  analyzeEntityRelations,
  findEntityBacklinks,
  createCustomRelation,
  removeRelation,
  getRelationAnalysis
} from './operations.js';