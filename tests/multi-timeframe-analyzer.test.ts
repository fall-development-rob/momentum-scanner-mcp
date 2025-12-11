import { MultiTimeframeAnalyzer, DataProvider } from '../src/analysis/multi-timeframe-analyzer';
import { Candle } from '../src/types/momentum';
import { Timeframe, TIMEFRAMES } from '../src/types/timeframe';

function generateCandles(count: number): Candle[] {
  const candles: Candle[] = []; let price = 100; const now = Date.now();
  for (let i = 0; i < count; i++) {
    const open = price; price += (Math.random() - 0.5) * 2; const close = price;
    candles.push({ timestamp: now - (count - i) * 60000, open, high: Math.max(open, close) * 1.01, low: Math.min(open, close) * 0.99, close, volume: 1000 + Math.random() * 500 });
  }
  return candles;
}

class MockDataProvider implements DataProvider {
  private callCount = 0;
  getCallCount() { return this.callCount; }
  resetCallCount() { this.callCount = 0; }
  async getCandles(_s: string, _tf: Timeframe, limit: number): Promise<Candle[]> { this.callCount++; return generateCandles(limit); }
}

describe('MultiTimeframeAnalyzer', () => {
  let dp: MockDataProvider;
  let analyzer: MultiTimeframeAnalyzer;
  beforeEach(() => { dp = new MockDataProvider(); analyzer = new MultiTimeframeAnalyzer(dp); });

  it('should analyze multiple timeframes', async () => { const r = await analyzer.analyze({ symbol: 'BTC', timeframes: ['1h', '4h', '1d'] }); expect(r.results.size).toBe(3); });
  it('should run analysis concurrently', async () => { await analyzer.analyze({ symbol: 'BTC', timeframes: ['1m', '5m', '15m', '1h', '4h', '1d'] }); expect(dp.getCallCount()).toBe(6); });
  it('should calculate alignment', async () => { const r = await analyzer.analyze({ symbol: 'BTC', timeframes: ['1h', '4h', '1d'] }); expect(r.alignment.alignmentScore).toBeGreaterThanOrEqual(0); });
  it('should cache results', async () => { await analyzer.analyze({ symbol: 'BTC', timeframes: ['1h'] }); dp.resetCallCount(); await analyzer.analyze({ symbol: 'BTC', timeframes: ['1h'] }); expect(dp.getCallCount()).toBe(0); });
  it('should fetch only missing timeframes', async () => { await analyzer.analyze({ symbol: 'BTC', timeframes: ['1h'] }); dp.resetCallCount(); await analyzer.analyze({ symbol: 'BTC', timeframes: ['1h', '4h'] }); expect(dp.getCallCount()).toBe(1); });
  it('should clear cache', async () => { await analyzer.analyze({ symbol: 'BTC', timeframes: ['1h'] }); analyzer.clearCache(); dp.resetCallCount(); await analyzer.analyze({ symbol: 'BTC', timeframes: ['1h'] }); expect(dp.getCallCount()).toBe(1); });
  it('should analyze all timeframes', async () => { const r = await analyzer.analyzeAllTimeframes('BTC'); expect(r.results.size).toBe(6); });
  it('should filter invalid timeframes', async () => { const r = await analyzer.analyze({ symbol: 'BTC', timeframes: ['1h', 'invalid' as Timeframe, '4h'] }); expect(r.results.size).toBe(2); });
  it('should throw for no valid timeframes', async () => { await expect(analyzer.analyze({ symbol: 'BTC', timeframes: ['invalid' as Timeframe] })).rejects.toThrow('No valid timeframes'); });
});
