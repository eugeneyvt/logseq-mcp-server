/**
 * DEPRECATED: This file is kept for backward compatibility.
 * Please use './client/index.js' instead.
 * 
 * The LogseqClient has been refactored into modular components:
 * - ./client/core-client.ts - Base client setup and connection methods
 * - ./client/page-operations.ts - Page-related operations
 * - ./client/block-operations.ts - Block-related operations
 * - ./client/query-operations.ts - Query and search operations
 * - ./client/index.ts - Unified client interface
 */

// Re-export the client for backward compatibility
export { LogseqClient } from './client/index.js';