/**
 * Block Search Operations
 * Focused search functionality for blocks
 */

import { logger } from '../../utils/system/logger.js';
import type { PerformanceAwareLogseqClient } from "../../adapters/client.js";
import type { SearchParams } from '../../validation/schemas.js';

// Types from core
export interface SearchableBlock {
  uuid: string;
  content?: string;
  properties?: Record<string, unknown>;
  'created-at'?: string | number | Date;
  'updated-at'?: string | number | Date;
  page?: string;
  parent?: string;
  children?: SearchableBlock[];
}

export interface BlockSearchResult {
  type: 'block';
  uuid: string;
  content: string;
  page: string;
  properties: Record<string, unknown>;
  created: string | number | Date | undefined;
  updated: string | number | Date | undefined;
  relevance_score: number;
}

export interface SearchablePage {
  name: string;
  id?: string;
  properties?: Record<string, unknown>;
}

/**
 * Search in blocks across pages with filtering and scoping
 */
export async function searchBlocks(
  perfClient: PerformanceAwareLogseqClient, 
  allPages: unknown[], 
  params: SearchParams
): Promise<BlockSearchResult[]> {
  const blockResults: BlockSearchResult[] = [];
  const query = params.query?.toLowerCase() || '';

  // Determine pages to search
  let pagesToSearch: SearchablePage[];
  
  if (params.scope?.page_titles && params.scope.page_titles.length > 0) {
    // Search specific pages
    pagesToSearch = allPages
      .filter((p): p is SearchablePage => {
        return p !== null && p !== undefined && 
               typeof p === 'object' && 
               'name' in p && 
               typeof (p as { name: unknown }).name === 'string';
      })
      .filter((p) => params.scope!.page_titles!.includes(p.name));
  } else {
    // Search all pages
    pagesToSearch = allPages
      .filter((p): p is SearchablePage => {
        return p !== null && p !== undefined && 
               typeof p === 'object' && 
               'name' in p && 
               typeof (p as { name: unknown }).name === 'string';
      });
  }

  // Search blocks in each page
  for (const page of pagesToSearch) {
    try {
      const blocks = await perfClient.getPageBlocksTreeCached(page.name);
      
      // Flatten block tree and search
      const flatBlocks = flattenBlocks(blocks, page.name);
      
      for (const block of flatBlocks) {
        // Apply content filter
        if (query && block.content) {
          const content = block.content.toLowerCase();
          if (!content.includes(query)) {
            continue;
          }
        }

        // Apply date filters if present
        if (params.filter?.createdAfter || params.filter?.createdBefore ||
            params.filter?.updatedAfter || params.filter?.updatedBefore) {
          if (!matchesDateFilters(block, params.filter)) {
            continue;
          }
        }

        // Apply tag filters if present
        if (params.filter?.tags_all || params.filter?.tags_any) {
          if (!matchesTagFilters(block, params.filter)) {
            continue;
          }
        }

        // Calculate relevance
        const relevanceScore = query && block.content 
          ? calculateRelevance(block.content, query)
          : 1;

        blockResults.push({
          type: 'block',
          uuid: block.uuid,
          content: block.content || '',
          page: page.name,
          properties: block.properties || {},
          created: block['created-at'],
          updated: block['updated-at'],
          relevance_score: relevanceScore
        });
      }
    } catch (error) {
      logger.warn({ pageName: page.name, error }, 'Failed to search blocks in page');
      continue;
    }
  }

  // Sort by relevance
  blockResults.sort((a, b) => b.relevance_score - a.relevance_score);

  // Apply limit
  if (params.limit && blockResults.length > params.limit) {
    return blockResults.slice(0, params.limit);
  }

  return blockResults;
}

// Helper functions
function flattenBlocks(blocks: unknown[], pageName: string): SearchableBlock[] {
  const flattened: SearchableBlock[] = [];
  
  function processBlock(block: unknown) {
    if (block && typeof block === 'object' && 'uuid' in block) {
      const searchableBlock: SearchableBlock = {
        ...block as SearchableBlock,
        page: pageName
      };
      flattened.push(searchableBlock);
      
      const children = (block as { children?: unknown[] }).children;
      if (Array.isArray(children)) {
        children.forEach(processBlock);
      }
    }
  }
  
  if (Array.isArray(blocks)) {
    blocks.forEach(processBlock);
  }
  
  return flattened;
}

function matchesDateFilters(_block: SearchableBlock, _filter: unknown): boolean {
  // Implementation would check date filters against block timestamps
  return true; // Simplified for now
}

function matchesTagFilters(_block: SearchableBlock, _filter: unknown): boolean {
  // Implementation would check tag filters against block content/properties
  return true; // Simplified for now
}

function calculateRelevance(text: string, query: string): number {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  let score = 0;
  
  // Exact match gets highest score
  if (textLower === queryLower) {
    score += 100;
  }
  
  // Content contains query
  if (textLower.includes(queryLower)) {
    score += 50;
  }
  
  // Words match
  const textWords = textLower.split(/\s+/);
  const queryWords = queryLower.split(/\s+/);
  
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