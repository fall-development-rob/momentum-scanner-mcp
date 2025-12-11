import { Timeframe, TIMEFRAMES, TIMEFRAME_MS, TIMEFRAME_WEIGHT, isValidTimeframe, getTimeframeIndex, compareTimeframes } from '../src/types/timeframe';

describe('Timeframe Types', () => {
  it('should contain all 6 supported timeframes', () => { expect(TIMEFRAMES).toHaveLength(6); expect(TIMEFRAMES).toEqual(['1m', '5m', '15m', '1h', '4h', '1d']); });
  it('should be in ascending order', () => { for (let i = 1; i < TIMEFRAMES.length; i++) expect(TIMEFRAME_MS[TIMEFRAMES[i]]).toBeGreaterThan(TIMEFRAME_MS[TIMEFRAMES[i - 1]]); });
  it('should have correct millisecond values', () => { expect(TIMEFRAME_MS['1m']).toBe(60000); expect(TIMEFRAME_MS['1d']).toBe(86400000); });
  it('should have increasing weights', () => { expect(TIMEFRAME_WEIGHT['1m']).toBeLessThan(TIMEFRAME_WEIGHT['1d']); });
  it('should validate timeframes correctly', () => { expect(isValidTimeframe('1h')).toBe(true); expect(isValidTimeframe('invalid')).toBe(false); });
  it('should return correct indices', () => { expect(getTimeframeIndex('1m')).toBe(0); expect(getTimeframeIndex('1d')).toBe(5); });
  it('should compare timeframes correctly', () => { expect(compareTimeframes('1m', '5m')).toBeLessThan(0); expect(compareTimeframes('1d', '1h')).toBeGreaterThan(0); });
});
