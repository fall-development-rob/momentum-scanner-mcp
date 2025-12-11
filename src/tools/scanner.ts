/**
 * Multi-Symbol Momentum Scanner MCP Tool
 * Scans multiple symbols for momentum signals and ranks by strength
 */

import {
  MomentumScanResult,
  ScanConfig,
} from '../types/index.js';
import { Timeframe } from '../types/timeframe.js';
import { MomentumAnalyzer } from '../analysis/momentum-analyzer.js';
import { Candle } from '../types/momentum.js';

/**
 * Scanner input parameters
 */
export interface ScannerInput {
  /** Array of trading symbols to scan (e.g., ['BTC/USD', 'ETH/USD']) */
  symbols: string[];
  /** Timeframe for scanning (default: '1h') */
  timeframe?: string;
  /** Signal filter: 'all', 'bullish', or 'bearish' */
  signalFilter?: 'all' | 'bullish' | 'bearish';
  /** Minimum confidence threshold (0-100) */
  minConfidence?: number;
  /** Maximum number of results to return */
  limit?: number;
  /** Scan configuration */
  config?: ScanConfig;
}

/**
 * Ranked scanner result
 */
export interface RankedScanResult {
  /** Symbol analyzed */
  symbol: string;
  /** Timeframe analyzed */
  timeframe: string;
  /** Momentum score (-100 to 100) */
  momentumScore: number;
  /** Momentum direction */
  direction: 'bullish' | 'bearish' | 'neutral';
  /** Momentum strength */
  strength: 'strong' | 'moderate' | 'weak';
  /** RSI value */
  rsi?: number;
  /** MACD histogram */
  macdHistogram?: number;
  /** Volume ratio */
  volumeRatio?: number;
  /** Confidence score (0-100) */
  confidence: number;
  /** Analysis timestamp */
  timestamp: number;
}

/**
 * Scanner results wrapper
 */
export interface ScannerResults {
  /** Total symbols scanned */
  totalScanned: number;
  /** Number of results returned */
  resultsReturned: number;
  /** Timeframe used */
  timeframe: string;
  /** Applied signal filter */
  signalFilter: 'all' | 'bullish' | 'bearish';
  /** Ranked results */
  results: RankedScanResult[];
  /** Scan timestamp */
  timestamp: number;
}

/**
 * Default scanner configuration
 */
const DEFAULT_SCANNER_CONFIG = {
  timeframe: '1h',
  signalFilter: 'all' as const,
  minConfidence: 0,
  limit: 50,
};

/**
 * Generate mock candle data for testing
 * This will be replaced with real market data in future issues
 */
function generateMockCandles(symbol: string, count: number = 50): Candle[] {
  const now = Date.now();
  const candles: Candle[] = [];
  let basePrice = 40000 + Math.random() * 20000; // Random base price

  for (let i = count; i > 0; i--) {
    const timestamp = now - i * 3600000; // 1 hour intervals
    const volatility = 0.02; // 2% volatility
    const trend = (Math.random() - 0.48) * volatility; // Slight upward bias

    const open = basePrice;
    const priceMove = basePrice * trend;
    const high = Math.max(open, open + priceMove) * (1 + Math.random() * volatility);
    const low = Math.min(open, open + priceMove) * (1 - Math.random() * volatility);
    const close = open + priceMove;
    const volume = 1000000 + Math.random() * 5000000;

    candles.push({ timestamp, open, high, low, close, volume });
    basePrice = close; // Next candle starts where this one ended
  }

  return candles;
}

/**
 * Calculate confidence score based on indicator alignment
 */
function calculateConfidence(
  direction: 'bullish' | 'bearish' | 'neutral',
  strength: 'strong' | 'moderate' | 'weak',
  rsi?: number,
  macdHistogram?: number,
  volumeRatio?: number
): number {
  let confidence = 50; // Base confidence

  // Strength contribution
  const strengthBonus = strength === 'strong' ? 30 : strength === 'moderate' ? 15 : 0;
  confidence += strengthBonus;

  // Direction alignment
  if (direction !== 'neutral') {
    // RSI alignment
    if (rsi !== undefined) {
      if (direction === 'bullish' && rsi < 70 && rsi > 30) {
        confidence += 10;
      } else if (direction === 'bearish' && rsi > 30 && rsi < 70) {
        confidence += 10;
      }
    }

    // MACD alignment
    if (macdHistogram !== undefined) {
      if (
        (direction === 'bullish' && macdHistogram > 0) ||
        (direction === 'bearish' && macdHistogram < 0)
      ) {
        confidence += 10;
      }
    }

    // Volume confirmation
    if (volumeRatio !== undefined && volumeRatio > 1.2) {
      confidence += 10;
    }
  }

  return Math.min(100, Math.max(0, Math.round(confidence)));
}

/**
 * Execute momentum scanner across multiple symbols
 */
export async function executeScanner(
  input: ScannerInput
): Promise<ScannerResults> {
  const {
    symbols,
    timeframe = DEFAULT_SCANNER_CONFIG.timeframe,
    signalFilter = DEFAULT_SCANNER_CONFIG.signalFilter,
    minConfidence = DEFAULT_SCANNER_CONFIG.minConfidence,
    limit = DEFAULT_SCANNER_CONFIG.limit,
    config,
  } = input;

  // Validate inputs
  if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
    throw new Error('Invalid symbols: must be a non-empty array');
  }

  if (symbols.length > 100) {
    throw new Error('Too many symbols: maximum 100 symbols per scan');
  }

  // Initialize momentum analyzer
  const analyzer = new MomentumAnalyzer({
    rsiPeriod: config?.rsiPeriod || 14,
    rsiOverbought: 70,
    rsiOversold: 30,
    macdFast: config?.macdFastPeriod || 12,
    macdSlow: config?.macdSlowPeriod || 26,
    macdSignal: config?.macdSignalPeriod || 9,
    volumeAvgPeriod: config?.volumePeriod || 20,
  });

  const rankedResults: RankedScanResult[] = [];

  // Scan each symbol
  for (const symbol of symbols) {
    try {
      // Generate mock candles for this symbol
      const candles = generateMockCandles(symbol);

      // Analyze momentum
      const result = analyzer.analyze(symbol, timeframe as Timeframe, candles);

      // Calculate confidence
      const confidence = calculateConfidence(
        result.direction,
        result.strength,
        result.rsi,
        result.macdSignal,
        result.volumeRatio
      );

      // Create ranked result
      const rankedResult: RankedScanResult = {
        symbol,
        timeframe,
        momentumScore: result.score,
        direction: result.direction,
        strength: result.strength,
        rsi: result.rsi,
        macdHistogram: result.macdSignal,
        volumeRatio: result.volumeRatio,
        confidence,
        timestamp: result.timestamp,
      };

      rankedResults.push(rankedResult);
    } catch (error) {
      // Log error but continue scanning other symbols
      console.error(`Error scanning ${symbol}:`, error);
    }
  }

  // Apply signal filter
  let filteredResults = rankedResults;
  if (signalFilter === 'bullish') {
    filteredResults = rankedResults.filter((r) => r.direction === 'bullish');
  } else if (signalFilter === 'bearish') {
    filteredResults = rankedResults.filter((r) => r.direction === 'bearish');
  }

  // Apply confidence filter
  filteredResults = filteredResults.filter((r) => r.confidence >= minConfidence);

  // Sort by absolute momentum score (strongest signals first)
  filteredResults.sort((a, b) => Math.abs(b.momentumScore) - Math.abs(a.momentumScore));

  // Apply limit
  const limitedResults = filteredResults.slice(0, limit);

  return {
    totalScanned: symbols.length,
    resultsReturned: limitedResults.length,
    timeframe,
    signalFilter,
    results: limitedResults,
    timestamp: Date.now(),
  };
}

/**
 * MCP tool definition for momentum_scanner
 */
export const scannerTool = {
  name: 'momentum_scanner',
  description:
    'Scan multiple symbols for momentum signals, aggregate RSI, MACD, and volume indicators, and return ranked results by momentum strength',
  inputSchema: {
    type: 'object' as const,
    properties: {
      symbols: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of trading symbols to scan (e.g., ["BTC/USD", "ETH/USD", "SOL/USD"])',
      },
      timeframe: {
        type: 'string',
        description: 'Timeframe for scanning (e.g., "1h", "4h", "1d"). Default: "1h"',
        default: '1h',
      },
      signalFilter: {
        type: 'string',
        enum: ['all', 'bullish', 'bearish'],
        description: 'Filter results by signal type. Default: "all"',
        default: 'all',
      },
      minConfidence: {
        type: 'number',
        description: 'Minimum confidence threshold (0-100). Default: 0',
        default: 0,
        minimum: 0,
        maximum: 100,
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return. Default: 50',
        default: 50,
        minimum: 1,
        maximum: 100,
      },
      config: {
        type: 'object',
        description: 'Optional configuration for indicators',
        properties: {
          rsiPeriod: {
            type: 'number',
            description: 'RSI period (default: 14)',
          },
          macdFastPeriod: {
            type: 'number',
            description: 'MACD fast period (default: 12)',
          },
          macdSlowPeriod: {
            type: 'number',
            description: 'MACD slow period (default: 26)',
          },
          macdSignalPeriod: {
            type: 'number',
            description: 'MACD signal period (default: 9)',
          },
          volumePeriod: {
            type: 'number',
            description: 'Volume average period (default: 20)',
          },
        },
      },
    },
    required: ['symbols'],
  },
};
