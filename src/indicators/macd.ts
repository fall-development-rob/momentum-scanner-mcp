/**
 * MACD (Moving Average Convergence Divergence) Indicator
 *
 * MACD is a trend-following momentum indicator that shows the relationship
 * between two exponential moving averages of a security's price.
 *
 * Components:
 * - MACD Line: 12-period EMA minus 26-period EMA
 * - Signal Line: 9-period EMA of the MACD Line
 * - Histogram: MACD Line minus Signal Line
 */

import { calculateEMA, calculateEMAFromSeries } from './ema';

/**
 * MACD configuration options
 */
export interface MACDConfig {
  /** Fast EMA period (default: 12) */
  fastPeriod: number;
  /** Slow EMA period (default: 26) */
  slowPeriod: number;
  /** Signal line period (default: 9) */
  signalPeriod: number;
}

/**
 * Single MACD data point
 */
export interface MACDDataPoint {
  /** MACD line value (fast EMA - slow EMA) */
  macd: number;
  /** Signal line value (EMA of MACD) */
  signal: number;
  /** Histogram value (MACD - Signal) */
  histogram: number;
}

/**
 * Crossover event types
 */
export type CrossoverType = 'bullish' | 'bearish' | 'none';

/**
 * Crossover detection result
 */
export interface CrossoverEvent {
  /** Index in the data array where crossover occurred */
  index: number;
  /** Type of crossover */
  type: CrossoverType;
  /** MACD value at crossover */
  macdValue: number;
  /** Signal value at crossover */
  signalValue: number;
  /** Histogram value at crossover */
  histogramValue: number;
}

/**
 * Complete MACD calculation result
 */
export interface MACDResult {
  /** Array of MACD data points aligned with input prices */
  values: MACDDataPoint[];
  /** Configuration used for calculation */
  config: MACDConfig;
  /** Detected crossover events */
  crossovers: CrossoverEvent[];
  /** Fast EMA values (for debugging/analysis) */
  fastEMA: number[];
  /** Slow EMA values (for debugging/analysis) */
  slowEMA: number[];
}

/**
 * Default MACD configuration (12, 26, 9)
 */
export const DEFAULT_MACD_CONFIG: MACDConfig = {
  fastPeriod: 12,
  slowPeriod: 26,
  signalPeriod: 9,
};

/**
 * Validate MACD configuration
 */
function validateConfig(config: MACDConfig): void {
  if (config.fastPeriod <= 0 || config.slowPeriod <= 0 || config.signalPeriod <= 0) {
    throw new Error('All periods must be positive numbers');
  }
  if (config.fastPeriod >= config.slowPeriod) {
    throw new Error('Fast period must be less than slow period');
  }
}

/**
 * Calculate MACD indicator
 *
 * @param prices - Array of closing prices (oldest first)
 * @param config - MACD configuration (default: 12, 26, 9)
 * @returns Complete MACD result with values and crossovers
 */
export function calculateMACD(
  prices: number[],
  config: Partial<MACDConfig> = {}
): MACDResult {
  const fullConfig: MACDConfig = { ...DEFAULT_MACD_CONFIG, ...config };
  validateConfig(fullConfig);

  const { fastPeriod, slowPeriod, signalPeriod } = fullConfig;
  const minDataPoints = slowPeriod + signalPeriod - 1;

  if (prices.length < minDataPoints) {
    throw new Error(
      `Insufficient data: need at least ${minDataPoints} prices for MACD(${fastPeriod},${slowPeriod},${signalPeriod}), got ${prices.length}`
    );
  }

  // Calculate fast and slow EMAs
  const fastEMAResult = calculateEMA(prices, fastPeriod);
  const slowEMAResult = calculateEMA(prices, slowPeriod);

  const fastEMA = fastEMAResult.values;
  const slowEMA = slowEMAResult.values;

  // Calculate MACD line (fast EMA - slow EMA)
  const macdLine: number[] = fastEMA.map((fast, i) => {
    if (isNaN(fast) || isNaN(slowEMA[i])) {
      return NaN;
    }
    return fast - slowEMA[i];
  });

  // Calculate Signal line (EMA of MACD)
  const signalLine = calculateEMAFromSeries(macdLine, signalPeriod);

  // Calculate Histogram (MACD - Signal)
  const histogram: number[] = macdLine.map((macd, i) => {
    if (isNaN(macd) || isNaN(signalLine[i])) {
      return NaN;
    }
    return macd - signalLine[i];
  });

  // Build result values
  const values: MACDDataPoint[] = prices.map((_, i) => ({
    macd: macdLine[i],
    signal: signalLine[i],
    histogram: histogram[i],
  }));

  // Detect crossovers
  const crossovers = detectCrossovers(values);

  return {
    values,
    config: fullConfig,
    crossovers,
    fastEMA,
    slowEMA,
  };
}

/**
 * Detect bullish and bearish crossovers in MACD data
 *
 * Bullish crossover: MACD crosses above Signal line
 * Bearish crossover: MACD crosses below Signal line
 *
 * @param values - Array of MACD data points
 * @returns Array of crossover events
 */
export function detectCrossovers(values: MACDDataPoint[]): CrossoverEvent[] {
  const crossovers: CrossoverEvent[] = [];

  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1];
    const curr = values[i];

    // Skip if either point has NaN values
    if (
      isNaN(prev.macd) || isNaN(prev.signal) ||
      isNaN(curr.macd) || isNaN(curr.signal)
    ) {
      continue;
    }

    const prevDiff = prev.macd - prev.signal;
    const currDiff = curr.macd - curr.signal;

    // Bullish crossover: MACD crosses from below to above signal
    if (prevDiff <= 0 && currDiff > 0) {
      crossovers.push({
        index: i,
        type: 'bullish',
        macdValue: curr.macd,
        signalValue: curr.signal,
        histogramValue: curr.histogram,
      });
    }
    // Bearish crossover: MACD crosses from above to below signal
    else if (prevDiff >= 0 && currDiff < 0) {
      crossovers.push({
        index: i,
        type: 'bearish',
        macdValue: curr.macd,
        signalValue: curr.signal,
        histogramValue: curr.histogram,
      });
    }
  }

  return crossovers;
}

/**
 * Get the latest crossover from MACD data
 *
 * @param result - MACD calculation result
 * @returns Latest crossover event or null if none found
 */
export function getLatestCrossover(result: MACDResult): CrossoverEvent | null {
  if (result.crossovers.length === 0) {
    return null;
  }
  return result.crossovers[result.crossovers.length - 1];
}

/**
 * Check if MACD is above zero line (bullish bias)
 *
 * @param result - MACD calculation result
 * @returns true if latest MACD value is above zero
 */
export function isBullish(result: MACDResult): boolean {
  const latest = result.values[result.values.length - 1];
  return !isNaN(latest.macd) && latest.macd > 0;
}

/**
 * Check if MACD is below zero line (bearish bias)
 *
 * @param result - MACD calculation result
 * @returns true if latest MACD value is below zero
 */
export function isBearish(result: MACDResult): boolean {
  const latest = result.values[result.values.length - 1];
  return !isNaN(latest.macd) && latest.macd < 0;
}

/**
 * Check if histogram is increasing (momentum increasing)
 *
 * @param result - MACD calculation result
 * @param periods - Number of periods to check (default: 3)
 * @returns true if histogram has been consistently increasing
 */
export function isHistogramIncreasing(result: MACDResult, periods: number = 3): boolean {
  const values = result.values;
  if (values.length < periods + 1) {
    return false;
  }

  for (let i = values.length - periods; i < values.length; i++) {
    const prev = values[i - 1];
    const curr = values[i];
    if (isNaN(prev.histogram) || isNaN(curr.histogram)) {
      return false;
    }
    if (curr.histogram <= prev.histogram) {
      return false;
    }
  }

  return true;
}

/**
 * Check if histogram is decreasing (momentum decreasing)
 *
 * @param result - MACD calculation result
 * @param periods - Number of periods to check (default: 3)
 * @returns true if histogram has been consistently decreasing
 */
export function isHistogramDecreasing(result: MACDResult, periods: number = 3): boolean {
  const values = result.values;
  if (values.length < periods + 1) {
    return false;
  }

  for (let i = values.length - periods; i < values.length; i++) {
    const prev = values[i - 1];
    const curr = values[i];
    if (isNaN(prev.histogram) || isNaN(curr.histogram)) {
      return false;
    }
    if (curr.histogram >= prev.histogram) {
      return false;
    }
  }

  return true;
}
