/**
 * Exponential Moving Average (EMA) calculation utilities
 * Used as the foundation for MACD and other technical indicators
 */

export interface EMAResult {
  values: number[];
  period: number;
}

/**
 * Calculate the EMA multiplier (smoothing factor)
 * Formula: 2 / (period + 1)
 */
export function getEMAMultiplier(period: number): number {
  if (period <= 0) {
    throw new Error('Period must be a positive number');
  }
  return 2 / (period + 1);
}

/**
 * Calculate Simple Moving Average for initial EMA seed value
 */
export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) {
    throw new Error(`Insufficient data: need at least ${period} prices`);
  }
  const slice = prices.slice(0, period);
  return slice.reduce((sum, price) => sum + price, 0) / period;
}

/**
 * Calculate Exponential Moving Average
 *
 * EMA = (Price * Multiplier) + (Previous EMA * (1 - Multiplier))
 *
 * @param prices - Array of price values (oldest first)
 * @param period - EMA period (e.g., 12, 26 for MACD)
 * @returns EMAResult with calculated values
 */
export function calculateEMA(prices: number[], period: number): EMAResult {
  if (prices.length < period) {
    throw new Error(`Insufficient data: need at least ${period} prices, got ${prices.length}`);
  }

  if (period <= 0) {
    throw new Error('Period must be a positive number');
  }

  const multiplier = getEMAMultiplier(period);
  const values: number[] = [];

  // First EMA value is the SMA of the first 'period' prices
  const initialSMA = calculateSMA(prices, period);

  // Fill with NaN for values before we have enough data
  for (let i = 0; i < period - 1; i++) {
    values.push(NaN);
  }

  values.push(initialSMA);

  // Calculate subsequent EMA values
  for (let i = period; i < prices.length; i++) {
    const previousEMA = values[values.length - 1];
    const currentPrice = prices[i];
    const ema = (currentPrice * multiplier) + (previousEMA * (1 - multiplier));
    values.push(ema);
  }

  return { values, period };
}

/**
 * Calculate EMA from an existing series (e.g., MACD line for signal)
 * This handles NaN values properly
 */
export function calculateEMAFromSeries(series: number[], period: number): number[] {
  // Filter out NaN values and track their positions
  const validIndices: number[] = [];
  const validValues: number[] = [];

  series.forEach((val, idx) => {
    if (!isNaN(val)) {
      validIndices.push(idx);
      validValues.push(val);
    }
  });

  if (validValues.length < period) {
    // Return all NaN if insufficient data
    return series.map(() => NaN);
  }

  const emaResult = calculateEMA(validValues, period);
  const result: number[] = new Array(series.length).fill(NaN);

  // Map EMA values back to original positions
  emaResult.values.forEach((val, idx) => {
    if (validIndices[idx] !== undefined) {
      result[validIndices[idx]] = val;
    }
  });

  return result;
}
