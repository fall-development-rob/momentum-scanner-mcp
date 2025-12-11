/**
 * MACD (Moving Average Convergence Divergence) Indicator Calculator
 * Implements the classic MACD formula:
 * - MACD Line = 12-period EMA - 26-period EMA
 * - Signal Line = 9-period EMA of MACD Line
 * - Histogram = MACD Line - Signal Line
 */

export interface MACDConfig {
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
}

export interface MACDResult {
  macd: number;
  signal: number;
  histogram: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  crossover: 'bullish_cross' | 'bearish_cross' | 'none';
}

/**
 * Default MACD configuration
 */
export const DEFAULT_MACD_CONFIG: MACDConfig = {
  fastPeriod: 12,
  slowPeriod: 26,
  signalPeriod: 9,
};

/**
 * Calculates Exponential Moving Average (EMA)
 * @param prices Array of prices
 * @param period EMA period
 * @returns Array of EMA values
 */
export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length < period) {
    throw new Error(
      `Insufficient price data: need at least ${period} prices, got ${prices.length}`
    );
  }

  const multiplier = 2 / (period + 1);
  const ema: number[] = [];

  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  ema.push(sum / period);

  // Calculate subsequent EMAs
  for (let i = period; i < prices.length; i++) {
    const newEMA = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
    ema.push(newEMA);
  }

  return ema;
}

/**
 * Calculates MACD from price data
 * @param prices Array of closing prices
 * @param config MACD configuration
 * @returns MACD calculation result
 */
export function calculateMACD(
  prices: number[],
  config: MACDConfig = DEFAULT_MACD_CONFIG
): MACDResult {
  const { fastPeriod, slowPeriod, signalPeriod } = config;

  const minDataPoints = slowPeriod + signalPeriod;
  if (prices.length < minDataPoints) {
    throw new Error(
      `Insufficient price data: need at least ${minDataPoints} prices, got ${prices.length}`
    );
  }

  // Calculate fast and slow EMAs
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);

  // Align arrays (slow EMA has fewer values due to longer period)
  const offset = fastPeriod - 1;
  const macdLine: number[] = [];

  for (let i = slowPeriod - fastPeriod; i < slowEMA.length; i++) {
    const fastIdx = i + (slowPeriod - fastPeriod);
    if (fastIdx < fastEMA.length) {
      macdLine.push(fastEMA[fastIdx] - slowEMA[i]);
    }
  }

  // Calculate signal line (EMA of MACD line)
  const signalLine = calculateEMA(macdLine, signalPeriod);

  // Get current values
  const currentMACD = macdLine[macdLine.length - 1];
  const currentSignal = signalLine[signalLine.length - 1];
  const currentHistogram = currentMACD - currentSignal;

  // Determine trend
  let trend: MACDResult['trend'] = 'neutral';
  if (currentHistogram > 0.1) {
    trend = 'bullish';
  } else if (currentHistogram < -0.1) {
    trend = 'bearish';
  }

  // Detect crossover
  let crossover: MACDResult['crossover'] = 'none';
  if (signalLine.length >= 2 && macdLine.length >= 2) {
    const prevMACD = macdLine[macdLine.length - 2];
    const prevSignal = signalLine[signalLine.length - 2];

    // Bullish crossover: MACD crosses above signal
    if (prevMACD <= prevSignal && currentMACD > currentSignal) {
      crossover = 'bullish_cross';
    }
    // Bearish crossover: MACD crosses below signal
    else if (prevMACD >= prevSignal && currentMACD < currentSignal) {
      crossover = 'bearish_cross';
    }
  }

  return {
    macd: Math.round(currentMACD * 10000) / 10000,
    signal: Math.round(currentSignal * 10000) / 10000,
    histogram: Math.round(currentHistogram * 10000) / 10000,
    trend,
    crossover,
  };
}

/**
 * Calculates MACD with full history
 * Returns arrays of MACD values for charting
 */
export function calculateMACDHistory(
  prices: number[],
  config: MACDConfig = DEFAULT_MACD_CONFIG
): {
  macdLine: number[];
  signalLine: number[];
  histogram: number[];
  dates?: Date[];
} {
  const { fastPeriod, slowPeriod, signalPeriod } = config;

  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);

  const macdLine: number[] = [];
  for (let i = slowPeriod - fastPeriod; i < slowEMA.length; i++) {
    const fastIdx = i + (slowPeriod - fastPeriod);
    if (fastIdx < fastEMA.length) {
      macdLine.push(fastEMA[fastIdx] - slowEMA[i]);
    }
  }

  const signalLine = calculateEMA(macdLine, signalPeriod);
  const histogram: number[] = [];

  // Align for histogram calculation
  const signalOffset = signalPeriod - 1;
  for (let i = signalOffset; i < macdLine.length; i++) {
    histogram.push(macdLine[i] - signalLine[i - signalOffset]);
  }

  return {
    macdLine: macdLine.map((v) => Math.round(v * 10000) / 10000),
    signalLine: signalLine.map((v) => Math.round(v * 10000) / 10000),
    histogram: histogram.map((v) => Math.round(v * 10000) / 10000),
  };
}

/**
 * Detects MACD divergence
 * Compares price direction with MACD histogram direction
 */
export function detectMACDDivergence(
  prices: number[],
  config: MACDConfig = DEFAULT_MACD_CONFIG
): 'bullish' | 'bearish' | 'none' {
  const history = calculateMACDHistory(prices, config);

  if (history.histogram.length < 5) {
    return 'none';
  }

  const recentHistogram = history.histogram.slice(-5);
  const recentPrices = prices.slice(-5);

  // Check price direction
  const priceDirection = recentPrices[recentPrices.length - 1] - recentPrices[0];
  const histogramDirection =
    recentHistogram[recentHistogram.length - 1] - recentHistogram[0];

  // Bullish divergence: price down, histogram up
  if (priceDirection < 0 && histogramDirection > 0) {
    return 'bullish';
  }

  // Bearish divergence: price up, histogram down
  if (priceDirection > 0 && histogramDirection < 0) {
    return 'bearish';
  }

  return 'none';
}
