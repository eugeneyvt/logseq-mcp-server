import { logger } from './logger.js';

/**
 * Performance metrics collector
 */
class MetricsCollector {
  private readonly metrics: Map<string, number[]> = new Map();
  private readonly counters: Map<string, number> = new Map();

  /**
   * Record timing for an operation
   */
  recordTiming(operation: string, timeMs: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    const timings = this.metrics.get(operation)!;
    timings.push(timeMs);

    // Keep only last 100 measurements
    if (timings.length > 100) {
      timings.shift();
    }
  }

  /**
   * Increment a counter
   */
  incrementCounter(name: string, value = 1): void {
    this.counters.set(name, (this.counters.get(name) || 0) + value);
  }

  /**
   * Get timing statistics for an operation
   */
  getTimingStats(operation: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p95: number;
  } | null {
    const timings = this.metrics.get(operation);
    if (!timings || timings.length === 0) {
      return null;
    }

    const sorted = [...timings].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);
    const avg = sum / count;
    const min = sorted[0];
    const max = sorted[count - 1];
    const p95Index = Math.floor(count * 0.95);
    const p95 = sorted[p95Index];

    return { count, avg, min, max, p95 };
  }

  /**
   * Get counter value
   */
  getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  /**
   * Get all metrics summary
   */
  getSummary(): Record<string, unknown> {
    const timings: Record<string, unknown> = {};
    for (const operation of this.metrics.keys()) {
      timings[operation] = this.getTimingStats(operation);
    }

    const counters: Record<string, number> = {};
    for (const [name, value] of this.counters.entries()) {
      counters[name] = value;
    }

    return { timings, counters };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.counters.clear();
  }
}

/**
 * Global metrics instance
 */
export const metrics = new MetricsCollector();

/**
 * Decorator to time function execution
 */
export function timed(operationName?: string) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!;
    const operation = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (this: any, ...args: any[]) {
      const start = Date.now();
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - start;
        metrics.recordTiming(operation, duration);
        metrics.incrementCounter(`${operation}.success`);
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        metrics.recordTiming(operation, duration);
        metrics.incrementCounter(`${operation}.error`);
        throw error;
      }
    } as any;

    return descriptor;
  };
}

/**
 * Time an async operation
 */
export async function timeOperation<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await operation();
    const duration = Date.now() - start;
    metrics.recordTiming(operationName, duration);
    metrics.incrementCounter(`${operationName}.success`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    metrics.recordTiming(operationName, duration);
    metrics.incrementCounter(`${operationName}.error`);
    throw error;
  }
}

/**
 * Health check status
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  checks: Record<
    string,
    {
      status: 'pass' | 'fail';
      message?: string;
      responseTime?: number;
    }
  >;
  uptime: number;
}

/**
 * Health check manager
 */
class HealthChecker {
  private readonly startTime = Date.now();
  private readonly checks: Map<
    string,
    () => Promise<{ status: 'pass' | 'fail'; message?: string }>
  > = new Map();

  /**
   * Register a health check
   */
  addCheck(
    name: string,
    check: () => Promise<{ status: 'pass' | 'fail'; message?: string }>
  ): void {
    this.checks.set(name, check);
  }

  /**
   * Run all health checks
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const checks: HealthStatus['checks'] = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    for (const [name, check] of this.checks.entries()) {
      const start = Date.now();
      try {
        const result = await Promise.race([
          check(),
          new Promise<{ status: 'fail'; message: string }>((_, reject) =>
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          ),
        ]);

        const responseTime = Date.now() - start;
        checks[name] = {
          status: result.status,
          message: result.message,
          responseTime,
        };

        if (result.status === 'fail') {
          overallStatus = overallStatus === 'healthy' ? 'degraded' : 'unhealthy';
        }
      } catch (error) {
        const responseTime = Date.now() - start;
        checks[name] = {
          status: 'fail',
          message: error instanceof Error ? error.message : 'Unknown error',
          responseTime,
        };
        overallStatus = 'unhealthy';
      }
    }

    return {
      status: overallStatus,
      timestamp: Date.now(),
      checks,
      uptime: Date.now() - this.startTime,
    };
  }
}

/**
 * Global health checker instance
 */
export const healthChecker = new HealthChecker();

/**
 * Log metrics periodically
 */
export function startMetricsLogging(intervalMs = 300000): void {
  setInterval(() => {
    const summary = metrics.getSummary();
    logger.info({ metrics: summary }, 'Performance metrics summary');
  }, intervalMs);
}

/**
 * Request rate limiter
 */
export class RateLimiter {
  private readonly requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }

    const timestamps = this.requests.get(key)!;

    // Remove old timestamps
    while (timestamps.length > 0 && timestamps[0] < windowStart) {
      timestamps.shift();
    }

    if (timestamps.length >= this.maxRequests) {
      return false;
    }

    timestamps.push(now);
    return true;
  }

  /**
   * Get current request count for a key
   */
  getCurrentCount(key: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const timestamps = this.requests.get(key) || [];

    return timestamps.filter((t) => t >= windowStart).length;
  }
}

/**
 * Global rate limiter instance
 */
export const rateLimiter = new RateLimiter();
