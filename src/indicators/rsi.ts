/**
 * RSI (Relative Strength Index) Indicator Calculator
 * Implements the classic RSI formula: RSI = 100 - (100 / (1 + RS))
 * where RS = Average Gain / Average Loss over the period
 */

export interface RSIConfig {
  period: number;
  overboughtLevel: number;
  oversoldLevel: number;
}

export interface RSIResult {
  value: number;
  signal: 'overbought' | 'oversold' | 'neutral';
  period: number;
  averageGain: number;
  averageLoss: number;
}

/**
 * Default RSI configuration
 */
export const DEFAULT_RSI_CONFIG: RSIConfig = {
  period: 14,
  overboughtLevel: 70,
  oversoldLevel: 30,
};

/**
 * Calculates RSI from price data
 * @param prices Array of closing prices (newest first or oldest first)
 * @param config RSI configuration
 * @returns RSI calculation result
 */
export function calculateRSI(
  prices: number[],
  config: RSIConfig = DEFAULT_RSI_CONFIG
): RSIResult {
  const { period, overboughtLevel, oversoldLevel } = config;

  if (prices.length < period + 1) {
    throw new Error(
      `Insufficient price data: need at least ${period + 1} prices, got ${prices.length}`
    );
  }

  // Calculate price changes
  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  // Separate gains and losses
  const gains = changes.map((c) => (c > 0 ? c : 0));
  const losses = changes.map((c) => (c < 0 ? Math.abs(c) : 0));

  // Calculate initial average gain and loss (SMA for first period)
  let avgGain =
    gains.slice(0, period).reduce((sum, g) => sum + g, 0) / period;
  let avgLoss =
    losses.slice(0, period).reduce((sum, l) => sum + l, 0) / period;

  // Use Wilder's smoothing for subsequent values
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }

  // Calculate RS and RSI
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);

  // Determine signal
  let signal: RSIResult['signal'] = 'neutral';
  if (rsi >= overboughtLevel) {
    signal = 'overbought';
  } else if (rsi <= oversoldLevel) {
    signal = 'oversold';
  }

  return {
    value: Math.round(rsi * 100) / 100,
    signal,
    period,
    averageGain: Math.round(avgGain * 10000) / 10000,
    averageLoss: Math.round(avgLoss * 10000) / 10000,
  };
}

/**
 * Calculates RSI with divergence detection
 * Compares price direction with RSI direction
 */
export function calculateRSIWithDivergence(
  prices: number[],
  config: RSIConfig = DEFAULT_RSI_CONFIG
): RSIResult & { divergence: 'bullish' | 'bearish' | 'none' } {
  const result = calculateRSI(prices, config);

  // Calculate RSI for previous period for divergence detection
  const prevPrices = prices.slice(0, -1);
  let divergence: 'bullish' | 'bearish' | 'none' = 'none';

  if (prevPrices.length >= config.period + 1) {
    const prevResult = calculateRSI(prevPrices, config);

    const priceDirection = prices[prices.length - 1] - prevPrices[prevPrices.length - 1];
    const rsiDirection = result.value - prevResult.value;

    // Bullish divergence: price making lower low, RSI making higher low
    if (priceDirection < 0 && rsiDirection > 0 && result.value < 50) {
      divergence = 'bullish';
    }
    // Bearish divergence: price making higher high, RSI making lower high
    else if (priceDirection > 0 && rsiDirection < 0 && result.value > 50) {
      divergence = 'bearish';
    }
  }

  return { ...result, divergence };
}

/**
 * Generates mock price data for testing
 */
export function generateMockPrices(count: number, basePrice: number = 100): number[] {
  const prices: number[] = [basePrice];
  for (let i = 1; i < count; i++) {
    const change = (Math.random() - 0.5) * 4; // Random change ±2%
    prices.push(prices[i - 1] * (1 + change / 100));
  }
  return prices;
}
