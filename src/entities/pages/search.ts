/**
 * Page Search Operations
 * Focused search functionality for pages
 */

import type { SearchParams } from '../../validation/schemas.js';
import { extractAllTags } from '../tags/extraction.js';

export interface PageSearchResult {
  type: 'page';
  name: string;
  uuid?: string;
  properties: Record<string, unknown>;
  created: string | number | Date | undefined;
  updated: string | number | Date | undefined;
  relevance_score: number;
  tags?: string[];
  backlinks?: number;
}

/**
 * Search pages with filtering and relevance scoring
 */
export async function searchPages(allPages: unknown[], params: SearchParams): Promise<PageSearchResult[]> {
  if (!Array.isArray(allPages)) {
    return [];
  }

  const query = params.query?.toLowerCase() || '';
  
  let results = allPages
    .filter((page): page is Record<string, unknown> => 
      Boolean(page && typeof page === 'object' && 'name' in page)
    )
    .map((page): PageSearchResult => ({
      type: 'page',
      name: String(page.name || ''),
      uuid: page.uuid as string | undefined,
      properties: (page.properties as Record<string, unknown>) || {},
      created: page.createdAt as string | number | Date | undefined,
      updated: page.updatedAt as string | number | Date | undefined,
      relevance_score: query ? calculateRelevance(String(page.name || '') + ' ' + String(page.content || ''), query) : 1,
      tags: extractAllTags(page as Record<string, unknown>),
      backlinks: 0 // Simplified
    }));

  // Apply basic query filter only (leave complex filtering to main operations)
  if (query) {
    results = results.filter(page => {
      return matchesQuery(page.name, query) ||
             matchesQuery(JSON.stringify(page.properties), query);
    });
  }
  
  // NOTE: Date, tag, and other complex filters are handled by main search operations
  // to avoid double filtering and ensure consistency across all search types

  // Sort by relevance
  results.sort((a, b) => b.relevance_score - a.relevance_score);

  // Apply limit
  if (params.limit && results.length > params.limit) {
    results = results.slice(0, params.limit);
  }

  return results;
}

/**
 * Check if text matches query, handling quoted phrases for exact matches
 */
function matchesQuery(text: string, query: string): boolean {
  // Check for quoted phrases (exact match required)
  const quotedPhrases = query.match(/"([^"]+)"/g);
  if (quotedPhrases) {
    return quotedPhrases.every(quotedPhrase => {
      const phrase = quotedPhrase.slice(1, -1); // Remove quotes
      return text.toLowerCase().includes(phrase.toLowerCase());
    });
  }
  
  // Fall back to normalized text search for non-quoted queries
  const normalizedText = normalizeText(text);
  const normalizedQuery = normalizeText(query);
  return normalizedText.includes(normalizedQuery);
}

/**
 * Normalize text for better search matching
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .replace(/[^\w\s-]/g, ' ') // Replace special chars with spaces (keep hyphens)
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

function calculateRelevance(text: string, query: string): number {
  let score = 0;
  
  // Check for quoted phrases first (higher priority)
  const quotedPhrases = query.match(/"([^"]+)"/g);
  if (quotedPhrases) {
    for (const quotedPhrase of quotedPhrases) {
      const phrase = quotedPhrase.slice(1, -1); // Remove quotes
      if (text.toLowerCase().includes(phrase.toLowerCase())) {
        score += 100; // Very high score for exact phrase matches
      }
    }
    return score; // Return early for quoted searches
  }
  
  // Regular relevance calculation for non-quoted queries
  const normalizedText = normalizeText(text);
  const normalizedQuery = normalizeText(query);
  
  // Exact match gets highest score
  if (normalizedText === normalizedQuery) {
    score += 100;
  }
  
  // Name contains query
  if (normalizedText.includes(normalizedQuery)) {
    score += 50;
  }
  
  // Words match with normalized text
  const textWords = normalizedText.split(/\s+/);
  const queryWords = normalizedQuery.split(/\s+/);
  
  for (const queryWord of queryWords) {
    for (const textWord of textWords) {
      if (textWord === queryWord) {
        score += 10;
      } else if (textWord.includes(queryWord)) {
        score += 5;
      }
    }
  }
  
  return score;
}