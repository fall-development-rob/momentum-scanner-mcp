import { MomentumAnalyzer } from '../src/analysis/momentum-analyzer';
import { Candle } from '../src/types/momentum';
import { Timeframe } from '../src/types/timeframe';

function generateCandles(
  count: number,
  startPrice: number = 100,
  trend: 'up' | 'down' | 'sideways' = 'sideways',
  volatility: number = 0.02
): Candle[] {
  const candles: Candle[] = [];
  let price = startPrice;
  const now = Date.now();
  const intervalMs = 60000; // 1 minute

  for (let i = 0; i < count; i++) {
    let change = 0;
    
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
    const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
    const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
    const volume = 1000 + Math.random() * 500;

    candles.push({
      timestamp: now - (count - i) * intervalMs,
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return candles;
}

describe('MomentumAnalyzer', () => {
  let analyzer: MomentumAnalyzer;

  beforeEach(() => {
    analyzer = new MomentumAnalyzer();
  });

  describe('analyze', () => {
    it('should analyze momentum for sufficient data', () => {
      const candles = generateCandles(50);
      const result = analyzer.analyze('BTC', '1h', candles);

      expect(result.symbol).toBe('BTC');
      expect(result.timeframe).toBe('1h');
      expect(result.timestamp).toBeDefined();
      expect(['bullish', 'bearish', 'neutral']).toContain(result.direction);
      expect(['strong', 'moderate', 'weak']).toContain(result.strength);
      expect(result.score).toBeGreaterThanOrEqual(-100);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should throw error for insufficient data', () => {
      const candles = generateCandles(10); // Not enough for MACD

      expect(() => analyzer.analyze('BTC', '1h', candles)).toThrow('Insufficient candles');
    });

    it('should detect bullish momentum in uptrend', () => {
      const candles = generateCandles(100, 100, 'up', 0.015);
      const result = analyzer.analyze('BTC', '1h', candles);

      // In a strong uptrend, we expect bullish or at least not bearish
      expect(result.score).toBeGreaterThan(-50);
    });

    it('should detect bearish momentum in downtrend', () => {
      const candles = generateCandles(100, 100, 'down', 0.015);
      const result = analyzer.analyze('BTC', '1h', candles);

      // In a strong downtrend, we expect bearish or at least not strongly bullish
      expect(result.score).toBeLessThan(50);
    });

    it('should calculate RSI', () => {
      const candles = generateCandles(50);
      const result = analyzer.analyze('BTC', '1h', candles);

      expect(result.rsi).toBeDefined();
      expect(result.rsi).toBeGreaterThanOrEqual(0);
      expect(result.rsi).toBeLessThanOrEqual(100);
    });

    it('should calculate MACD signal', () => {
      const candles = generateCandles(50);
      const result = analyzer.analyze('BTC', '1h', candles);

      expect(result.macdSignal).toBeDefined();
      expect(typeof result.macdSignal).toBe('number');
    });

    it('should calculate volume ratio', () => {
      const candles = generateCandles(50);
      const result = analyzer.analyze('BTC', '1h', candles);

      expect(result.volumeRatio).toBeDefined();
      expect(result.volumeRatio).toBeGreaterThan(0);
    });

    it('should include metadata', () => {
      const candles = generateCandles(50);
      const result = analyzer.analyze('BTC', '1h', candles);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.candleCount).toBe(50);
      expect(result.metadata?.latestClose).toBeDefined();
    });
  });

  describe('custom configuration', () => {
    it('should use custom RSI period', () => {
      const customAnalyzer = new MomentumAnalyzer({ rsiPeriod: 7 });
      const candles = generateCandles(50);
      
      const result = customAnalyzer.analyze('BTC', '1h', candles);
      expect(result.rsi).toBeDefined();
    });

    it('should use custom MACD settings', () => {
      const customAnalyzer = new MomentumAnalyzer({
        macdFast: 8,
        macdSlow: 17,
        macdSignal: 6,
      });
      const candles = generateCandles(50);
      
      const result = customAnalyzer.analyze('BTC', '1h', candles);
      expect(result.macdSignal).toBeDefined();
    });
  });
});
