import {
  Timeframe,
  TIMEFRAMES,
  TIMEFRAME_MS,
  TIMEFRAME_WEIGHT,
  isValidTimeframe,
  getTimeframeIndex,
  compareTimeframes,
} from '../src/types/timeframe';

describe('Timeframe Types', () => {
  describe('TIMEFRAMES constant', () => {
    it('should contain all 6 supported timeframes', () => {
      expect(TIMEFRAMES).toHaveLength(6);
      expect(TIMEFRAMES).toEqual(['1m', '5m', '15m', '1h', '4h', '1d']);
    });

    it('should be in ascending order', () => {
      for (let i = 1; i < TIMEFRAMES.length; i++) {
        expect(TIMEFRAME_MS[TIMEFRAMES[i]]).toBeGreaterThan(
          TIMEFRAME_MS[TIMEFRAMES[i - 1]]
        );
      }
    });
  });

  describe('TIMEFRAME_MS', () => {
    it('should have correct millisecond values', () => {
      expect(TIMEFRAME_MS['1m']).toBe(60 * 1000);
      expect(TIMEFRAME_MS['5m']).toBe(5 * 60 * 1000);
      expect(TIMEFRAME_MS['15m']).toBe(15 * 60 * 1000);
      expect(TIMEFRAME_MS['1h']).toBe(60 * 60 * 1000);
      expect(TIMEFRAME_MS['4h']).toBe(4 * 60 * 60 * 1000);
      expect(TIMEFRAME_MS['1d']).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('TIMEFRAME_WEIGHT', () => {
    it('should have increasing weights for higher timeframes', () => {
      expect(TIMEFRAME_WEIGHT['1m']).toBeLessThan(TIMEFRAME_WEIGHT['5m']);
      expect(TIMEFRAME_WEIGHT['5m']).toBeLessThan(TIMEFRAME_WEIGHT['15m']);
      expect(TIMEFRAME_WEIGHT['15m']).toBeLessThan(TIMEFRAME_WEIGHT['1h']);
      expect(TIMEFRAME_WEIGHT['1h']).toBeLessThan(TIMEFRAME_WEIGHT['4h']);
      expect(TIMEFRAME_WEIGHT['4h']).toBeLessThan(TIMEFRAME_WEIGHT['1d']);
    });
  });

  describe('isValidTimeframe', () => {
    it('should return true for valid timeframes', () => {
      expect(isValidTimeframe('1m')).toBe(true);
      expect(isValidTimeframe('5m')).toBe(true);
      expect(isValidTimeframe('15m')).toBe(true);
      expect(isValidTimeframe('1h')).toBe(true);
      expect(isValidTimeframe('4h')).toBe(true);
      expect(isValidTimeframe('1d')).toBe(true);
    });

    it('should return false for invalid timeframes', () => {
      expect(isValidTimeframe('2m')).toBe(false);
      expect(isValidTimeframe('30m')).toBe(false);
      expect(isValidTimeframe('1w')).toBe(false);
      expect(isValidTimeframe('')).toBe(false);
      expect(isValidTimeframe('invalid')).toBe(false);
    });
  });

  describe('getTimeframeIndex', () => {
    it('should return correct indices', () => {
      expect(getTimeframeIndex('1m')).toBe(0);
      expect(getTimeframeIndex('5m')).toBe(1);
      expect(getTimeframeIndex('15m')).toBe(2);
      expect(getTimeframeIndex('1h')).toBe(3);
      expect(getTimeframeIndex('4h')).toBe(4);
      expect(getTimeframeIndex('1d')).toBe(5);
    });
  });

  describe('compareTimeframes', () => {
    it('should return negative when first is smaller', () => {
      expect(compareTimeframes('1m', '5m')).toBeLessThan(0);
      expect(compareTimeframes('1h', '1d')).toBeLessThan(0);
    });

    it('should return positive when first is larger', () => {
      expect(compareTimeframes('5m', '1m')).toBeGreaterThan(0);
      expect(compareTimeframes('1d', '1h')).toBeGreaterThan(0);
    });

    it('should return zero when equal', () => {
      expect(compareTimeframes('1h', '1h')).toBe(0);
      expect(compareTimeframes('1d', '1d')).toBe(0);
    });
  });
});
