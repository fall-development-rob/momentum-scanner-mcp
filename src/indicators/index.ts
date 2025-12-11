/**
 * Technical Indicators Module
 *
 * Exports all technical indicator calculations and utilities
 */

// EMA utilities
export {
  calculateEMA,
  calculateEMAFromSeries,
  calculateSMA,
  getEMAMultiplier,
  type EMAResult,
} from './ema';

// MACD indicator
export {
  calculateMACD,
  detectCrossovers,
  getLatestCrossover,
  isBullish,
  isBearish,
  isHistogramIncreasing,
  isHistogramDecreasing,
  DEFAULT_MACD_CONFIG,
  type MACDConfig,
  type MACDDataPoint,
  type MACDResult,
  type CrossoverType,
  type CrossoverEvent,
} from './macd';
