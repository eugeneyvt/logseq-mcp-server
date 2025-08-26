/**
 * Monitoring Service
 * Performance monitoring, timing, and metrics collection
 */

import { logger } from '../system/logger.js';
// Simple timing utility
export const timeOperation = <T>(name: string, fn: () => T): T => {
  const start = Date.now();
  const result = fn();
  const duration = Date.now() - start;
  logger.debug({ operation: name, duration }, 'Operation completed');
  return result;
};

// Simple metrics collector
export const metrics = {
  recordOperationDuration: (operation: string, duration: number) => {
    logger.debug({ operation, duration }, 'Operation duration recorded');
  },
  incrementCounter: (counter: string) => {
    logger.debug({ counter }, 'Counter incremented');
  },
  getOperationStats: () => {
    return {}; // Simple stub
  },
  getAllCounters: () => {
    return {}; // Simple stub
  }
};

/**
 * Performance thresholds configuration
 */
export const PerformanceThresholds = {
  SLOW_OPERATION_MS: 1000,        // Log operations slower than 1s
  VERY_SLOW_OPERATION_MS: 5000,   // Alert on operations slower than 5s
} as const;

/**
 * Enhanced performance monitoring with context
 */
export function withPerformanceMonitoring<TArgs extends unknown[], TReturn>(
  operationName: string,
  fn: (...args: TArgs) => Promise<TReturn>,
  context?: Record<string, unknown>
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    const startTime = Date.now();
    const operationId = `${operationName}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.debug({
      operation: operationName,
      operationId,
      context,
      args: args.length > 0 ? `${args.length} arguments` : 'no arguments'
    }, 'Starting operation');

    try {
      const result = await fn(...args);
      const duration = Date.now() - startTime;
      
      // Track metrics
      metrics.recordOperationDuration(operationName, duration);
      metrics.incrementCounter(`operations.${operationName}.success`);
      
      // Log based on performance thresholds
      if (duration > PerformanceThresholds.VERY_SLOW_OPERATION_MS) {
        logger.warn({
          operation: operationName,
          operationId,
          duration,
          context,
          threshold: 'very_slow'
        }, 'Very slow operation completed');
      } else if (duration > PerformanceThresholds.SLOW_OPERATION_MS) {
        logger.info({
          operation: operationName,
          operationId,
          duration,
          context,
          threshold: 'slow'
        }, 'Slow operation completed');
      } else {
        logger.debug({
          operation: operationName,
          operationId,
          duration,
          context
        }, 'Operation completed');
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Track error metrics
      metrics.incrementCounter(`operations.${operationName}.error`);
      
      logger.error({
        operation: operationName,
        operationId,
        duration,
        context,
        error: error instanceof Error ? error.message : String(error)
      }, 'Operation failed');
      
      throw error;
    }
  };
}

/**
 * Get comprehensive performance statistics
 */
export function getPerformanceStats(): {
  operations: Record<string, { count: number; totalDuration: number; avgDuration: number }>;
  counters: Record<string, number>;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
} {
  const operationStats = metrics.getOperationStats();
  const counters = metrics.getAllCounters();
  
  return {
    operations: operationStats,
    counters,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  };
}

/**
 * Performance monitor for critical sections
 */
export class PerformanceMonitor {
  private startTime: number;
  private checkpoints: Array<{ name: string; time: number }> = [];
  
  constructor(
    private operationName: string,
    private context?: Record<string, unknown>
  ) {
    this.startTime = Date.now();
    logger.debug({
      operation: this.operationName,
      context: this.context
    }, 'Performance monitoring started');
  }
  
  /**
   * Add a checkpoint to measure intermediate steps
   */
  checkpoint(name: string, data?: Record<string, unknown>): void {
    const now = Date.now();
    const elapsed = now - this.startTime;
    const sinceLastCheckpoint = this.checkpoints.length > 0 
      ? now - this.checkpoints[this.checkpoints.length - 1].time 
      : elapsed;
    
    this.checkpoints.push({ name, time: now });
    
    logger.debug({
      operation: this.operationName,
      checkpoint: name,
      elapsed,
      sinceLastCheckpoint,
      data,
      context: this.context
    }, 'Performance checkpoint');
  }
  
  /**
   * Complete monitoring and log final results
   */
  complete(result?: { success: boolean; error?: string }): number {
    const totalDuration = Date.now() - this.startTime;
    
    const checkpointSummary = this.checkpoints.map((checkpoint, index) => ({
      name: checkpoint.name,
      elapsed: checkpoint.time - this.startTime,
      duration: index > 0 
        ? checkpoint.time - this.checkpoints[index - 1].time 
        : checkpoint.time - this.startTime
    }));
    
    if (result?.success === false) {
      logger.error({
        operation: this.operationName,
        totalDuration,
        checkpoints: checkpointSummary,
        error: result.error,
        context: this.context
      }, 'Performance monitoring completed with error');
    } else if (totalDuration > PerformanceThresholds.VERY_SLOW_OPERATION_MS) {
      logger.warn({
        operation: this.operationName,
        totalDuration,
        checkpoints: checkpointSummary,
        context: this.context,
        threshold: 'very_slow'
      }, 'Very slow operation completed');
    } else if (totalDuration > PerformanceThresholds.SLOW_OPERATION_MS) {
      logger.info({
        operation: this.operationName,
        totalDuration,
        checkpoints: checkpointSummary,
        context: this.context,
        threshold: 'slow'
      }, 'Slow operation completed');
    } else {
      logger.debug({
        operation: this.operationName,
        totalDuration,
        checkpoints: checkpointSummary,
        context: this.context
      }, 'Performance monitoring completed');
    }
    
    return totalDuration;
  }
}