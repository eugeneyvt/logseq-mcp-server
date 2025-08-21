// Export all search-related functionality
export { createSearchHandlers } from './search-handlers.js';
export { executeBasicSearch } from './basic-search.js';
export { executeTemplateSearch } from './template-search.js';
export { executePropertySearch } from './property-search.js';
export { executeAdvancedSearch } from './advanced-search.js';
export { executeGeneralSearch } from './general-search.js';

// Export utilities
export {
  extractTemplatePlaceholders,
  checkBlockForPageReference,
  findPageReferences,
} from './search-utils.js';
export { parseDateQuery, parseLogseqDate, isDateLike } from './date-utils.js';
export { containsCombinedFilters, processCombinedFilters } from './filter-engine.js';
