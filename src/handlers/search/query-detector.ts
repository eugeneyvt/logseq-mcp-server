import { containsCombinedFilters } from './filter-engine.js';

export type SearchType =
  | 'wildcard'
  | 'empty'
  | 'template'
  | 'property'
  | 'backlinks'
  | 'references'
  | 'date'
  | 'combined'
  | 'general';

/**
 * Detects the appropriate search type based on query pattern
 */
export function detectSearchType(query: string): SearchType {
  const trimmedQuery = query.trim();

  // Check for wildcard searches
  if (trimmedQuery === '*' || trimmedQuery === 'all' || trimmedQuery === 'everything') {
    return 'wildcard';
  }

  // Check for empty page searches
  if (
    trimmedQuery.toLowerCase().includes('empty') ||
    trimmedQuery.toLowerCase().includes('no content') ||
    trimmedQuery.toLowerCase().includes('blank')
  ) {
    return 'empty';
  }

  // Check for template searches
  if (
    trimmedQuery === 'templates:*' ||
    trimmedQuery === 'templates:all' ||
    trimmedQuery.startsWith('template:')
  ) {
    return 'template';
  }

  // Check for property searches
  if (trimmedQuery.startsWith('property:') && trimmedQuery.includes('=')) {
    return 'property';
  }

  if (
    trimmedQuery === 'properties:*' ||
    trimmedQuery === 'properties:all' ||
    trimmedQuery.startsWith('properties:page=')
  ) {
    return 'property';
  }

  // Check for backlinks and references
  if (trimmedQuery.startsWith('backlinks:"') && trimmedQuery.includes('"')) {
    return 'backlinks';
  }

  if (trimmedQuery.startsWith('references:"') && trimmedQuery.includes('"')) {
    return 'references';
  }

  // Check for date searches
  if (trimmedQuery.startsWith('date:')) {
    return 'date';
  }

  // Check for combined filters
  if (containsCombinedFilters(trimmedQuery)) {
    return 'combined';
  }

  // Check for page-specific searches
  if (trimmedQuery.startsWith('page:"') && trimmedQuery.includes('"')) {
    return 'general';
  }

  // Default to general search
  return 'general';
}

/**
 * Get search priority for ordering results (lower number = higher priority)
 */
export function getSearchPriority(searchType: SearchType): number {
  switch (searchType) {
    case 'wildcard':
    case 'empty':
      return 1; // Highest priority - specific patterns
    case 'property':
    case 'template':
      return 2; // High priority - structured data
    case 'date':
    case 'backlinks':
    case 'references':
      return 3; // Medium priority - relationship searches
    case 'combined':
      return 4; // Lower priority - complex queries
    case 'general':
      return 5; // Lowest priority - fallback
    default:
      return 5;
  }
}
