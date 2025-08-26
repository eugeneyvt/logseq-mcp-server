import { describe, it, expect, vi } from 'vitest';
import { 
  timeOperation, 
  metrics, 
  withPerformanceMonitoring,
  getPerformanceStats,
  PerformanceMonitor,
  PerformanceThresholds
} from '../../src/utils/performance/monitoring.js';

// Mock logger
vi.mock('../../src/utils/system/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}));

describe('Performance Monitoring', () => {
  describe('timeOperation', () => {
    it('should time synchronous operations', () => {
      const operation = vi.fn().mockReturnValue('result');

      const result = timeOperation('test-op', operation);

      expect(result).toBe('result');
      expect(operation).toHaveBeenCalled();
    });

    it('should handle operations that throw', () => {
      const operation = vi.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      expect(() => timeOperation('test-op', operation)).toThrow('Test error');
      expect(operation).toHaveBeenCalled();
    });
  });

  describe('metrics', () => {
    it('should record operation duration', () => {
      expect(() => metrics.recordOperationDuration('test-op', 100)).not.toThrow();
    });

    it('should increment counters', () => {
      expect(() => metrics.incrementCounter('test-counter')).not.toThrow();
    });

    it('should return operation stats', () => {
      const stats = metrics.getOperationStats();
      expect(typeof stats).toBe('object');
    });

    it('should return all counters', () => {
      const counters = metrics.getAllCounters();
      expect(typeof counters).toBe('object');
    });
  });

  describe('withPerformanceMonitoring', () => {
    it('should wrap async functions with monitoring', async () => {
      const asyncFn = vi.fn().mockResolvedValue('async result');
      const monitoredFn = withPerformanceMonitoring('async-op', asyncFn);

      const result = await monitoredFn('arg1', 'arg2');

      expect(result).toBe('async result');
      expect(asyncFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should handle async function errors', async () => {
      const asyncFn = vi.fn().mockRejectedValue(new Error('Async error'));
      const monitoredFn = withPerformanceMonitoring('failing-op', asyncFn);

      await expect(monitoredFn()).rejects.toThrow('Async error');
    });

    it('should include context in monitoring', async () => {
      const asyncFn = vi.fn().mockResolvedValue('result');
      const context = { userId: '123', action: 'test' };
      const monitoredFn = withPerformanceMonitoring('context-op', asyncFn, context);

      const result = await monitoredFn();

      expect(result).toBe('result');
    });
  });

  describe('getPerformanceStats', () => {
    it('should return comprehensive performance statistics', () => {
      const stats = getPerformanceStats();

      expect(stats).toHaveProperty('operations');
      expect(stats).toHaveProperty('counters');
      expect(stats).toHaveProperty('uptime');
      expect(stats).toHaveProperty('memoryUsage');
      expect(typeof stats.uptime).toBe('number');
      expect(typeof stats.memoryUsage).toBe('object');
    });
  });

  describe('PerformanceMonitor', () => {
    it('should create monitor with operation name', () => {
      const monitor = new PerformanceMonitor('test-operation');
      expect(monitor).toBeInstanceOf(PerformanceMonitor);
    });

    it('should create monitor with context', () => {
      const context = { feature: 'testing' };
      const monitor = new PerformanceMonitor('test-operation', context);
      expect(monitor).toBeInstanceOf(PerformanceMonitor);
    });

    it('should add checkpoints', () => {
      const monitor = new PerformanceMonitor('checkpoint-test');
      
      expect(() => {
        monitor.checkpoint('step1');
        monitor.checkpoint('step2', { data: 'test' });
      }).not.toThrow();
    });

    it('should complete monitoring successfully', () => {
      const monitor = new PerformanceMonitor('complete-test');
      monitor.checkpoint('step1');
      
      const duration = monitor.complete({ success: true });
      
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle completion with errors', () => {
      const monitor = new PerformanceMonitor('error-test');
      
      const duration = monitor.complete({ 
        success: false, 
        error: 'Test error message' 
      });
      
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('PerformanceThresholds', () => {
    it('should define performance thresholds', () => {
      expect(PerformanceThresholds.SLOW_OPERATION_MS).toBe(1000);
      expect(PerformanceThresholds.VERY_SLOW_OPERATION_MS).toBe(5000);
    });
  });
});