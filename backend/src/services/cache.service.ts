/**
 * VCGIS Performance Caching Service (Phase 12)
 *
 * Provides a high-throughput caching tier for static and semi-static queries:
 * - Department directories and Sakala SLA matrices
 * - Karnataka District cartographic boundaries and centroids
 * - Top-level analytics summaries
 *
 * Implements an in-memory TTL store with automated cleanup and graceful
 * extensibility for distributed Redis instances.
 */

import { logger } from "../utils/logger.js";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class CacheService {
  private store = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Run background sweeping every 60 seconds to purge expired cache entries
    this.cleanupInterval = setInterval(() => {
      this.purgeExpired();
    }, 60 * 1000);

    // Unref so the interval does not hold the Node.js event loop open in test runs
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Retrieves a cached entry if available and unexpired.
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Sets a cache entry with specified time-to-live in seconds (default 300s / 5m).
   */
  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { data, expiresAt });
  }

  /**
   * Deletes a specific cached key.
   */
  del(key: string): void {
    this.store.delete(key);
  }

  /**
   * Invalidates keys matching a prefix or substring.
   */
  invalidatePattern(pattern: string): void {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.includes(pattern)) {
        this.store.delete(key);
        count++;
      }
    }
    if (count > 0) {
      logger.info(`[CACHE] Invalidated ${count} keys matching pattern: ${pattern}`);
    }
  }

  /**
   * Flushes all cached entries.
   */
  flushAll(): void {
    this.store.clear();
  }

  /**
   * Returns current count of cached items in memory.
   */
  size(): number {
    return this.store.size;
  }

  /**
   * Cache-aside helper: returns cached value or executes fetcher, caches result, and returns.
   */
  async wrap<T>(key: string, fetcher: () => Promise<T>, ttlSeconds: number = 300): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const result = await fetcher();
    this.set(key, result, ttlSeconds);
    return result;
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clean up timer on application shutdown.
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export const cacheService = new CacheService();
