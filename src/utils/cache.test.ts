import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Cache } from './cache.js';

describe('Cache', () => {
  let cache: Cache<string>;

  beforeEach(() => {
    cache = new Cache(1000, 3); // 1 second TTL, max 3 items
  });

  describe('basic operations', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('non-existent')).toBeUndefined();
    });

    it('should delete specific keys', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.delete('non-existent')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });
  });

  describe('TTL functionality', () => {
    it('should expire entries after TTL', async () => {
      cache.set('key1', 'value1', 100); // 100ms TTL
      expect(cache.get('key1')).toBe('value1');

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should use default TTL when not specified', async () => {
      const shortCache = new Cache(100); // 100ms default TTL
      shortCache.set('key1', 'value1');
      expect(shortCache.get('key1')).toBe('value1');

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(shortCache.get('key1')).toBeUndefined();
    });

    it('should allow custom TTL per entry', async () => {
      cache.set('short', 'value1', 100); // 100ms
      cache.set('long', 'value2', 2000); // 2s

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(cache.get('short')).toBeUndefined();
      expect(cache.get('long')).toBe('value2');
    });
  });

  describe('size limits', () => {
    it('should respect max size limit', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Should evict oldest

      // First key should be evicted
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    it('should clean up expired entries when at capacity', async () => {
      // Fill cache with short-lived entries
      cache.set('key1', 'value1', 100);
      cache.set('key2', 'value2', 100);
      cache.set('key3', 'value3', 100);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Adding new entry should trigger cleanup
      cache.set('key4', 'value4');
      expect(cache.get('key4')).toBe('value4');

      // Expired entries should be gone
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBeUndefined();
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if available', async () => {
      cache.set('key1', 'cached-value');

      const fetcher = vi.fn().mockResolvedValue('fetched-value');
      const result = await cache.getOrSet('key1', fetcher);

      expect(result).toBe('cached-value');
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should fetch and cache value if not available', async () => {
      const fetcher = vi.fn().mockResolvedValue('fetched-value');
      const result = await cache.getOrSet('key1', fetcher);

      expect(result).toBe('fetched-value');
      expect(fetcher).toHaveBeenCalledOnce();
      expect(cache.get('key1')).toBe('fetched-value');
    });

    it('should use custom TTL when provided', async () => {
      const fetcher = vi.fn().mockResolvedValue('fetched-value');
      await cache.getOrSet('key1', fetcher, 100); // 100ms TTL

      expect(cache.get('key1')).toBe('fetched-value');

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should not cache if fetcher throws', async () => {
      const fetcher = vi.fn().mockRejectedValue(new Error('Fetch failed'));

      await expect(cache.getOrSet('key1', fetcher)).rejects.toThrow('Fetch failed');
      expect(cache.get('key1')).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.getStats();
      expect(stats).toEqual({
        size: 2,
        maxSize: 3,
        defaultTtl: 1000,
      });
    });
  });

  describe('complex data types', () => {
    it('should handle objects', () => {
      const objectCache = new Cache<{ name: string; age: number }>();
      const obj = { name: 'John', age: 30 };

      objectCache.set('user1', obj);
      expect(objectCache.get('user1')).toEqual(obj);
    });

    it('should handle arrays', () => {
      const arrayCache = new Cache<string[]>();
      const arr = ['a', 'b', 'c'];

      arrayCache.set('list1', arr);
      expect(arrayCache.get('list1')).toEqual(arr);
    });

    it('should handle null and undefined values', () => {
      const cache = new Cache<string | null | undefined>();

      cache.set('null-key', null);
      cache.set('undefined-key', undefined);

      expect(cache.get('null-key')).toBeNull();
      expect(cache.get('undefined-key')).toBeUndefined();
    });
  });
});
