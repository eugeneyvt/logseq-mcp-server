import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter, metrics, healthChecker, timeOperation } from './monitoring.js';

describe('metrics (global MetricsCollector)', () => {
  beforeEach(() => {
    metrics.reset();
  });

  describe('counters', () => {
    it('should increment counters', () => {
      metrics.incrementCounter('test.counter');
      metrics.incrementCounter('test.counter');
      metrics.incrementCounter('test.counter', 3);

      expect(metrics.getCounter('test.counter')).toBe(5);
    });

    it('should handle multiple counters', () => {
      metrics.incrementCounter('counter1');
      metrics.incrementCounter('counter2', 2);

      expect(metrics.getCounter('counter1')).toBe(1);
      expect(metrics.getCounter('counter2')).toBe(2);
    });
  });

  describe('timers', () => {
    it('should record timing metrics', () => {
      metrics.recordTiming('test.operation', 100);
      metrics.recordTiming('test.operation', 200);
      metrics.recordTiming('test.operation', 150);

      const stats = metrics.getTimingStats('test.operation');

      expect(stats).toBeDefined();
      expect(stats!.count).toBe(3);
      expect(stats!.avg).toBe(150);
      expect(stats!.min).toBe(100);
      expect(stats!.max).toBe(200);
    });

    it('should handle single timing measurement', () => {
      metrics.recordTiming('single.operation', 42);

      const stats = metrics.getTimingStats('single.operation');

      expect(stats).toBeDefined();
      expect(stats!.count).toBe(1);
      expect(stats!.avg).toBe(42);
      expect(stats!.min).toBe(42);
      expect(stats!.max).toBe(42);
    });

    it('should return null for non-existent operations', () => {
      const stats = metrics.getTimingStats('non-existent');
      expect(stats).toBeNull();
    });
  });

  describe('summary', () => {
    it('should provide comprehensive metrics summary', () => {
      metrics.incrementCounter('requests', 10);
      metrics.recordTiming('api.call', 100);
      metrics.recordTiming('api.call', 200);

      const summary = metrics.getSummary();

      expect(summary).toHaveProperty('counters');
      expect(summary).toHaveProperty('timings');
      expect((summary.counters as any).requests).toBe(10);
      expect(summary.timings).toHaveProperty('api.call');
    });
  });

  describe('reset', () => {
    it('should reset all metrics', () => {
      metrics.incrementCounter('counter');
      metrics.recordTiming('timer', 100);

      metrics.reset();

      expect(metrics.getCounter('counter')).toBe(0);
      expect(metrics.getTimingStats('timer')).toBeNull();
    });
  });
});

describe('healthChecker (global HealthChecker)', () => {
  beforeEach(() => {
    // Clear any existing checks for test isolation
    // Note: The HealthChecker class doesn't expose a way to clear checks
    // so we'll work with the existing state
  });

  it('should return healthy status with no checks', async () => {
    const status = await healthChecker.getHealthStatus();
    expect(status.status).toBe('healthy');
    expect(status).toHaveProperty('timestamp');
    expect(status).toHaveProperty('uptime');
    expect(status).toHaveProperty('checks');
  });

  it('should add and run health checks', async () => {
    const passingCheck = vi.fn().mockResolvedValue({ status: 'pass', message: 'All good' });
    const failingCheck = vi.fn().mockResolvedValue({ status: 'fail', message: 'Error occurred' });

    healthChecker.addCheck('service1', passingCheck);
    healthChecker.addCheck('service2', failingCheck);

    const status = await healthChecker.getHealthStatus();

    expect(status.status).toBe('degraded'); // One failed check makes it degraded
    expect(status.checks.service1.status).toBe('pass');
    expect(status.checks.service2.status).toBe('fail');
    expect(passingCheck).toHaveBeenCalled();
    expect(failingCheck).toHaveBeenCalled();
  });

  it('should handle check errors gracefully', async () => {
    const errorCheck = vi.fn().mockRejectedValue(new Error('Check failed'));

    healthChecker.addCheck('failing-service', errorCheck);

    const status = await healthChecker.getHealthStatus();

    expect(status.status).toBe('unhealthy');
    expect(status.checks['failing-service'].status).toBe('fail');
    expect(status.checks['failing-service'].message).toContain('Check failed');
  });

  it('should include response times in check results', async () => {
    const slowCheck = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { status: 'pass' };
    });

    healthChecker.addCheck('slow-service', slowCheck);

    const status = await healthChecker.getHealthStatus();

    expect(status.checks['slow-service'].responseTime).toBeGreaterThan(0);
  });
});

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(3, 1000); // 3 requests per second
  });

  it('should allow requests within limit', () => {
    expect(limiter.isAllowed('client1')).toBe(true);
    expect(limiter.isAllowed('client1')).toBe(true);
    expect(limiter.isAllowed('client1')).toBe(true);
  });

  it('should deny requests exceeding limit', () => {
    // Use up the limit
    limiter.isAllowed('client2');
    limiter.isAllowed('client2');
    limiter.isAllowed('client2');

    // This should be denied
    expect(limiter.isAllowed('client2')).toBe(false);
  });

  it('should track different clients separately', () => {
    // Use up limit for client1
    limiter.isAllowed('client1');
    limiter.isAllowed('client1');
    limiter.isAllowed('client1');

    // client2 should still be allowed
    expect(limiter.isAllowed('client2')).toBe(true);
    expect(limiter.isAllowed('client1')).toBe(false);
  });

  it('should reset counts after time window', async () => {
    const shortLimiter = new RateLimiter(1, 100); // 1 request per 100ms

    expect(shortLimiter.isAllowed('client')).toBe(true);
    expect(shortLimiter.isAllowed('client')).toBe(false);

    // Wait for reset
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(shortLimiter.isAllowed('client')).toBe(true);
  });

  it('should track current count correctly', () => {
    limiter.isAllowed('client');
    limiter.isAllowed('client');

    expect(limiter.getCurrentCount('client')).toBe(2);

    limiter.isAllowed('client');
    expect(limiter.getCurrentCount('client')).toBe(3);

    // Exceeding limit shouldn't increase count
    limiter.isAllowed('client');
    expect(limiter.getCurrentCount('client')).toBe(3);
  });
});

describe('timeOperation', () => {
  beforeEach(() => {
    metrics.reset();
  });

  it('should time sync operations', async () => {
    const operation = vi.fn().mockReturnValue('result');

    const result = await timeOperation('test.sync', operation);

    expect(result).toBe('result');
    expect(operation).toHaveBeenCalled();

    // Check that timing was recorded
    const stats = metrics.getTimingStats('test.sync');
    expect(stats).toBeDefined();
    expect(stats!.count).toBe(1);

    // Check success counter
    expect(metrics.getCounter('test.sync.success')).toBe(1);
  });

  it('should time async operations', async () => {
    const operation = vi.fn().mockResolvedValue('async-result');

    const result = await timeOperation('test.async', operation);

    expect(result).toBe('async-result');
    expect(operation).toHaveBeenCalled();

    // Check that timing was recorded
    const stats = metrics.getTimingStats('test.async');
    expect(stats).toBeDefined();
    expect(stats!.count).toBe(1);
  });

  it('should propagate errors from operations', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));

    await expect(timeOperation('test.error', operation)).rejects.toThrow('Operation failed');

    // Timing should still be recorded even on error
    const stats = metrics.getTimingStats('test.error');
    expect(stats).toBeDefined();
    expect(stats!.count).toBe(1);

    // Check error counter
    expect(metrics.getCounter('test.error.error')).toBe(1);
  });

  it('should record reasonable timing durations', async () => {
    const operation = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return 'result';
    });

    await timeOperation('test.timing', operation);

    const stats = metrics.getTimingStats('test.timing');
    expect(stats!.avg).toBeGreaterThan(40); // Should be around 50ms
    expect(stats!.avg).toBeLessThan(200); // But not too much more
  });
});
