/**
 * Consolidated schema exports for backward compatibility
 * 
 * This file re-exports all schemas from the modular schema files
 * to maintain backward compatibility while keeping the code organized.
 */

// Base types and interfaces
export * from './base-types.js';

// Validation schemas
export * from './validation-schemas.js';

// Domain-specific schemas
export * from './page-schemas.js';
export * from './block-schemas.js';
export * from './query-schemas.js';
export * from './graph-schemas.js';