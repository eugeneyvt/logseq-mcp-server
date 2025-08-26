/**
 * Rate Limiting Service
 * Tool-specific and global rate limiting with metrics tracking
 */

import { logger } from '../system/logger.js';
import { metrics } from '../performance/monitoring.js';

// Simple rate limiter implementation
const rateLimiter = {
  isAllowed: (_key: string, _limit = 100, _windowMs = 60000) => {
    // Simple stub - always allow for now
    return true;
  },
  reset: (_key: string) => {
    // Simple stub
  },
  getCurrentCount: (_key: string) => {
    // Simple stub
    return 0;
  }
};

// Re-export the base rate limiter
export { rateLimiter };

// Simplified rate limit check function
export function checkRateLimit(key: string, limit = 100, windowMs = 60000): boolean {
  return rateLimiter.isAllowed(key, limit, windowMs);
}

/**
 * Rate limiting configuration
 */
export const RateLimitConfig = {
  PER_TOOL: 100,    // requests per minute per tool
  GLOBAL: 500       // global requests per minute
} as const;

/**
 * Tool-specific rate limiter with metrics tracking
 */
export class ToolRateLimiter {
  private readonly toolLimiters: Map<string, typeof rateLimiter> = new Map();

  /**
   * Check if operation is allowed for a specific tool
   */
  isAllowed(toolName: string): boolean {
    if (!this.toolLimiters.has(toolName)) {
      // Create rate limiter for this tool
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { RateLimiter } = require('../utils/monitoring/rate-limiting.js');
      this.toolLimiters.set(toolName, new RateLimiter(RateLimitConfig.PER_TOOL, 60000));
    }

    const toolLimiter = this.toolLimiters.get(toolName)!;
    const allowed = toolLimiter.isAllowed(toolName);
    
    if (!allowed) {
      metrics.incrementCounter(`rate_limit.${toolName}.exceeded`);
      logger.warn({ toolName }, 'Rate limit exceeded for tool');
    } else {
      metrics.incrementCounter(`rate_limit.${toolName}.allowed`);
    }
    
    return allowed;
  }

  /**
   * Get current request count for a tool
   */
  getCurrentCount(toolName: string): number {
    const toolLimiter = this.toolLimiters.get(toolName);
    return toolLimiter ? toolLimiter.getCurrentCount(toolName) : 0;
  }

  /**
   * Get remaining requests for a tool
   */
  getRemainingRequests(toolName: string): number {
    const current = this.getCurrentCount(toolName);
    return Math.max(0, RateLimitConfig.PER_TOOL - current);
  }

  /**
   * Get rate limit status for all tools
   */
  getStatus(): Record<string, { current: number; limit: number; remaining: number }> {
    const status: Record<string, { current: number; limit: number; remaining: number }> = {};
    
    for (const [toolName] of this.toolLimiters) {
      const current = this.getCurrentCount(toolName);
      status[toolName] = {
        current,
        limit: RateLimitConfig.PER_TOOL,
        remaining: Math.max(0, RateLimitConfig.PER_TOOL - current)
      };
    }
    
    return status;
  }

  /**
   * Reset rate limits for a specific tool (for testing or admin purposes)
   */
  resetTool(toolName: string): void {
    const toolLimiter = this.toolLimiters.get(toolName);
    if (toolLimiter && typeof toolLimiter.reset === 'function') {
      toolLimiter.reset(toolName);
      logger.info({ toolName }, 'Rate limit reset for tool');
    }
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    for (const [toolName, limiter] of this.toolLimiters) {
      if (typeof limiter.reset === 'function') {
        limiter.reset(toolName);
      }
    }
    logger.info('All rate limits reset');
  }
}

/**
 * Global tool rate limiter instance
 */
export const toolRateLimiter = new ToolRateLimiter();

/**
 * Rate limiting middleware for tool operations
 */
export function withRateLimiting<TArgs extends unknown[], TReturn>(
  toolName: string,
  handler: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    // Check tool-specific rate limit
    if (!toolRateLimiter.isAllowed(toolName)) {
      const remaining = toolRateLimiter.getRemainingRequests(toolName);
      const error = new Error(`Rate limit exceeded for ${toolName}. ${remaining} requests remaining.`);
      error.name = 'RateLimitError';
      throw error;
    }

    // Check global rate limit
    if (!rateLimiter.isAllowed('global')) {
      metrics.incrementCounter('rate_limit.global.exceeded');
      logger.warn('Global rate limit exceeded');
      const error = new Error('Global rate limit exceeded. Please try again later.');
      error.name = 'RateLimitError';
      throw error;
    }

    return handler(...args);
  };
}