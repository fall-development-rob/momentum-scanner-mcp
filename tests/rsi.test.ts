import {
  calculateRSI,
  calculatePriceChanges,
  separateGainsAndLosses,
  calculateInitialAverage,
  calculateWilderSmoothedAverage,
  calculateRSIValue,
  getLatestRSI,
  isOverbought,
  isOversold,
  RSIResult,
} from '../src/indicators/rsi';

describe('RSI Indicator', () => {
  describe('calculatePriceChanges', () => {
    it('should calculate price changes correctly', () => {
      const prices = [100, 102, 101, 105, 103];
      const changes = calculatePriceChanges(prices);
      expect(changes).toEqual([2, -1, 4, -2]);
    });

    it('should return empty array for single price', () => {
      const changes = calculatePriceChanges([100]);
      expect(changes).toEqual([]);
    });

    it('should handle zero changes', () => {
      const prices = [100, 100, 100];
      const changes = calculatePriceChanges(prices);
      expect(changes).toEqual([0, 0]);
    });
  });

  describe('separateGainsAndLosses', () => {
    it('should separate gains and losses correctly', () => {
      const changes = [2, -1, 4, -2, 0];
      const { gains, losses } = separateGainsAndLosses(changes);
      expect(gains).toEqual([2, 0, 4, 0, 0]);
      expect(losses).toEqual([0, 1, 0, 2, 0]);
    });

    it('should handle all gains', () => {
      const changes = [1, 2, 3];
      const { gains, losses } = separateGainsAndLosses(changes);
      expect(gains).toEqual([1, 2, 3]);
      expect(losses).toEqual([0, 0, 0]);
    });

    it('should handle all losses', () => {
      const changes = [-1, -2, -3];
      const { gains, losses } = separateGainsAndLosses(changes);
      expect(gains).toEqual([0, 0, 0]);
      expect(losses).toEqual([1, 2, 3]);
    });
  });

  describe('calculateInitialAverage', () => {
    it('should calculate simple average correctly', () => {
      const values = [2, 4, 6, 8, 10];
      const avg = calculateInitialAverage(values, 5);
      expect(avg).toBe(6);
    });

    it('should only use first n values', () => {
      const values = [2, 4, 6, 8, 10, 12, 14];
      const avg = calculateInitialAverage(values, 3);
      expect(avg).toBe(4);
    });
  });

  describe('calculateWilderSmoothedAverage', () => {
    it('should calculate Wilder smoothed average correctly', () => {
      // Formula: ((prevAvg * (period - 1)) + currentValue) / period
      const result = calculateWilderSmoothedAverage(10, 5, 14);
      // ((10 * 13) + 5) / 14 = 135 / 14 ≈ 9.642857
      expect(result).toBeCloseTo(9.642857, 5);
    });

    it('should maintain average when value equals average', () => {
      const result = calculateWilderSmoothedAverage(10, 10, 14);
      expect(result).toBe(10);
    });
  });

  describe('calculateRSIValue', () => {
    it('should return 50 when avg gain equals avg loss', () => {
      const rsi = calculateRSIValue(1, 1);
      expect(rsi).toBe(50);
    });

    it('should return 100 when no losses and some gains', () => {
      const rsi = calculateRSIValue(1, 0);
      expect(rsi).toBe(100);
    });

    it('should return 50 when both are zero', () => {
      const rsi = calculateRSIValue(0, 0);
      expect(rsi).toBe(50);
    });

    it('should return ~66.67 when gain is double the loss', () => {
      // RS = 2/1 = 2
      // RSI = 100 - (100 / (1 + 2)) = 100 - 33.33 = 66.67
      const rsi = calculateRSIValue(2, 1);
      expect(rsi).toBeCloseTo(66.67, 1);
    });

    it('should return ~33.33 when loss is double the gain', () => {
      // RS = 1/2 = 0.5
      // RSI = 100 - (100 / (1 + 0.5)) = 100 - 66.67 = 33.33
      const rsi = calculateRSIValue(1, 2);
      expect(rsi).toBeCloseTo(33.33, 1);
    });
  });

  describe('calculateRSI', () => {
    it('should calculate RSI with default period of 14', () => {
      // Generate sample data with enough prices
      const prices = [
        44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84,
        46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41,
        46.22, 45.64
      ];

      const result = calculateRSI(prices);

      expect(result.period).toBe(14);
      expect(result.values.length).toBe(prices.length);

      // First 14 values should be NaN
      for (let i = 0; i < 14; i++) {
        expect(isNaN(result.values[i])).toBe(true);
      }

      // Subsequent values should be valid numbers between 0 and 100
      for (let i = 14; i < result.values.length; i++) {
        expect(isNaN(result.values[i])).toBe(false);
        expect(result.values[i]).toBeGreaterThanOrEqual(0);
        expect(result.values[i]).toBeLessThanOrEqual(100);
      }
    });

    it('should calculate RSI with custom period', () => {
      const prices = [100, 102, 101, 105, 103, 106, 108, 107, 110, 112];
      const result = calculateRSI(prices, { period: 5 });

      expect(result.period).toBe(5);
      expect(result.values.length).toBe(prices.length);

      // First 5 values should be NaN
      for (let i = 0; i < 5; i++) {
        expect(isNaN(result.values[i])).toBe(true);
      }
    });

    it('should throw error for insufficient data', () => {
      const prices = [100, 102, 101];
      expect(() => calculateRSI(prices, { period: 5 })).toThrow('Insufficient data');
    });

    it('should throw error for empty prices array', () => {
      expect(() => calculateRSI([])).toThrow('Prices array cannot be empty');
    });

    it('should throw error for zero period', () => {
      const prices = [100, 102, 101, 105, 103];
      expect(() => calculateRSI(prices, { period: 0 })).toThrow('Period must be a positive number');
    });

    it('should throw error for negative period', () => {
      const prices = [100, 102, 101, 105, 103];
      expect(() => calculateRSI(prices, { period: -1 })).toThrow('Period must be a positive number');
    });

    it('should throw error for non-integer period', () => {
      const prices = [100, 102, 101, 105, 103, 106, 108];
      expect(() => calculateRSI(prices, { period: 3.5 })).toThrow('Period must be an integer');
    });

    it('should throw error for invalid price values', () => {
      const prices = [100, NaN, 101, 105, 103];
      expect(() => calculateRSI(prices, { period: 2 })).toThrow('Invalid price at index 1');
    });

    it('should return high RSI for strong uptrend', () => {
      // Strong uptrend data
      const prices = [100, 102, 104, 106, 108, 110, 112, 114, 116, 118, 120, 122, 124, 126, 128];
      const result = calculateRSI(prices);
      const latestRSI = getLatestRSI(result);

      expect(latestRSI).toBeGreaterThan(70); // Should indicate overbought
    });

    it('should return low RSI for strong downtrend', () => {
      // Strong downtrend data
      const prices = [128, 126, 124, 122, 120, 118, 116, 114, 112, 110, 108, 106, 104, 102, 100];
      const result = calculateRSI(prices);
      const latestRSI = getLatestRSI(result);

      expect(latestRSI).toBeLessThan(30); // Should indicate oversold
    });

    it('should return RSI around 50 for mixed movement', () => {
      // Alternating up and down by same amount
      const prices = [100, 102, 100, 102, 100, 102, 100, 102, 100, 102, 100, 102, 100, 102, 100];
      const result = calculateRSI(prices);
      const latestRSI = getLatestRSI(result);

      expect(latestRSI).toBeGreaterThan(40);
      expect(latestRSI).toBeLessThan(60);
    });
  });

  describe('getLatestRSI', () => {
    it('should return the latest valid RSI value', () => {
      const result: RSIResult = {
        values: [NaN, NaN, NaN, 50, 55, 60],
        period: 3,
      };
      expect(getLatestRSI(result)).toBe(60);
    });

    it('should return NaN if all values are NaN', () => {
      const result: RSIResult = {
        values: [NaN, NaN, NaN],
        period: 3,
      };
      expect(isNaN(getLatestRSI(result))).toBe(true);
    });
  });

  describe('isOverbought', () => {
    it('should return true for RSI above 70', () => {
      expect(isOverbought(75)).toBe(true);
      expect(isOverbought(100)).toBe(true);
    });

    it('should return false for RSI at or below 70', () => {
      expect(isOverbought(70)).toBe(false);
      expect(isOverbought(50)).toBe(false);
    });

    it('should use custom threshold', () => {
      expect(isOverbought(75, 80)).toBe(false);
      expect(isOverbought(85, 80)).toBe(true);
    });

    it('should return false for NaN', () => {
      expect(isOverbought(NaN)).toBe(false);
    });
  });

  describe('isOversold', () => {
    it('should return true for RSI below 30', () => {
      expect(isOversold(25)).toBe(true);
      expect(isOversold(0)).toBe(true);
    });

    it('should return false for RSI at or above 30', () => {
      expect(isOversold(30)).toBe(false);
      expect(isOversold(50)).toBe(false);
    });

    it('should use custom threshold', () => {
      expect(isOversold(25, 20)).toBe(false);
      expect(isOversold(15, 20)).toBe(true);
    });

    it('should return false for NaN', () => {
      expect(isOversold(NaN)).toBe(false);
    });
  });

  describe('RSI calculation accuracy', () => {
    it('should match known RSI calculation example', () => {
      // This test uses a known example to verify accuracy
      // Sample data with known RSI values
      const prices = [
        44.34, 44.09, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84,
        46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03,
        46.41, 46.22, 45.64
      ];

      const result = calculateRSI(prices);

      // The first RSI value (at index 14) should be around 70
      // This is based on the standard RSI calculation example
      expect(result.values[14]).toBeGreaterThan(65);
      expect(result.values[14]).toBeLessThan(75);
    });
  });
});
