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