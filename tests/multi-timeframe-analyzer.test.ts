import { 
  MultiTimeframeAnalyzer, 
  DataProvider 
} from '../src/analysis/multi-timeframe-analyzer';
import { Candle, MomentumResult } from '../src/types/momentum';
import { Timeframe, TIMEFRAMES } from '../src/types/timeframe';

function generateCandles(
  count: number,
  startPrice: number = 100,
  trend: 'up' | 'down' | 'sideways' = 'sideways'
): Candle[] {
  const candles: Candle[] = [];
  let price = startPrice;
  const now = Date.now();
  const intervalMs = 60000;

  for (let i = 0; i < count; i++) {
    let change = 0;
    const volatility = 0.02;
    
    if (trend === 'up') {
      change = (Math.random() * volatility * 1.5 - volatility * 0.3) * price;
    } else if (trend === 'down') {
      change = (Math.random() * volatility * 0.3 - volatility * 1.5) * price;
    } else {
      change = (Math.random() * volatility * 2 - volatility) * price;
    }

    const open = price;
    price += change;
    const close = price;
    const high = Math.max(open, close) * 1.01;
    const low = Math.min(open, close) * 0.99;
    const volume = 1000 + Math.random() * 500;

    candles.push({
      timestamp: now - (count - i) * intervalMs,
      open, high, low, close, volume,
    });
  }

  return candles;
}

class MockDataProvider implements DataProvider {
  private trendByTimeframe: Map<Timeframe, 'up' | 'down' | 'sideways'> = new Map();
  private callCount = 0;

  setTrend(timeframe: Timeframe, trend: 'up' | 'down' | 'sideways'): void {
    this.trendByTimeframe.set(timeframe, trend);
  }

  setAllTrends(trend: 'up' | 'down' | 'sideways'): void {
    for (const tf of TIMEFRAMES) {
      this.trendByTimeframe.set(tf, trend);
    }
  }

  getCallCount(): number {
    return this.callCount;
  }

  resetCallCount(): void {
    this.callCount = 0;
  }

  async getCandles(symbol: string, timeframe: Timeframe, limit: number): Promise<Candle[]> {
    this.callCount++;
    const trend = this.trendByTimeframe.get(timeframe) || 'sideways';
    return generateCandles(limit, 100, trend);
  }
}

describe('MultiTimeframeAnalyzer', () => {
  let dataProvider: MockDataProvider;
  let analyzer: MultiTimeframeAnalyzer;

  beforeEach(() => {
    dataProvider = new MockDataProvider();
    analyzer = new MultiTimeframeAnalyzer(dataProvider);
  });

  describe('analyze', () => {
    it('should analyze multiple timeframes', async () => {
      const result = await analyzer.analyze({
        symbol: 'BTC',
        timeframes: ['1h', '4h', '1d'],
      });

      expect(result.symbol).toBe('BTC');
      expect(result.results.size).toBe(3);
      expect(result.results.has('1h')).toBe(true);
      expect(result.results.has('4h')).toBe(true);
      expect(result.results.has('1d')).toBe(true);
    });

    it('should run analysis concurrently', async () => {
      const startTime = Date.now();
      
      await analyzer.analyze({
        symbol: 'BTC',
        timeframes: ['1m', '5m', '15m', '1h', '4h', '1d'],
      });

      // All 6 timeframes should be analyzed
      expect(dataProvider.getCallCount()).toBe(6);
    });

    it('should calculate alignment', async () => {
      dataProvider.setAllTrends('up');
      
      const result = await analyzer.analyze({
        symbol: 'BTC',
        timeframes: ['1h', '4h', '1d'],
      });

      expect(result.alignment).toBeDefined();
      expect(result.alignment.aligned).toBeDefined();
      expect(result.alignment.alignedTimeframes).toBeDefined();
      expect(result.alignment.divergentTimeframes).toBeDefined();
      expect(result.alignment.dominantDirection).toBeDefined();
      expect(result.alignment.alignmentScore).toBeGreaterThanOrEqual(0);
      expect(result.alignment.alignmentScore).toBeLessThanOrEqual(100);
    });

    it('should detect strong alignment when all timeframes agree', async () => {
      dataProvider.setAllTrends('up');
      
      const result = await analyzer.analyze({
        symbol: 'BTC',
        timeframes: ['1h', '4h', '1d'],
      });

      // When all timeframes have same trend, alignment should be high
      expect(result.alignment.alignmentScore).toBeGreaterThan(50);
    });

    it('should calculate overall direction and strength', async () => {
      const result = await analyzer.analyze({
        symbol: 'BTC',
        timeframes: ['1h', '4h'],
      });

      expect(['bullish', 'bearish', 'neutral']).toContain(result.overallDirection);
      expect(['strong', 'moderate', 'weak']).toContain(result.overallStrength);
      expect(result.confluenceScore).toBeGreaterThanOrEqual(0);
      expect(result.confluenceScore).toBeLessThanOrEqual(100);
    });

    it('should filter invalid timeframes', async () => {
      const result = await analyzer.analyze({
        symbol: 'BTC',
        timeframes: ['1h', 'invalid' as Timeframe, '4h'],
      });

      expect(result.results.size).toBe(2);
      expect(result.results.has('1h')).toBe(true);
      expect(result.results.has('4h')).toBe(true);
    });

    it('should throw error for no valid timeframes', async () => {
      await expect(analyzer.analyze({
        symbol: 'BTC',
        timeframes: ['invalid' as Timeframe],
      })).rejects.toThrow('No valid timeframes');
    });
  });

  describe('caching', () => {
    it('should cache results', async () => {
      await analyzer.analyze({
        symbol: 'BTC',
        timeframes: ['1h'],
      });

      dataProvider.resetCallCount();

      // Second call should use cache
      await analyzer.analyze({
        symbol: 'BTC',
        timeframes: ['1h'],
      });

      expect(dataProvider.getCallCount()).toBe(0);
    });

    it('should fetch only missing timeframes', async () => {
      await analyzer.analyze({
        symbol: 'BTC',
        timeframes: ['1h'],
      });

      dataProvider.resetCallCount();

      await analyzer.analyze({
        symbol: 'BTC',
        timeframes: ['1h', '4h'],
      });

      // Only 4h should be fetched
      expect(dataProvider.getCallCount()).toBe(1);
    });

    it('should clear cache', async () => {
      await analyzer.analyze({
        symbol: 'BTC',
        timeframes: ['1h'],
      });

      analyzer.clearCache();
      dataProvider.resetCallCount();

      await analyzer.analyze({
        symbol: 'BTC',
        timeframes: ['1h'],
      });

      expect(dataProvider.getCallCount()).toBe(1);
    });

    it('should invalidate cache for specific symbol', async () => {
      await analyzer.analyze({
        symbol: 'BTC',
        timeframes: ['1h'],
      });
      await analyzer.analyze({
        symbol: 'ETH',
        timeframes: ['1h'],
      });

      analyzer.invalidateCache('BTC');
      dataProvider.resetCallCount();

      await analyzer.analyze({
        symbol: 'BTC',
        timeframes: ['1h'],
      });
      await analyzer.analyze({
        symbol: 'ETH',
        timeframes: ['1h'],
      });

      // Only BTC should be fetched
      expect(dataProvider.getCallCount()).toBe(1);
    });
  });

  describe('analyzeSingle', () => {
    it('should analyze a single timeframe', async () => {
      const result = await analyzer.analyzeSingle('BTC', '1h');

      expect(result.symbol).toBe('BTC');
      expect(result.timeframe).toBe('1h');
      expect(result.direction).toBeDefined();
      expect(result.score).toBeDefined();
    });

    it('should use cache for single analysis', async () => {
      await analyzer.analyzeSingle('BTC', '1h');
      dataProvider.resetCallCount();
      
      await analyzer.analyzeSingle('BTC', '1h');

      expect(dataProvider.getCallCount()).toBe(0);
    });
  });

  describe('analyzeAllTimeframes', () => {
    it('should analyze all 6 timeframes', async () => {
      const result = await analyzer.analyzeAllTimeframes('BTC');

      expect(result.results.size).toBe(6);
      for (const tf of TIMEFRAMES) {
        expect(result.results.has(tf)).toBe(true);
      }
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      await analyzer.analyze({
        symbol: 'BTC',
        timeframes: ['1h', '4h'],
      });

      const stats = analyzer.getCacheStats();
      expect(stats.size).toBe(2);
    });
  });
});
