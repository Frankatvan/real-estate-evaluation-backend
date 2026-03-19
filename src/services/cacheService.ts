import NodeCache from 'node-cache';
import logger from '../config/logger';

/**
 * Cache Service
 * Provides in-memory caching with TTL support
 */

class CacheService {
  private cache: NodeCache;
  private hitCount: number = 0;
  private missCount: number = 0;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: 600, // Default TTL: 10 minutes
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false // Performance optimization
    });

    this.cache.on('set', (key, value) => {
      logger.debug('Cache set', { key, ttl: this.cache.getTtl(key) });
    });

    this.cache.on('del', (key, value) => {
      logger.debug('Cache deleted', { key });
    });

    this.cache.on('expired', (key, value) => {
      logger.debug('Cache expired', { key });
    });
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | undefined {
    const value = this.cache.get<T>(key);
    if (value !== undefined) {
      this.hitCount++;
      logger.debug('Cache hit', { key, hitCount: this.hitCount });
      return value;
    } else {
      this.missCount++;
      logger.debug('Cache miss', { key, missCount: this.missCount });
      return undefined;
    }
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    const success = this.cache.set(key, value, ttl);
    if (success) {
      logger.debug('Cache set successful', { key, ttl });
    }
    return success;
  }

  /**
   * Delete value from cache
   */
  del(key: string): number {
    const deleted = this.cache.del(key);
    if (deleted > 0) {
      logger.debug('Cache delete successful', { key, deleted });
    }
    return deleted;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get or set pattern - fetch from cache or execute function and cache result
   */
  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T> {
    const cachedValue = this.get<T>(key);
    if (cachedValue !== undefined) {
      return cachedValue;
    }

    const value = await fetchFn();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Clear all cache
   */
  flushAll(): void {
    this.cache.flushAll();
    this.hitCount = 0;
    this.missCount = 0;
    logger.info('Cache flushed');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const keys = this.cache.keys();
    const stats = this.cache.getStats();

    return {
      keys: keys.length,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: this.hitCount / (this.hitCount + this.missCount) || 0,
      ...stats
    };
  }

  /**
   * Delete multiple keys by pattern
   */
  delByPattern(pattern: string): number {
    const keys = this.cache.keys();
    const matchingKeys = keys.filter(key => {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(key);
    });

    matchingKeys.forEach(key => this.cache.del(key));
    logger.info('Cache delete by pattern', { pattern, count: matchingKeys.length });

    return matchingKeys.length;
  }

  /**
   * Set multiple values at once
   */
  setMany<T>(items: Array<{ key: string; value: T; ttl?: number }>): void {
    items.forEach(({ key, value, ttl }) => {
      this.set(key, value, ttl);
    });
    logger.info('Cache set many', { count: items.length });
  }

  /**
   * Get multiple values at once
   */
  getMany<T>(keys: string[]): Record<string, T | undefined> {
    const result: Record<string, T | undefined> = {};
    keys.forEach(key => {
      result[key] = this.get<T>(key);
    });
    return result;
  }
}

// Export singleton instance
export const cacheService = new CacheService();

/**
 * Cache middleware factory
 */
export const cacheMiddleware = (keyPrefix: string, ttl?: number) => {
  return async (req: any, res: any, next: any) => {
    const cacheKey = `${keyPrefix}:${req.originalUrl}`;

    // Try to get from cache
    const cachedData = cacheService.get(cacheKey);
    if (cachedData !== undefined) {
      logger.info('Response served from cache', { key: cacheKey });
      return res.json(cachedData);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = function(data: any) {
      // Only cache successful responses
      if (res.statusCode === 200) {
        cacheService.set(cacheKey, data, ttl);
      }
      return originalJson(data);
    };

    next();
  };
};

/**
 * Cache invalidation middleware
 */
export const invalidateCache = (pattern: string) => {
  return (req: any, res: any, next: any) => {
    // Invalidate cache after request completes
    res.on('finish', () => {
      if (res.statusCode < 300) {
        const deleted = cacheService.delByPattern(pattern);
        logger.info('Cache invalidated', { pattern, deleted });
      }
    });
    next();
  };
};

export default cacheService;