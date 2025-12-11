import { ResultCache } from '../src/cache/result-cache';
import {
  MomentumResult,
  MomentumDirection,
  MomentumStrength,
} from '../src/types/momentum';
import { Timeframe } from '../src/types/timeframe';

function createMockResult(
  symbol: string,
  timeframe: Timeframe,
  direction: MomentumDirection = 'bullish',
  score: number = 50
): MomentumResult {
  return {
    symbol,
    timeframe,
    timestamp: Date.now(),
    direction,
    strength: 'moderate' as MomentumStrength,
    score,
    rsi: 55,
    macdSignal: 0.5,
    volumeRatio: 1.2,
  };
}

describe('ResultCache', () => {
  let cache: ResultCache;

  beforeEach(() => {
    cache = new ResultCache();
  });

  describe('get and set', () => {
    it('should store and retrieve results', () => {
      const result = createMockResult('BTC', '1h');
      cache.set(result);

      const retrieved = cache.get('BTC', '1h');
      expect(retrieved).toEqual(result);
    });

    it('should return null for non-existent entries', () => {
      const retrieved = cache.get('ETH', '1h');
      expect(retrieved).toBeNull();
    });

    it('should separate results by symbol and timeframe', () => {
      const btc1h = createMockResult('BTC', '1h');
      const btc4h = createMockResult('BTC', '4h');
      const eth1h = createMockResult('ETH', '1h');

      cache.set(btc1h);
      cache.set(btc4h);
      cache.set(eth1h);

      expect(cache.get('BTC', '1h')).toEqual(btc1h);
      expect(cache.get('BTC', '4h')).toEqual(btc4h);
      expect(cache.get('ETH', '1h')).toEqual(eth1h);
      expect(cache.get('ETH', '4h')).toBeNull();
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      const shortTtlCache = new ResultCache({ defaultTtlMs: 50 });
      // Use 1m which has 0.5x multiplier = 25ms TTL
      const result = createMockResult('BTC', '1m');
      shortTtlCache.set(result);

      expect(shortTtlCache.get('BTC', '1m')).toEqual(result);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(shortTtlCache.get('BTC', '1m')).toBeNull();
    });
  });

  describe('setMany and getMany', () => {
    it('should set multiple results at once', () => {
      const results = [
        createMockResult('BTC', '1m'),
        createMockResult('BTC', '5m'),
        createMockResult('BTC', '1h'),
      ];

      cache.setMany(results);

      expect(cache.get('BTC', '1m')).toEqual(results[0]);
      expect(cache.get('BTC', '5m')).toEqual(results[1]);
      expect(cache.get('BTC', '1h')).toEqual(results[2]);
    });

    it('should get multiple results at once', () => {
      const results = [
        createMockResult('BTC', '1m'),
        createMockResult('BTC', '5m'),
      ];
      cache.setMany(results);

      const retrieved = cache.getMany('BTC', ['1m', '5m', '1h']);

      expect(retrieved.get('1m')).toEqual(results[0]);
      expect(retrieved.get('5m')).toEqual(results[1]);
      expect(retrieved.get('1h')).toBeNull();
    });
  });

  describe('has', () => {
    it('should return true for existing entries', () => {
      cache.set(createMockResult('BTC', '1h'));
      expect(cache.has('BTC', '1h')).toBe(true);
    });

    it('should return false for non-existent entries', () => {
      expect(cache.has('BTC', '1h')).toBe(false);
    });
  });

  describe('invalidate', () => {
    it('should invalidate a specific timeframe', () => {
      cache.set(createMockResult('BTC', '1h'));
      cache.set(createMockResult('BTC', '4h'));

      cache.invalidate('BTC', '1h');

      expect(cache.get('BTC', '1h')).toBeNull();
      expect(cache.get('BTC', '4h')).not.toBeNull();
    });

    it('should invalidate all timeframes for a symbol', () => {
      cache.set(createMockResult('BTC', '1h'));
      cache.set(createMockResult('BTC', '4h'));
      cache.set(createMockResult('ETH', '1h'));

      cache.invalidate('BTC');

      expect(cache.get('BTC', '1h')).toBeNull();
      expect(cache.get('BTC', '4h')).toBeNull();
      expect(cache.get('ETH', '1h')).not.toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      cache.set(createMockResult('BTC', '1h'));
      cache.set(createMockResult('ETH', '1h'));

      cache.clear();

      expect(cache.get('BTC', '1h')).toBeNull();
      expect(cache.get('ETH', '1h')).toBeNull();
      expect(cache.stats().size).toBe(0);
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entries when max size reached', () => {
      const smallCache = new ResultCache({ maxEntries: 3 });

      smallCache.set(createMockResult('A', '1h'));
      smallCache.set(createMockResult('B', '1h'));
      smallCache.set(createMockResult('C', '1h'));

      // This should evict 'A'
      smallCache.set(createMockResult('D', '1h'));

      expect(smallCache.get('A', '1h')).toBeNull();
      expect(smallCache.get('B', '1h')).not.toBeNull();
      expect(smallCache.get('C', '1h')).not.toBeNull();
      expect(smallCache.get('D', '1h')).not.toBeNull();
    });

    it('should update access order on get', () => {
      const smallCache = new ResultCache({ maxEntries: 3 });

      smallCache.set(createMockResult('A', '1h'));
      smallCache.set(createMockResult('B', '1h'));
      smallCache.set(createMockResult('C', '1h'));

      // Access 'A' to make it recently used
      smallCache.get('A', '1h');

      // This should evict 'B' (now oldest) instead of 'A'
      smallCache.set(createMockResult('D', '1h'));

      expect(smallCache.get('A', '1h')).not.toBeNull();
      expect(smallCache.get('B', '1h')).toBeNull();
      expect(smallCache.get('C', '1h')).not.toBeNull();
      expect(smallCache.get('D', '1h')).not.toBeNull();
    });
  });

  describe('stats', () => {
    it('should return cache statistics', () => {
      const cache = new ResultCache({ maxEntries: 100 });

      cache.set(createMockResult('BTC', '1h'));
      cache.set(createMockResult('ETH', '1h'));

      const stats = cache.stats();
      expect(stats.size).toBe(2);
      expect(stats.maxEntries).toBe(100);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      // Use 1m timeframe which has 0.5x TTL multiplier, so effective TTL = 25ms
      const cache = new ResultCache({ defaultTtlMs: 50 });

      cache.set(createMockResult('BTC', '1m'));
      cache.set(createMockResult('ETH', '1m'));

      // Wait for expiration (25ms * 2 to be safe)
      await new Promise((resolve) => setTimeout(resolve, 60));

      const removed = cache.cleanup();
      expect(removed).toBe(2);
      expect(cache.stats().size).toBe(0);
    });
  });
});
