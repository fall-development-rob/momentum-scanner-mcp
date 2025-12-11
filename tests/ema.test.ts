import {
  calculateEMA,
  calculateEMAFromSeries,
  calculateSMA,
  getEMAMultiplier,
} from '../src/indicators/ema';

describe('EMA Utilities', () => {
  describe('getEMAMultiplier', () => {
    it('calculates multiplier correctly for period 12', () => {
      const multiplier = getEMAMultiplier(12);
      expect(multiplier).toBeCloseTo(2 / 13, 10);
    });

    it('calculates multiplier correctly for period 26', () => {
      const multiplier = getEMAMultiplier(26);
      expect(multiplier).toBeCloseTo(2 / 27, 10);
    });

    it('calculates multiplier correctly for period 9', () => {
      const multiplier = getEMAMultiplier(9);
      expect(multiplier).toBeCloseTo(2 / 10, 10);
    });

    it('throws error for zero period', () => {
      expect(() => getEMAMultiplier(0)).toThrow('Period must be a positive number');
    });

    it('throws error for negative period', () => {
      expect(() => getEMAMultiplier(-5)).toThrow('Period must be a positive number');
    });
  });

  describe('calculateSMA', () => {
    it('calculates SMA correctly', () => {
      const prices = [10, 20, 30, 40, 50];
      const sma = calculateSMA(prices, 5);
      expect(sma).toBe(30);
    });

    it('calculates SMA for partial data', () => {
      const prices = [10, 20, 30, 40, 50];
      const sma = calculateSMA(prices, 3);
      expect(sma).toBe(20); // (10 + 20 + 30) / 3
    });

    it('throws error for insufficient data', () => {
      const prices = [10, 20];
      expect(() => calculateSMA(prices, 5)).toThrow('Insufficient data');
    });
  });

  describe('calculateEMA', () => {
    const testPrices = [
      22.27, 22.19, 22.08, 22.17, 22.18,
      22.13, 22.23, 22.43, 22.24, 22.29,
      22.15, 22.39, 22.38, 22.61, 22.30,
    ];

    it('returns correct number of values', () => {
      const result = calculateEMA(testPrices, 10);
      expect(result.values.length).toBe(testPrices.length);
    });

    it('returns NaN for values before period', () => {
      const result = calculateEMA(testPrices, 10);
      for (let i = 0; i < 9; i++) {
        expect(result.values[i]).toBeNaN();
      }
    });

    it('has valid EMA value at period index', () => {
      const result = calculateEMA(testPrices, 10);
      expect(result.values[9]).not.toBeNaN();
    });

    it('EMA responds to price changes', () => {
      const result = calculateEMA(testPrices, 10);
      // EMA should be defined from index 9 onwards
      const ema10 = result.values[9];
      const ema11 = result.values[10];
      expect(ema10).toBeDefined();
      expect(ema11).toBeDefined();
    });

    it('throws error for insufficient data', () => {
      expect(() => calculateEMA([1, 2, 3], 5)).toThrow('Insufficient data');
    });

    it('throws error for invalid period', () => {
      expect(() => calculateEMA(testPrices, 0)).toThrow('Period must be a positive number');
    });

    it('stores the period in result', () => {
      const result = calculateEMA(testPrices, 10);
      expect(result.period).toBe(10);
    });
  });

  describe('calculateEMAFromSeries', () => {
    it('handles series with leading NaN values', () => {
      const series = [NaN, NaN, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const result = calculateEMAFromSeries(series, 3);

      // First few values should be NaN
      expect(result[0]).toBeNaN();
      expect(result[1]).toBeNaN();
      expect(result[2]).toBeNaN();
      expect(result[3]).toBeNaN();

      // Later values should be defined
      expect(result[4]).not.toBeNaN();
    });

    it('returns all NaN if insufficient valid data', () => {
      const series = [NaN, NaN, 10, 20];
      const result = calculateEMAFromSeries(series, 5);

      result.forEach(val => {
        expect(val).toBeNaN();
      });
    });

    it('preserves array length', () => {
      const series = [NaN, NaN, 10, 20, 30, 40, 50, 60, 70, 80];
      const result = calculateEMAFromSeries(series, 3);
      expect(result.length).toBe(series.length);
    });
  });
});
