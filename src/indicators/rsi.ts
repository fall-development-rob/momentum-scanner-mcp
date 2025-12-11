/**
 * Relative Strength Index (RSI) calculation utilities
 * Uses Wilder's smoothing method for accurate RSI calculation
 */

export interface RSIResult {
  values: number[];
  period: number;
}

export interface RSIOptions {
  period?: number;
}

const DEFAULT_RSI_PERIOD = 14;

/**
 * Calculate price changes (deltas) between consecutive prices
 * @param prices - Array of price values (oldest first)
 * @returns Array of price changes
 */
export function calculatePriceChanges(prices: number[]): number[] {
  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  return changes;
}

/**
 * Separate gains and losses from price changes
 * @param changes - Array of price changes
 * @returns Object containing arrays of gains and losses
 */
export function separateGainsAndLosses(changes: number[]): { gains: number[]; losses: number[] } {
  const gains: number[] = [];
  const losses: number[] = [];

  for (const change of changes) {
    if (change > 0) {
      gains.push(change);
      losses.push(0);
    } else if (change < 0) {
      gains.push(0);
      losses.push(Math.abs(change));
    } else {
      gains.push(0);
      losses.push(0);
    }
  }

  return { gains, losses };
}

/**
 * Calculate the initial average using Simple Moving Average (SMA)
 * Used for the first average gain/loss calculation
 * @param values - Array of values to average
 * @param period - Number of periods to average
 * @returns Simple average of the values
 */
export function calculateInitialAverage(values: number[], period: number): number {
  const slice = values.slice(0, period);
  return slice.reduce((sum, val) => sum + val, 0) / period;
}

/**
 * Calculate smoothed average using Wilder's smoothing method
 * Formula: ((Previous Average * (period - 1)) + Current Value) / period
 * @param previousAverage - Previous smoothed average
 * @param currentValue - Current value to incorporate
 * @param period - RSI period
 * @returns Smoothed average
 */
export function calculateWilderSmoothedAverage(
  previousAverage: number,
  currentValue: number,
  period: number
): number {
  return ((previousAverage * (period - 1)) + currentValue) / period;
}

/**
 * Calculate RSI from average gain and average loss
 * Formula: 100 - (100 / (1 + RS))
 * Where RS = Average Gain / Average Loss
 * @param avgGain - Average gain
 * @param avgLoss - Average loss
 * @returns RSI value (0-100)
 */
export function calculateRSIValue(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) {
    // If there are no losses, RSI is 100 (extremely overbought)
    return avgGain === 0 ? 50 : 100;
  }

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * Calculate Relative Strength Index (RSI) using Wilder's smoothing method
 *
 * The RSI is a momentum oscillator that measures the speed and magnitude
 * of recent price changes to evaluate overbought or oversold conditions.
 *
 * Calculation steps:
 * 1. Calculate price changes (deltas)
 * 2. Separate into gains (positive changes) and losses (absolute negative changes)
 * 3. Calculate initial averages using SMA for first 'period' values
 * 4. Use Wilder's smoothing for subsequent averages
 * 5. Calculate RS = Average Gain / Average Loss
 * 6. RSI = 100 - (100 / (1 + RS))
 *
 * @param prices - Array of price values (oldest first), typically closing prices
 * @param options - RSI configuration options
 * @returns RSIResult with calculated values (0-100 range)
 * @throws Error if insufficient data or invalid period
 */
export function calculateRSI(prices: number[], options: RSIOptions = {}): RSIResult {
  const period = options.period ?? DEFAULT_RSI_PERIOD;

  // Validate inputs
  if (period <= 0) {
    throw new Error('Period must be a positive number');
  }

  if (!Number.isInteger(period)) {
    throw new Error('Period must be an integer');
  }

  if (prices.length === 0) {
    throw new Error('Prices array cannot be empty');
  }

  // Need at least period + 1 prices to calculate one RSI value
  // (period prices for first average + 1 for the price change)
  const minimumPrices = period + 1;
  if (prices.length < minimumPrices) {
    throw new Error(`Insufficient data: need at least ${minimumPrices} prices, got ${prices.length}`);
  }

  // Validate that all prices are valid numbers
  for (let i = 0; i < prices.length; i++) {
    if (typeof prices[i] !== 'number' || isNaN(prices[i])) {
      throw new Error(`Invalid price at index ${i}: must be a valid number`);
    }
  }

  // Calculate price changes
  const changes = calculatePriceChanges(prices);

  // Separate gains and losses
  const { gains, losses } = separateGainsAndLosses(changes);

  const values: number[] = [];

  // Fill with NaN for values before we have enough data
  for (let i = 0; i < period; i++) {
    values.push(NaN);
  }

  // Calculate initial averages using SMA
  let avgGain = calculateInitialAverage(gains, period);
  let avgLoss = calculateInitialAverage(losses, period);

  // Calculate first RSI value
  const firstRSI = calculateRSIValue(avgGain, avgLoss);
  values.push(firstRSI);

  // Calculate subsequent RSI values using Wilder's smoothing
  for (let i = period; i < changes.length; i++) {
    avgGain = calculateWilderSmoothedAverage(avgGain, gains[i], period);
    avgLoss = calculateWilderSmoothedAverage(avgLoss, losses[i], period);

    const rsi = calculateRSIValue(avgGain, avgLoss);
    values.push(rsi);
  }

  return { values, period };
}

/**
 * Get the latest RSI value from the result
 * @param result - RSI calculation result
 * @returns Latest RSI value or NaN if no valid values
 */
export function getLatestRSI(result: RSIResult): number {
  for (let i = result.values.length - 1; i >= 0; i--) {
    if (!isNaN(result.values[i])) {
      return result.values[i];
    }
  }
  return NaN;
}

/**
 * Determine if RSI indicates overbought condition
 * Traditional threshold is RSI > 70
 * @param rsi - RSI value
 * @param threshold - Overbought threshold (default 70)
 * @returns true if overbought
 */
export function isOverbought(rsi: number, threshold: number = 70): boolean {
  return !isNaN(rsi) && rsi > threshold;
}

/**
 * Determine if RSI indicates oversold condition
 * Traditional threshold is RSI < 30
 * @param rsi - RSI value
 * @param threshold - Oversold threshold (default 30)
 * @returns true if oversold
 */
export function isOversold(rsi: number, threshold: number = 30): boolean {
  return !isNaN(rsi) && rsi < threshold;
}
