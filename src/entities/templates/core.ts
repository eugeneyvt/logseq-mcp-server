/**
 * Templates Entity Module
 * Core template operations and business logic
 */

import { logger } from '../../utils/system/logger.js';
import { ErrorCode, createStructuredError } from '../../utils/system/errors.js';
import { SecureValidationHelpers } from '../../utils/validation.js';
import type { PerformanceAwareLogseqClient } from '../../adapters/client.js';
import type { SearchParams } from '../../validation/schemas.js';
import { isLogseqPage, type LogseqPage } from '../../schemas/types.js';

/**
 * Template search result interface
 */
export interface TemplateSearchResult {
  name: string;
  uuid: string;
  content: string;
  relevanceScore: number;
  createdAt?: string;
  updatedAt?: string;
  properties?: Record<string, unknown>;
}

/**
 * Search templates with filtering and relevance scoring
 */
export async function searchTemplates(templates: unknown[], params: SearchParams): Promise<TemplateSearchResult[]> {
  if (!Array.isArray(templates)) {
    return [];
  }

  const validTemplates = templates.filter((template): template is LogseqPage => 
    isLogseqPage(template) && Boolean(template.name)
  );

  let results = validTemplates.map((template): TemplateSearchResult => ({
    name: String(template.name || ''),
    uuid: template.uuid!,
    content: (template as unknown as Record<string, unknown>).content as string || '',
    relevanceScore: params.query ? calculateRelevance((template as unknown as Record<string, unknown>).content as string || String(template.name || ''), params.query) : 1,
    createdAt: formatDateSafely(template.createdAt),
    updatedAt: formatDateSafely(template.updatedAt),
    properties: template.properties as Record<string, unknown> | undefined
  }));

  // Apply query filter
  if (params.query) {
    const query = params.query.toLowerCase();
    results = results.filter(template =>
      template.name.toLowerCase().includes(query) ||
      template.content.toLowerCase().includes(query)
    );
  }

  // Sort by relevance
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Apply limit
  if (params.limit) {
    results = results.slice(0, params.limit);
  }

  return results;
}

/**
 * Get a specific template by name
 */
export async function getTemplate(
  perfClient: PerformanceAwareLogseqClient, 
  templateName: string
): Promise<unknown> {
  try {
    const templateNameError = SecureValidationHelpers.validatePageName(templateName);
    if (templateNameError) {
      return { error: templateNameError };
    }

    logger.debug({ templateName }, 'Getting template');
    
    const page = await perfClient.getPageCached(templateName);
    
    if (!page) {
      return {
        error: createStructuredError(ErrorCode.NOT_FOUND, {
          type: 'template',
          target: templateName,
          suggestion: 'Check template name or create the template first'
        })
      };
    }

    // Get template blocks for content
    const blocks = await perfClient.getPageBlocksTreeCached(templateName);
    
    return {
      name: page.name,
      uuid: page.uuid,
      content: blocks.map(block => block.content).join('\n'),
      createdAt: formatDateSafely(page.createdAt),
      updatedAt: formatDateSafely(page.updatedAt),
      properties: page.properties,
      blockCount: blocks.length,
      blocks: blocks.map(block => ({
        uuid: block.uuid,
        content: block.content,
        properties: block.properties
      }))
    };
  } catch (error) {
    logger.error({ templateName, error }, 'Failed to get template');
    return {
      error: createStructuredError(ErrorCode.INTERNAL, {
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
}

/**
 * Get all available templates
 */
export async function getAllTemplates(perfClient: PerformanceAwareLogseqClient): Promise<unknown[]> {
  try {
    const templates = await perfClient.getTemplatesCached();
    
    return templates.map(template => ({
      name: template.name,
      uuid: template.uuid,
      createdAt: formatDateSafely(template.createdAt),
      updatedAt: formatDateSafely(template.updatedAt),
      properties: template.properties
    }));
  } catch (error) {
    logger.error({ error }, 'Failed to get all templates');
    return [];
  }
}

/**
 * Safely format date values, handling invalid dates
 */
function formatDateSafely(dateValue: unknown): string | undefined {
  if (!dateValue) {
    return undefined;
  }
  
  try {
    const date = new Date(dateValue as string | number);
    if (isNaN(date.getTime())) {
      return undefined;
    }
    return date.toISOString();
  } catch {
    return undefined;
  }
}

/**
 * Calculate relevance score between text and query
 */
function calculateRelevance(text: string, query: string): number {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  let score = 0;
  
  // Exact match gets highest score
  if (textLower === queryLower) {
    score += 100;
  }
  
  // Name contains query
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