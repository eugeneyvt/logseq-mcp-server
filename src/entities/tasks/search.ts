/**
 * Task Search Operations
 * Focused search functionality for tasks
 */

import { logger } from '../../utils/system/logger.js';
import type { PerformanceAwareLogseqClient } from "../../adapters/client.js";
import type { SearchParams } from '../../validation/schemas.js';

export interface TaskSearchResult {
  type: 'task';
  uuid: string;
  content: string;
  status: 'TODO' | 'DOING' | 'DONE' | 'WAITING' | 'LATER' | 'NOW' | 'CANCELED';
  page: string;
  scheduled?: string;
  deadline?: string;
  properties: Record<string, unknown>;
  relevance_score: number;
}

/**
 * Search for tasks with filtering and status matching
 */
export async function searchTasks(
  perfClient: PerformanceAwareLogseqClient,
  params: SearchParams
): Promise<TaskSearchResult[]> {
  const taskResults: TaskSearchResult[] = [];
  const query = params.query?.toLowerCase() || '';

  try {
    // Get pages to search for tasks
    let pagesToSearch: string[];
    
    if (params.scope?.page_titles && params.scope.page_titles.length > 0) {
      pagesToSearch = params.scope.page_titles;
    } else {
      const allPages = await perfClient.getAllPagesCached();
      pagesToSearch = allPages.map(page => page.name).filter(Boolean);
    }

    // Search tasks in each page
    for (const pageName of pagesToSearch) {
      try {
        const blocks = await perfClient.getPageBlocksTreeCached(pageName);
        
        for (const block of blocks) {
          // Check if block is a task
          // More flexible task pattern matching
          const blockContent = String(block.content || '');
          const taskMatch = blockContent.match(/^\s*(TODO|DOING|DONE|WAITING|LATER|NOW|CANCELED)\s+(.+?)\s*$/m) ||
                           blockContent.match(/(TODO|DOING|DONE|WAITING|LATER|NOW|CANCELED)\s+(.+?)(?:\n|$)/);
          
          if (!taskMatch) {
            continue;
          }
          
          const [, status, content] = taskMatch;
          
          // Apply status filter FIRST (most important) - STRICT FILTERING
          const requestedStatus = params.filter?.todoState;
          if (requestedStatus) {
            if (status.trim().toUpperCase() !== requestedStatus.trim().toUpperCase()) {
              // This task doesn't match the requested status - skip it completely
              continue;
            }
          }
          
          // Apply query filter
          if (query && !content.toLowerCase().includes(query)) {
            continue;
          }

          // Apply date filters
          const scheduledDate = extractScheduledDate(block.content);
          const deadlineDate = extractDeadlineDate(block.content);
          
          if (params.filter?.scheduledOn && scheduledDate !== params.filter.scheduledOn) {
            continue;
          }
          
          if (params.filter?.deadlinedOn && deadlineDate !== params.filter.deadlinedOn) {
            continue;
          }

          const relevanceScore = query ? calculateRelevance(content, query) : 1;

          taskResults.push({
            type: 'task',
            uuid: block.uuid,
            content: content,
            status: status as TaskSearchResult['status'],
            page: pageName,
            scheduled: scheduledDate,
            deadline: deadlineDate,
            properties: block.properties || {},
            relevance_score: relevanceScore
          });
        }
      } catch (error) {
        logger.warn({ pageName, error }, 'Failed to search tasks in page');
        continue;
      }
    }

    // Sort by relevance
    taskResults.sort((a, b) => b.relevance_score - a.relevance_score);

    // Apply limit
    if (params.limit && taskResults.length > params.limit) {
      return taskResults.slice(0, params.limit);
    }

    return taskResults;
  } catch (error) {
    logger.error({ params, error }, 'Failed to search tasks');
    return [];
  }
}

function extractScheduledDate(content: string): string | undefined {
  const scheduledMatch = content.match(/SCHEDULED:\s*<([^>]+)>/);
  return scheduledMatch ? scheduledMatch[1] : undefined;
}

function extractDeadlineDate(content: string): string | undefined {
  const deadlineMatch = content.match(/DEADLINE:\s*<([^>]+)>/);
  return deadlineMatch ? deadlineMatch[1] : undefined;
}

function calculateRelevance(text: string, query: string): number {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  let score = 0;
  
  if (textLower === queryLower) {
    score += 100;
  }
  
  if (textLower.includes(queryLower)) {
    score += 50;
  }
  
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