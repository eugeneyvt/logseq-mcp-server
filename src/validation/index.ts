/**
 * Validation Module
 * All validation schemas organized by tools and entities
 */

// Tools validation (for MCP operations)
export * as Tools from './tools/index.js';

// Entities validation (for data structures)  
export * as Entities from './entities/index.js';

// Backward compatibility - export main tool schemas directly
export * from './tools/index.js';

// Keep helpers
export * from './helpers.js';