import { MomentumAnalyzer } from '../src/analysis/momentum-analyzer';
import { Candle } from '../src/types/momentum';

function generateCandles(count: number, trend: 'up' | 'down' | 'sideways' = 'sideways'): Candle[] {
  const candles: Candle[] = []; let price = 100; const now = Date.now();
  for (let i = 0; i < count; i++) {
    let change = 0; const v = 0.02;
    if (trend === 'up') change = (Math.random() * v * 1.5 - v * 0.3) * price;
    else if (trend === 'down') change = (Math.random() * v * 0.3 - v * 1.5) * price;
    else change = (Math.random() * v * 2 - v) * price;
    const open = price; price += change; const close = price;
    candles.push({ timestamp: now - (count - i) * 60000, open, high: Math.max(open, close) * 1.01, low: Math.min(open, close) * 0.99, close, volume: 1000 + Math.random() * 500 });
  }
  return candles;
}

describe('MomentumAnalyzer', () => {
  let analyzer: MomentumAnalyzer;
  beforeEach(() => { analyzer = new MomentumAnalyzer(); });

  it('should analyze momentum for sufficient data', () => { const r = analyzer.analyze('BTC', '1h', generateCandles(50)); expect(r.symbol).toBe('BTC'); expect(r.score).toBeGreaterThanOrEqual(-100); });
  it('should throw error for insufficient data', () => { expect(() => analyzer.analyze('BTC', '1h', generateCandles(10))).toThrow('Insufficient candles'); });
  it('should calculate RSI', () => { const r = analyzer.analyze('BTC', '1h', generateCandles(50)); expect(r.rsi).toBeGreaterThanOrEqual(0); expect(r.rsi).toBeLessThanOrEqual(100); });
  it('should calculate MACD signal', () => { const r = analyzer.analyze('BTC', '1h', generateCandles(50)); expect(typeof r.macdSignal).toBe('number'); });
  it('should calculate volume ratio', () => { const r = analyzer.analyze('BTC', '1h', generateCandles(50)); expect(r.volumeRatio).toBeGreaterThan(0); });
  it('should include metadata', () => { const r = analyzer.analyze('BTC', '1h', generateCandles(50)); expect(r.metadata?.candleCount).toBe(50); });
});
