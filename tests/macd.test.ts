import {
  calculateMACD,
  detectCrossovers,
  getLatestCrossover,
  isBullish,
  isBearish,
  isHistogramIncreasing,
  isHistogramDecreasing,
  DEFAULT_MACD_CONFIG,
  MACDDataPoint,
} from '../src/indicators/macd';

describe('MACD Indicator', () => {
  // Generate sample price data with enough points for MACD calculation
  const generatePrices = (count: number, startPrice: number = 100, trend: 'up' | 'down' | 'flat' = 'up'): number[] => {
    const prices: number[] = [];
    let price = startPrice;
    for (let i = 0; i < count; i++) {
      const noise = (Math.random() - 0.5) * 2;
      if (trend === 'up') {
        price += 0.5 + noise;
      } else if (trend === 'down') {
        price -= 0.5 + noise;
      } else {
        price += noise;
      }
      prices.push(price);
    }
    return prices;
  };

  describe('DEFAULT_MACD_CONFIG', () => {
    it('has correct default values', () => {
      expect(DEFAULT_MACD_CONFIG.fastPeriod).toBe(12);
      expect(DEFAULT_MACD_CONFIG.slowPeriod).toBe(26);
      expect(DEFAULT_MACD_CONFIG.signalPeriod).toBe(9);
    });
  });

  describe('calculateMACD', () => {
    it('calculates MACD with default config', () => {
      const prices = generatePrices(50);
      const result = calculateMACD(prices);

      expect(result.values.length).toBe(prices.length);
      expect(result.config).toEqual(DEFAULT_MACD_CONFIG);
    });

    it('calculates MACD with custom config', () => {
      const prices = generatePrices(50);
      const config = { fastPeriod: 8, slowPeriod: 17, signalPeriod: 9 };
      const result = calculateMACD(prices, config);

      expect(result.config.fastPeriod).toBe(8);
      expect(result.config.slowPeriod).toBe(17);
      expect(result.config.signalPeriod).toBe(9);
    });

    it('returns NaN values before sufficient data', () => {
      const prices = generatePrices(50);
      const result = calculateMACD(prices);

      // First 25 values (slowPeriod - 1) should have NaN MACD
      for (let i = 0; i < 25; i++) {
        expect(result.values[i].macd).toBeNaN();
      }
    });

    it('MACD line equals fast EMA minus slow EMA', () => {
      const prices = generatePrices(50);
      const result = calculateMACD(prices);

      // Check values after both EMAs are available
      for (let i = 26; i < 50; i++) {
        const expectedMACD = result.fastEMA[i] - result.slowEMA[i];
        expect(result.values[i].macd).toBeCloseTo(expectedMACD, 10);
      }
    });

    it('histogram equals MACD minus signal', () => {
      const prices = generatePrices(50);
      const result = calculateMACD(prices);

      // Check values after signal is available
      for (let i = 34; i < 50; i++) {
        if (!isNaN(result.values[i].macd) && !isNaN(result.values[i].signal)) {
          const expectedHistogram = result.values[i].macd - result.values[i].signal;
          expect(result.values[i].histogram).toBeCloseTo(expectedHistogram, 10);
        }
      }
    });

    it('throws error for insufficient data', () => {
      const prices = generatePrices(30);
      expect(() => calculateMACD(prices)).toThrow('Insufficient data');
    });

    it('throws error if fast period >= slow period', () => {
      const prices = generatePrices(50);
      expect(() => calculateMACD(prices, { fastPeriod: 26, slowPeriod: 12 }))
        .toThrow('Fast period must be less than slow period');
    });

    it('throws error for zero periods', () => {
      const prices = generatePrices(50);
      expect(() => calculateMACD(prices, { fastPeriod: 0 }))
        .toThrow('All periods must be positive numbers');
    });

    it('includes fastEMA and slowEMA arrays', () => {
      const prices = generatePrices(50);
      const result = calculateMACD(prices);

      expect(result.fastEMA.length).toBe(prices.length);
      expect(result.slowEMA.length).toBe(prices.length);
    });

    it('detects crossovers', () => {
      const prices = generatePrices(100);
      const result = calculateMACD(prices);

      expect(Array.isArray(result.crossovers)).toBe(true);
    });
  });

  describe('detectCrossovers', () => {
    it('detects bullish crossover', () => {
      // Bullish crossover: MACD crosses from below to above signal
      const values: MACDDataPoint[] = [
        { macd: -2, signal: -1, histogram: -1 },   // macd < signal (below)
        { macd: -1, signal: -1, histogram: 0 },    // macd = signal (at signal)
        { macd: 0.5, signal: 0, histogram: 0.5 },  // macd > signal (above) - crossover here
      ];

      const crossovers = detectCrossovers(values);

      const bullish = crossovers.find(c => c.type === 'bullish');
      expect(bullish).toBeDefined();
      expect(bullish?.index).toBe(2);
    });

    it('detects bearish crossover', () => {
      // Bearish crossover: MACD crosses from above to below signal
      const values: MACDDataPoint[] = [
        { macd: 2, signal: 1, histogram: 1 },      // macd > signal (above)
        { macd: 1, signal: 1, histogram: 0 },      // macd = signal (at signal)
        { macd: -0.5, signal: 0, histogram: -0.5 },// macd < signal (below) - crossover here
      ];

      const crossovers = detectCrossovers(values);

      const bearish = crossovers.find(c => c.type === 'bearish');
      expect(bearish).toBeDefined();
      expect(bearish?.index).toBe(2);
    });

    it('handles NaN values gracefully', () => {
      const values: MACDDataPoint[] = [
        { macd: NaN, signal: NaN, histogram: NaN },
        { macd: 1, signal: 2, histogram: -1 },
        { macd: 3, signal: 2, histogram: 1 },
      ];

      const crossovers = detectCrossovers(values);
      expect(crossovers.length).toBe(1);
      expect(crossovers[0].type).toBe('bullish');
    });

    it('detects multiple crossovers', () => {
      const values: MACDDataPoint[] = [
        { macd: -1, signal: 0, histogram: -1 },
        { macd: 1, signal: 0, histogram: 1 },   // bullish
        { macd: 2, signal: 1, histogram: 1 },
        { macd: 0, signal: 1, histogram: -1 },  // bearish
        { macd: -1, signal: 0, histogram: -1 },
        { macd: 1, signal: 0, histogram: 1 },   // bullish
      ];

      const crossovers = detectCrossovers(values);
      expect(crossovers.length).toBe(3);
      expect(crossovers[0].type).toBe('bullish');
      expect(crossovers[1].type).toBe('bearish');
      expect(crossovers[2].type).toBe('bullish');
    });

    it('includes correct values in crossover event', () => {
      const values: MACDDataPoint[] = [
        { macd: -1, signal: 0, histogram: -1 },
        { macd: 1.5, signal: 0.5, histogram: 1 },
      ];

      const crossovers = detectCrossovers(values);
      expect(crossovers[0].macdValue).toBe(1.5);
      expect(crossovers[0].signalValue).toBe(0.5);
      expect(crossovers[0].histogramValue).toBe(1);
    });
  });

  describe('getLatestCrossover', () => {
    it('returns null when no crossovers', () => {
      const prices = generatePrices(35, 100, 'flat');
      const result = calculateMACD(prices);
      result.crossovers = []; // Force empty

      expect(getLatestCrossover(result)).toBeNull();
    });

    it('returns the most recent crossover', () => {
      const prices = generatePrices(50);
      const result = calculateMACD(prices);
      result.crossovers = [
        { index: 30, type: 'bullish', macdValue: 0.5, signalValue: 0.4, histogramValue: 0.1 },
        { index: 40, type: 'bearish', macdValue: -0.5, signalValue: -0.4, histogramValue: -0.1 },
      ];

      const latest = getLatestCrossover(result);
      expect(latest?.type).toBe('bearish');
      expect(latest?.index).toBe(40);
    });
  });

  describe('isBullish', () => {
    it('returns true when MACD is above zero', () => {
      const prices = generatePrices(50, 100, 'up');
      const result = calculateMACD(prices);
      result.values[result.values.length - 1] = { macd: 1.5, signal: 1.0, histogram: 0.5 };

      expect(isBullish(result)).toBe(true);
    });

    it('returns false when MACD is below zero', () => {
      const prices = generatePrices(50, 100, 'down');
      const result = calculateMACD(prices);
      result.values[result.values.length - 1] = { macd: -1.5, signal: -1.0, histogram: -0.5 };

      expect(isBullish(result)).toBe(false);
    });

    it('returns false when MACD is NaN', () => {
      const prices = generatePrices(50);
      const result = calculateMACD(prices);
      result.values[result.values.length - 1] = { macd: NaN, signal: NaN, histogram: NaN };

      expect(isBullish(result)).toBe(false);
    });
  });

  describe('isBearish', () => {
    it('returns true when MACD is below zero', () => {
      const prices = generatePrices(50);
      const result = calculateMACD(prices);
      result.values[result.values.length - 1] = { macd: -1.5, signal: -1.0, histogram: -0.5 };

      expect(isBearish(result)).toBe(true);
    });

    it('returns false when MACD is above zero', () => {
      const prices = generatePrices(50);
      const result = calculateMACD(prices);
      result.values[result.values.length - 1] = { macd: 1.5, signal: 1.0, histogram: 0.5 };

      expect(isBearish(result)).toBe(false);
    });

    it('returns false when MACD is NaN', () => {
      const prices = generatePrices(50);
      const result = calculateMACD(prices);
      result.values[result.values.length - 1] = { macd: NaN, signal: NaN, histogram: NaN };

      expect(isBearish(result)).toBe(false);
    });
  });

  describe('isHistogramIncreasing', () => {
    it('returns true when histogram is consistently increasing', () => {
      const prices = generatePrices(50);
      const result = calculateMACD(prices);

      // Set up increasing histogram values
      const len = result.values.length;
      result.values[len - 4] = { macd: 1, signal: 0.5, histogram: 0.1 };
      result.values[len - 3] = { macd: 1.2, signal: 0.6, histogram: 0.2 };
      result.values[len - 2] = { macd: 1.4, signal: 0.7, histogram: 0.3 };
      result.values[len - 1] = { macd: 1.6, signal: 0.8, histogram: 0.4 };

      expect(isHistogramIncreasing(result, 3)).toBe(true);
    });

    it('returns false when histogram is not consistently increasing', () => {
      const prices = generatePrices(50);
      const result = calculateMACD(prices);

      const len = result.values.length;
      result.values[len - 4] = { macd: 1, signal: 0.5, histogram: 0.3 };
      result.values[len - 3] = { macd: 1.2, signal: 0.6, histogram: 0.2 }; // decrease
      result.values[len - 2] = { macd: 1.4, signal: 0.7, histogram: 0.3 };
      result.values[len - 1] = { macd: 1.6, signal: 0.8, histogram: 0.4 };

      expect(isHistogramIncreasing(result, 3)).toBe(false);
    });

    it('returns false with insufficient data', () => {
      const prices = generatePrices(35);
      const result = calculateMACD(prices);
      result.values = [{ macd: 1, signal: 0.5, histogram: 0.5 }];

      expect(isHistogramIncreasing(result, 3)).toBe(false);
    });
  });

  describe('isHistogramDecreasing', () => {
    it('returns true when histogram is consistently decreasing', () => {
      const prices = generatePrices(50);
      const result = calculateMACD(prices);

      const len = result.values.length;
      result.values[len - 4] = { macd: 1.6, signal: 0.8, histogram: 0.4 };
      result.values[len - 3] = { macd: 1.4, signal: 0.7, histogram: 0.3 };
      result.values[len - 2] = { macd: 1.2, signal: 0.6, histogram: 0.2 };
      result.values[len - 1] = { macd: 1, signal: 0.5, histogram: 0.1 };

      expect(isHistogramDecreasing(result, 3)).toBe(true);
    });

    it('returns false when histogram is not consistently decreasing', () => {
      const prices = generatePrices(50);
      const result = calculateMACD(prices);

      const len = result.values.length;
      result.values[len - 4] = { macd: 1.6, signal: 0.8, histogram: 0.4 };
      result.values[len - 3] = { macd: 1.4, signal: 0.7, histogram: 0.5 }; // increase
      result.values[len - 2] = { macd: 1.2, signal: 0.6, histogram: 0.3 };
      result.values[len - 1] = { macd: 1, signal: 0.5, histogram: 0.2 };

      expect(isHistogramDecreasing(result, 3)).toBe(false);
    });

    it('returns false with insufficient data', () => {
      const prices = generatePrices(35);
      const result = calculateMACD(prices);
      result.values = [{ macd: 1, signal: 0.5, histogram: 0.5 }];

      expect(isHistogramDecreasing(result, 3)).toBe(false);
    });
  });

  describe('Integration tests', () => {
    it('correctly calculates MACD for uptrend', () => {
      // Generate a clear uptrend
      const prices: number[] = [];
      for (let i = 0; i < 50; i++) {
        prices.push(100 + i * 2);
      }

      const result = calculateMACD(prices);

      // In an uptrend, fast EMA should be above slow EMA
      // So MACD line should be positive
      const lastMACD = result.values[result.values.length - 1].macd;
      expect(lastMACD).toBeGreaterThan(0);
    });

    it('correctly calculates MACD for downtrend', () => {
      // Generate a clear downtrend
      const prices: number[] = [];
      for (let i = 0; i < 50; i++) {
        prices.push(200 - i * 2);
      }

      const result = calculateMACD(prices);

      // In a downtrend, fast EMA should be below slow EMA
      // So MACD line should be negative
      const lastMACD = result.values[result.values.length - 1].macd;
      expect(lastMACD).toBeLessThan(0);
    });
  });
});
