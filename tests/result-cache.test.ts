import { ResultCache } from '../src/cache/result-cache';
import { MomentumResult } from '../src/types/momentum';
import { Timeframe } from '../src/types/timeframe';

function mock(symbol: string, timeframe: Timeframe): MomentumResult {
  return { symbol, timeframe, timestamp: Date.now(), direction: 'bullish', strength: 'moderate', score: 50, rsi: 55 };
}

describe('ResultCache', () => {
  let cache: ResultCache;
  beforeEach(() => { cache = new ResultCache(); });

  it('should store and retrieve results', () => { const r = mock('BTC', '1h'); cache.set(r); expect(cache.get('BTC', '1h')).toEqual(r); });
  it('should return null for non-existent entries', () => { expect(cache.get('ETH', '1h')).toBeNull(); });
  it('should expire entries after TTL', async () => { const c = new ResultCache({ defaultTtlMs: 50 }); c.set(mock('BTC', '1m')); await new Promise((r) => setTimeout(r, 60)); expect(c.get('BTC', '1m')).toBeNull(); });
  it('should set and get multiple results', () => { const r = [mock('BTC', '1m'), mock('BTC', '5m')]; cache.setMany(r); expect(cache.get('BTC', '1m')).toEqual(r[0]); });
  it('should invalidate cache for symbol', () => { cache.set(mock('BTC', '1h')); cache.invalidate('BTC'); expect(cache.get('BTC', '1h')).toBeNull(); });
  it('should clear all entries', () => { cache.set(mock('BTC', '1h')); cache.clear(); expect(cache.stats().size).toBe(0); });
  it('should evict oldest entries', () => { const c = new ResultCache({ maxEntries: 2 }); c.set(mock('A', '1h')); c.set(mock('B', '1h')); c.set(mock('C', '1h')); expect(c.get('A', '1h')).toBeNull(); });
});
