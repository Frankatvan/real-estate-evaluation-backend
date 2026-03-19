import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { cacheService } from '../../services/cacheService';

describe('CacheService', () => {
  beforeEach(() => {
    // Clear cache before each test
    cacheService.flushAll();
  });

  afterEach(() => {
    // Clean up after each test
    cacheService.flushAll();
  });

  describe('Basic operations', () => {
    test('should set and get values', () => {
      const key = 'test-key';
      const value = { data: 'test data' };

      cacheService.set(key, value);
      const retrieved = cacheService.get(key);

      expect(retrieved).toEqual(value);
    });

    test('should return undefined for non-existent keys', () => {
      const result = cacheService.get('non-existent-key');
      expect(result).toBeUndefined();
    });

    test('should delete values', () => {
      const key = 'test-key';
      const value = { data: 'test data' };

      cacheService.set(key, value);
      expect(cacheService.has(key)).toBe(true);

      cacheService.del(key);
      expect(cacheService.has(key)).toBe(false);
    });

    test('should check if key exists', () => {
      const key = 'test-key';
      const value = { data: 'test data' };

      expect(cacheService.has(key)).toBe(false);

      cacheService.set(key, value);
      expect(cacheService.has(key)).toBe(true);
    });
  });

  describe('TTL (Time To Live)', () => {
    test('should expire values after TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test data' };
      const ttl = 1; // 1 second

      cacheService.set(key, value, ttl);
      expect(cacheService.has(key)).toBe(true);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(cacheService.has(key)).toBe(false);
    });

    test('should not expire values before TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test data' };
      const ttl = 2; // 2 seconds

      cacheService.set(key, value, ttl);

      // Wait less than TTL
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(cacheService.has(key)).toBe(true);
    });
  });

  describe('getOrSet pattern', () => {
    test('should return cached value if exists', async () => {
      const key = 'test-key';
      const value = { data: 'cached data' };
      const fetchFn = jest.fn().mockResolvedValue({ data: 'fresh data' });

      cacheService.set(key, value);

      const result = await cacheService.getOrSet(key, fetchFn);

      expect(result).toEqual(value);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    test('should fetch and cache value if not exists', async () => {
      const key = 'test-key';
      const freshValue = { data: 'fresh data' };
      const fetchFn = jest.fn().mockResolvedValue(freshValue);

      const result = await cacheService.getOrSet(key, fetchFn);

      expect(result).toEqual(freshValue);
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(cacheService.get(key)).toEqual(freshValue);
    });
  });

  describe('Statistics', () => {
    test('should track cache hits and misses', () => {
      const key = 'test-key';
      const value = { data: 'test data' };

      // Miss
      cacheService.get(key);

      // Set and hit
      cacheService.set(key, value);
      cacheService.get(key);

      const stats = cacheService.getStats();

      expect(stats.hitCount).toBe(1);
      expect(stats.missCount).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    test('should calculate hit rate correctly', () => {
      const key = 'test-key';
      const value = { data: 'test data' };

      cacheService.set(key, value);

      // 3 hits, 1 miss
      cacheService.get(key);
      cacheService.get(key);
      cacheService.get(key);
      cacheService.get('other-key');

      const stats = cacheService.getStats();

      expect(stats.hitCount).toBe(3);
      expect(stats.missCount).toBe(1);
      expect(stats.hitRate).toBe(0.75);
    });
  });

  describe('Pattern operations', () => {
    test('should delete keys by pattern', () => {
      cacheService.set('user:1', { id: 1 });
      cacheService.set('user:2', { id: 2 });
      cacheService.set('project:1', { id: 1 });

      const deleted = cacheService.delByPattern('user:*');

      expect(deleted).toBe(2);
      expect(cacheService.has('user:1')).toBe(false);
      expect(cacheService.has('user:2')).toBe(false);
      expect(cacheService.has('project:1')).toBe(true);
    });

    test('should set multiple values', () => {
      const items = [
        { key: 'key1', value: { data: 'value1' } },
        { key: 'key2', value: { data: 'value2' } },
        { key: 'key3', value: { data: 'value3' } }
      ];

      cacheService.setMany(items);

      expect(cacheService.has('key1')).toBe(true);
      expect(cacheService.has('key2')).toBe(true);
      expect(cacheService.has('key3')).toBe(true);
    });

    test('should get multiple values', () => {
      cacheService.set('key1', { data: 'value1' });
      cacheService.set('key2', { data: 'value2' });

      const results = cacheService.getMany(['key1', 'key2', 'key3']);

      expect(results['key1']).toEqual({ data: 'value1' });
      expect(results['key2']).toEqual({ data: 'value2' });
      expect(results['key3']).toBeUndefined();
    });
  });

  describe('Flush operations', () => {
    test('should flush all cache', () => {
      cacheService.set('key1', { data: 'value1' });
      cacheService.set('key2', { data: 'value2' });

      expect(cacheService.has('key1')).toBe(true);
      expect(cacheService.has('key2')).toBe(true);

      cacheService.flushAll();

      expect(cacheService.has('key1')).toBe(false);
      expect(cacheService.has('key2')).toBe(false);
    });
  });
});