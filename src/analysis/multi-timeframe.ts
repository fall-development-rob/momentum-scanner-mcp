/**
 * Multi-Timeframe Analysis Module
 *
 * Provides comprehensive multi-timeframe analysis capabilities for momentum scanning.
 * Supports aggregation of indicator signals across multiple timeframes with confluence scoring.
 *
 * @module multi-timeframe
 */

/**
 * Supported timeframe intervals
 */
export enum Timeframe {
  ONE_MINUTE = '1m',
  FIVE_MINUTES = '5m',
  FIFTEEN_MINUTES = '15m',
  ONE_HOUR = '1h',
  FOUR_HOURS = '4h',
  ONE_DAY = '1d',
  ONE_WEEK = '1w'
}

/**
 * Signal direction for indicators
 */
export enum SignalDirection {
  BULLISH = 'bullish',
  BEARISH = 'bearish',
  NEUTRAL = 'neutral'
}

/**
 * Indicator signal strength levels
 */
export enum SignalStrength {
  WEAK = 'weak',
  MODERATE = 'moderate',
  STRONG = 'strong',
  VERY_STRONG = 'very_strong'
}

/**
 * Individual indicator signal for a specific timeframe
 */
export interface IndicatorSignal {
  /** Name of the indicator (e.g., RSI, MACD, Moving Average) */
  indicator: string;
  /** Timeframe for this signal */
  timeframe: Timeframe;
  /** Signal direction */
  direction: SignalDirection;
  /** Signal strength */
  strength: SignalStrength;
  /** Numerical value of the indicator */
  value: number;
  /** Timestamp when the signal was generated */
  timestamp: number;
  /** Additional metadata for the signal */
  metadata?: Record<string, unknown>;
}

/**
 * Aggregated signals across all timeframes for a single indicator
 */
export interface AggregatedIndicatorSignal {
  /** Name of the indicator */
  indicator: string;
  /** Signals from all analyzed timeframes */
  signals: IndicatorSignal[];
  /** Confluence score (0-1) indicating agreement across timeframes */
  confluenceScore: number;
  /** Dominant direction across timeframes */
  dominantDirection: SignalDirection;
  /** Average strength across timeframes */
  averageStrength: number;
}

/**
 * Complete multi-timeframe analysis result
 */
export interface MultiTimeframeAnalysis {
  /** Symbol being analyzed */
  symbol: string;
  /** Timeframes included in the analysis */
  timeframes: Timeframe[];
  /** Aggregated signals for each indicator */
  indicators: AggregatedIndicatorSignal[];
  /** Overall confluence score across all indicators and timeframes */
  overallConfluence: number;
  /** Overall dominant direction */
  overallDirection: SignalDirection;
  /** Timestamp of the analysis */
  timestamp: number;
  /** Summary statistics */
  summary: {
    totalSignals: number;
    bullishSignals: number;
    bearishSignals: number;
    neutralSignals: number;
    strongestIndicator: string;
    weakestIndicator: string;
  };
}

/**
 * Configuration options for multi-timeframe analysis
 */
export interface MultiTimeframeConfig {
  /** Timeframes to include in analysis */
  timeframes: Timeframe[];
  /** Minimum number of timeframes that must agree for a valid signal */
  minConfluenceTimeframes?: number;
  /** Weights for each timeframe (higher weight = more importance) */
  timeframeWeights?: Map<Timeframe, number>;
  /** Minimum signal strength to consider */
  minSignalStrength?: SignalStrength;
  /** Enable trend alignment filtering */
  trendAlignmentRequired?: boolean;
}

/**
 * Calculate confluence score for aggregated signals
 *
 * Confluence score indicates how many timeframes agree on the signal direction.
 * Score of 1.0 means all timeframes agree, 0.0 means complete disagreement.
 *
 * @param signals - Array of indicator signals across timeframes
 * @returns Confluence score between 0 and 1
 */
export function calculateConfluenceScore(signals: IndicatorSignal[]): number {
  if (signals.length === 0) return 0;

  const directionCounts = {
    [SignalDirection.BULLISH]: 0,
    [SignalDirection.BEARISH]: 0,
    [SignalDirection.NEUTRAL]: 0
  };

  // Count signals by direction
  signals.forEach(signal => {
    directionCounts[signal.direction]++;
  });

  // Find the most common direction
  const maxCount = Math.max(...Object.values(directionCounts));

  // Confluence is the ratio of agreeing signals to total signals
  return maxCount / signals.length;
}

/**
 * Determine the dominant signal direction from multiple signals
 *
 * @param signals - Array of indicator signals
 * @returns The most common signal direction
 */
export function getDominantDirection(signals: IndicatorSignal[]): SignalDirection {
  if (signals.length === 0) return SignalDirection.NEUTRAL;

  const directionCounts = {
    [SignalDirection.BULLISH]: 0,
    [SignalDirection.BEARISH]: 0,
    [SignalDirection.NEUTRAL]: 0
  };

  signals.forEach(signal => {
    directionCounts[signal.direction]++;
  });

  // Return direction with highest count
  let maxDirection = SignalDirection.NEUTRAL;
  let maxCount = 0;

  for (const [direction, count] of Object.entries(directionCounts)) {
    if (count > maxCount) {
      maxCount = count;
      maxDirection = direction as SignalDirection;
    }
  }

  return maxDirection;
}

/**
 * Convert signal strength to numerical value for calculations
 *
 * @param strength - Signal strength enum
 * @returns Numerical value (1-4)
 */
export function strengthToNumber(strength: SignalStrength): number {
  const strengthMap = {
    [SignalStrength.WEAK]: 1,
    [SignalStrength.MODERATE]: 2,
    [SignalStrength.STRONG]: 3,
    [SignalStrength.VERY_STRONG]: 4
  };
  return strengthMap[strength];
}

/**
 * Calculate average signal strength across multiple signals
 *
 * @param signals - Array of indicator signals
 * @returns Average strength value (1-4)
 */
export function calculateAverageStrength(signals: IndicatorSignal[]): number {
  if (signals.length === 0) return 0;

  const totalStrength = signals.reduce(
    (sum, signal) => sum + strengthToNumber(signal.strength),
    0
  );

  return totalStrength / signals.length;
}

/**
 * Aggregate signals for a single indicator across multiple timeframes
 *
 * @param indicator - Name of the indicator
 * @param signals - Array of signals for this indicator across timeframes
 * @returns Aggregated indicator signal
 */
export function aggregateIndicatorSignals(
  indicator: string,
  signals: IndicatorSignal[]
): AggregatedIndicatorSignal {
  const confluenceScore = calculateConfluenceScore(signals);
  const dominantDirection = getDominantDirection(signals);
  const averageStrength = calculateAverageStrength(signals);

  return {
    indicator,
    signals,
    confluenceScore,
    dominantDirection,
    averageStrength
  };
}

/**
 * Perform multi-timeframe analysis on a collection of indicator signals
 *
 * @param symbol - Trading symbol being analyzed
 * @param signals - Array of all indicator signals across timeframes
 * @param config - Analysis configuration
 * @returns Complete multi-timeframe analysis result
 */
export function analyzeMultiTimeframe(
  symbol: string,
  signals: IndicatorSignal[],
  config: MultiTimeframeConfig
): MultiTimeframeAnalysis {
  // Group signals by indicator
  const signalsByIndicator = new Map<string, IndicatorSignal[]>();

  signals.forEach(signal => {
    if (!signalsByIndicator.has(signal.indicator)) {
      signalsByIndicator.set(signal.indicator, []);
    }
    signalsByIndicator.get(signal.indicator)!.push(signal);
  });

  // Aggregate signals for each indicator
  const indicators: AggregatedIndicatorSignal[] = [];

  for (const [indicatorName, indicatorSignals] of signalsByIndicator) {
    const aggregated = aggregateIndicatorSignals(indicatorName, indicatorSignals);

    // Apply minimum confluence filter if configured
    if (config.minConfluenceTimeframes) {
      const agreeingSignals = indicatorSignals.filter(
        s => s.direction === aggregated.dominantDirection
      ).length;

      if (agreeingSignals < config.minConfluenceTimeframes) {
        continue; // Skip indicators that don't meet minimum confluence
      }
    }

    indicators.push(aggregated);
  }

  // Calculate overall statistics
  const bullishSignals = signals.filter(s => s.direction === SignalDirection.BULLISH).length;
  const bearishSignals = signals.filter(s => s.direction === SignalDirection.BEARISH).length;
  const neutralSignals = signals.filter(s => s.direction === SignalDirection.NEUTRAL).length;

  // Calculate overall confluence
  const overallConfluence = indicators.length > 0
    ? indicators.reduce((sum, ind) => sum + ind.confluenceScore, 0) / indicators.length
    : 0;

  // Determine overall direction
  const overallDirection = getDominantDirection(signals);

  // Find strongest and weakest indicators
  let strongestIndicator = '';
  let weakestIndicator = '';
  let maxStrength = 0;
  let minStrength = Infinity;

  indicators.forEach(ind => {
    const strength = ind.averageStrength;
    if (strength > maxStrength) {
      maxStrength = strength;
      strongestIndicator = ind.indicator;
    }
    if (strength < minStrength) {
      minStrength = strength;
      weakestIndicator = ind.indicator;
    }
  });

  return {
    symbol,
    timeframes: config.timeframes,
    indicators,
    overallConfluence,
    overallDirection,
    timestamp: Date.now(),
    summary: {
      totalSignals: signals.length,
      bullishSignals,
      bearishSignals,
      neutralSignals,
      strongestIndicator,
      weakestIndicator
    }
  };
}

/**
 * Filter signals by timeframe weight
 *
 * @param signals - Array of signals to filter
 * @param weights - Map of timeframe weights
 * @param minWeight - Minimum weight threshold
 * @returns Filtered signals
 */
export function filterByTimeframeWeight(
  signals: IndicatorSignal[],
  weights: Map<Timeframe, number>,
  minWeight: number = 0.5
): IndicatorSignal[] {
  return signals.filter(signal => {
    const weight = weights.get(signal.timeframe) ?? 1.0;
    return weight >= minWeight;
  });
}

/**
 * Check if signals show trend alignment across timeframes
 *
 * @param signals - Array of signals to check
 * @param requiredAlignment - Minimum percentage of signals that must align (0-1)
 * @returns True if trend alignment is sufficient
 */
export function checkTrendAlignment(
  signals: IndicatorSignal[],
  requiredAlignment: number = 0.7
): boolean {
  const confluenceScore = calculateConfluenceScore(signals);
  return confluenceScore >= requiredAlignment;
}

/**
 * Get timeframes sorted by priority (shorter to longer)
 *
 * @returns Array of timeframes in priority order
 */
export function getTimeframesByPriority(): Timeframe[] {
  return [
    Timeframe.ONE_MINUTE,
    Timeframe.FIVE_MINUTES,
    Timeframe.FIFTEEN_MINUTES,
    Timeframe.ONE_HOUR,
    Timeframe.FOUR_HOURS,
    Timeframe.ONE_DAY,
    Timeframe.ONE_WEEK
  ];
}

/**
 * Create default multi-timeframe configuration
 *
 * @param timeframes - Optional array of timeframes (uses all if not provided)
 * @returns Default configuration object
 */
export function createDefaultConfig(timeframes?: Timeframe[]): MultiTimeframeConfig {
  return {
    timeframes: timeframes ?? getTimeframesByPriority(),
    minConfluenceTimeframes: 2,
    minSignalStrength: SignalStrength.WEAK,
    trendAlignmentRequired: false
  };
}
