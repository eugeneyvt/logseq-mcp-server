/**
 * Simple in-memory cache with TTL support for frequently accessed data
 */
export class Cache<T> {
  private readonly cache: Map<string, { value: T; expires: number }> = new Map();
  private readonly defaultTtl: number;
  private readonly maxSize: number;

  constructor(defaultTtlMs = 300000, maxSize = 1000) {
    // Default TTL of 5 minutes
    this.defaultTtl = defaultTtlMs;
    this.maxSize = maxSize;
  }

  /**
   * Get a value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Set a value in cache with optional TTL
   */
  set(key: string, value: T, ttlMs?: number): void {
    // Clean up expired entries if cache is getting full
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    // If still at max size after cleanup, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const expires = Date.now() + (ttlMs ?? this.defaultTtl);
    this.cache.set(key, { value, expires });
  }

  /**
   * Delete a specific key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; defaultTtl: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      defaultTtl: this.defaultTtl,
    };
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get or set a value (cache-aside pattern)
   */
  async getOrSet<R extends T>(key: string, fetcher: () => Promise<R>, ttlMs?: number): Promise<R> {
    const cached = this.get(key) as R | undefined;
    if (cached !== undefined) {
      return cached;
    }

    const value = await fetcher();
    this.set(key, value, ttlMs);
    return value;
  }
}

/**
 * Global cache instances for different data types
 */
export const pageCache = new Cache(300000, 500); // 5 minutes, max 500 pages
export const blockCache = new Cache(180000, 1000); // 3 minutes, max 1000 blocks
export const queryCache = new Cache(60000, 100); // 1 minute, max 100 queries
