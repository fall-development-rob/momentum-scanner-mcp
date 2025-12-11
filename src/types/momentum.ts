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
