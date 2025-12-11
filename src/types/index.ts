/**
 * Core types for the Momentum Scanner MCP
 */

// Export timeframe types
export * from './timeframe';

// Export momentum types
export * from './momentum';

/**
 * RSI indicator result
 */
export interface RSIResult {
  /** RSI value (0-100) */
  value: number;
  /** Signal: overbought, oversold, or neutral */
  signal: 'overbought' | 'oversold' | 'neutral';
  /** Period used for calculation */
  period: number;
}

/**
 * MACD indicator result
 */
export interface MACDResult {
  /** MACD line value */
  macd: number;
  /** Signal line value */
  signal: number;
  /** Histogram value (MACD - Signal) */
  histogram: number;
  /** Trend signal */
  trend: 'bullish' | 'bearish' | 'neutral';
}

/**
 * Volume analysis result
 */
export interface VolumeAnalysis {
  /** Current volume */
  current: number;
  /** Average volume */
  average: number;
  /** Volume ratio (current/average) */
  ratio: number;
  /** Volume trend */
  trend: 'increasing' | 'decreasing' | 'stable';
}

/**
 * Scan configuration for momentum_scan tool
 */
export interface ScanConfig {
  /** Timeframes to analyze */
  timeframes?: string[];
  /** Whether to include RSI indicator */
  includeRSI?: boolean;
  /** RSI period (default: 14) */
  rsiPeriod?: number;
  /** Whether to include MACD indicator */
  includeMACD?: boolean;
  /** MACD fast period (default: 12) */
  macdFastPeriod?: number;
  /** MACD slow period (default: 26) */
  macdSlowPeriod?: number;
  /** MACD signal period (default: 9) */
  macdSignalPeriod?: number;
  /** Whether to include volume analysis */
  includeVolume?: boolean;
  /** Volume average period (default: 20) */
  volumePeriod?: number;
}

/**
 * Complete momentum scan result
 */
export interface MomentumScanResult {
  /** Symbol analyzed */
  symbol: string;
  /** Timeframe analyzed */
  timeframe: string;
  /** Analysis timestamp */
  timestamp: number;
  /** RSI indicator result */
  rsi?: RSIResult;
  /** MACD indicator result */
  macd?: MACDResult;
  /** Volume analysis result */
  volume?: VolumeAnalysis;
  /** Overall momentum signal */
  signal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
  /** Confidence score (0-100) */
  confidence: number;
}

/**
 * Input parameters for momentum_scan tool
 */
export interface MomentumScanInput {
  /** Trading symbol (e.g., 'BTC/USD') */
  symbol: string;
  /** Timeframes to analyze */
  timeframes?: string[];
  /** Scan configuration */
  config?: ScanConfig;
}
