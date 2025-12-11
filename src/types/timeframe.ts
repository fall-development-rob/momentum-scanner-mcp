/**
 * Supported timeframe types for multi-timeframe analysis
 */
export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

/**
 * All supported timeframes in ascending order
 */
export const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

/**
 * Timeframe duration in milliseconds
 */
export const TIMEFRAME_MS: Record<Timeframe, number> = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
};

/**
 * Timeframe weight for alignment scoring (higher timeframes have more weight)
 */
export const TIMEFRAME_WEIGHT: Record<Timeframe, number> = {
  '1m': 1,
  '5m': 2,
  '15m': 3,
  '1h': 5,
  '4h': 8,
  '1d': 13,
};

/**
 * Validate if a string is a valid timeframe
 */
export function isValidTimeframe(value: string): value is Timeframe {
  return TIMEFRAMES.includes(value as Timeframe);
}

/**
 * Get timeframe index (0-based) for ordering
 */
export function getTimeframeIndex(timeframe: Timeframe): number {
  return TIMEFRAMES.indexOf(timeframe);
}

/**
 * Compare two timeframes
 * @returns negative if a < b, 0 if equal, positive if a > b
 */
export function compareTimeframes(a: Timeframe, b: Timeframe): number {
  return getTimeframeIndex(a) - getTimeframeIndex(b);
}
