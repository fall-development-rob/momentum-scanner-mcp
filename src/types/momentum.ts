import { Timeframe } from './timeframe';

/**
 * Momentum direction
 */
export type MomentumDirection = 'bullish' | 'bearish' | 'neutral';

/**
 * Momentum strength level
 */
export type MomentumStrength = 'strong' | 'moderate' | 'weak';

/**
 * OHLCV candle data
 */
export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Momentum analysis result for a single timeframe
 */
export interface MomentumResult {
  timeframe: Timeframe;
  symbol: string;
  timestamp: number;
  direction: MomentumDirection;
  strength: MomentumStrength;
  score: number; // -100 to 100
  rsi?: number;
  macdSignal?: number;
  volumeRatio?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Multi-timeframe analysis result
 */
export interface MultiTimeframeResult {
  symbol: string;
  timestamp: number;
  results: Map<Timeframe, MomentumResult>;
  alignment: TimeframeAlignment;
  overallDirection: MomentumDirection;
  overallStrength: MomentumStrength;
  confluenceScore: number; // 0 to 100
}

/**
 * Timeframe alignment analysis
 */
export interface TimeframeAlignment {
  aligned: boolean;
  alignedTimeframes: Timeframe[];
  divergentTimeframes: Timeframe[];
  dominantDirection: MomentumDirection;
  alignmentScore: number; // 0 to 100
  weightedScore: number; // Weighted by timeframe importance
}

/**
 * Analysis request parameters
 */
export interface AnalysisRequest {
  symbol: string;
  timeframes: Timeframe[];
  lookback?: number; // Number of candles to analyze
  indicators?: ('rsi' | 'macd' | 'volume')[];
}

/**
 * Analysis error
 */
export class AnalysisError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly timeframe?: Timeframe,
    public readonly symbol?: string
  ) {
    super(message);
    this.name = 'AnalysisError';
  }
}

/**
 * OHLCV data structure for candlestick data (alias for Candle)
 */
export type OHLCV = Candle;

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
  /** Timeframes to analyze (e.g., '1h', '4h', '1d') */
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
 * Complete momentum scan result for MCP tool
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
 * Input parameters for momentum_scan MCP tool
 */
export interface MomentumScanInput {
  /** Trading symbol (e.g., 'BTC/USD') */
  symbol: string;
  /** Timeframes to analyze */
  timeframes?: string[];
  /** Scan configuration */
  config?: ScanConfig;
}
