/**
 * Clean schema exports for modular architecture
 * All schemas kept under 250 LOC for maintainability
 */

// Essential types for the modular tools
export * from './types.js';

// Error handling is now consolidated in utils/errors.js

// Tool schemas and configuration
// Note: Tool schemas are now in validation/schemas.ts for better organization
export * from './unified-types.js';
export * from './config.js';