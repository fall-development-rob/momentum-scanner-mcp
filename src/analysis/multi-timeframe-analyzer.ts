import {
  Timeframe,
  TIMEFRAMES,
  TIMEFRAME_WEIGHT,
  isValidTimeframe,
} from '../types/timeframe.js';
import {
  Candle,
  MomentumDirection,
  MomentumResult,
  MomentumStrength,
  MultiTimeframeResult,
  TimeframeAlignment,
  AnalysisRequest,
  AnalysisError,
} from '../types/momentum.js';
import { MomentumAnalyzer, MomentumAnalyzerConfig } from './momentum-analyzer.js';
import { ResultCache, CacheConfig } from '../cache/result-cache.js';

/**
 * Data provider interface for fetching candle data
 */
export interface DataProvider {
  getCandles(symbol: string, timeframe: Timeframe, limit: number): Promise<Candle[]>;
}

/**
 * Multi-timeframe analyzer configuration
 */
export interface MultiTimeframeConfig {
  analyzerConfig?: MomentumAnalyzerConfig;
  cacheConfig?: CacheConfig;
  defaultLookback?: number;
  maxConcurrency?: number;
  alignmentThreshold?: number;
}

const DEFAULT_MTF_CONFIG: Required<MultiTimeframeConfig> = {
  analyzerConfig: {},
  cacheConfig: {},
  defaultLookback: 100,
  maxConcurrency: 6, // Match number of timeframes
  alignmentThreshold: 0.6, // 60% alignment threshold
};

/**
 * Multi-timeframe momentum analyzer
 * Runs analysis concurrently across multiple timeframes and detects alignment
 */
export class MultiTimeframeAnalyzer {
  private analyzer: MomentumAnalyzer;
  private cache: ResultCache;
  private config: Required<MultiTimeframeConfig>;

  constructor(
    private dataProvider: DataProvider,
    config: MultiTimeframeConfig = {}
  ) {
    this.config = { ...DEFAULT_MTF_CONFIG, ...config };
    this.analyzer = new MomentumAnalyzer(this.config.analyzerConfig);
    this.cache = new ResultCache(this.config.cacheConfig);
  }

  /**
   * Analyze momentum across multiple timeframes concurrently
   */
  async analyze(request: AnalysisRequest): Promise<MultiTimeframeResult> {
    const { symbol, timeframes, lookback = this.config.defaultLookback } = request;

    // Validate timeframes
    const validTimeframes = this.validateTimeframes(timeframes);
    if (validTimeframes.length === 0) {
      throw new AnalysisError(
        'No valid timeframes provided',
        'INVALID_TIMEFRAMES',
        undefined,
        symbol
      );
    }

    // Check cache for existing results
    const { cached, missing } = this.checkCache(symbol, validTimeframes);

    // Fetch and analyze missing timeframes concurrently
    const newResults = await this.analyzeTimeframesConcurrently(
      symbol,
      missing,
      lookback
    );

    // Combine cached and new results
    const allResults = new Map<Timeframe, MomentumResult>([
      ...cached,
      ...newResults,
    ]);

    // Cache new results
    this.cache.setMany(Array.from(newResults.values()));

    // Calculate alignment
    const alignment = this.calculateAlignment(allResults);

    // Calculate overall direction and strength
    const { overallDirection, overallStrength, confluenceScore } =
      this.calculateOverallMomentum(allResults, alignment);

    return {
      symbol,
      timestamp: Date.now(),
      results: allResults,
      alignment,
      overallDirection,
      overallStrength,
      confluenceScore,
    };
  }

  /**
   * Analyze a single timeframe (useful for incremental updates)
   */
  async analyzeSingle(
    symbol: string,
    timeframe: Timeframe,
    lookback?: number
  ): Promise<MomentumResult> {
    // Check cache first
    const cached = this.cache.get(symbol, timeframe);
    if (cached) {
      return cached;
    }

    // Fetch and analyze
    const candles = await this.dataProvider.getCandles(
      symbol,
      timeframe,
      lookback || this.config.defaultLookback
    );

    const result = this.analyzer.analyze(symbol, timeframe, candles);
    this.cache.set(result);

    return result;
  }

  /**
   * Validate timeframes
   */
  private validateTimeframes(timeframes: Timeframe[]): Timeframe[] {
    return timeframes.filter((tf) => isValidTimeframe(tf));
  }

  /**
   * Check cache for existing results
   */
  private checkCache(
    symbol: string,
    timeframes: Timeframe[]
  ): { cached: Map<Timeframe, MomentumResult>; missing: Timeframe[] } {
    const cached = new Map<Timeframe, MomentumResult>();
    const missing: Timeframe[] = [];

    for (const timeframe of timeframes) {
      const result = this.cache.get(symbol, timeframe);
      if (result) {
        cached.set(timeframe, result);
      } else {
        missing.push(timeframe);
      }
    }

    return { cached, missing };
  }

  /**
   * Analyze multiple timeframes concurrently with controlled concurrency
   */
  private async analyzeTimeframesConcurrently(
    symbol: string,
    timeframes: Timeframe[],
    lookback: number
  ): Promise<Map<Timeframe, MomentumResult>> {
    const results = new Map<Timeframe, MomentumResult>();

    if (timeframes.length === 0) {
      return results;
    }

    // Create analysis promises
    const analysisPromises = timeframes.map(async (timeframe) => {
      try {
        const candles = await this.dataProvider.getCandles(
          symbol,
          timeframe,
          lookback
        );
        const result = this.analyzer.analyze(symbol, timeframe, candles);
        return { timeframe, result, error: null };
      } catch (error) {
        return {
          timeframe,
          result: null,
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    });

    // Execute with concurrency limit
    const chunks = this.chunkArray(analysisPromises, this.config.maxConcurrency);

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(chunk);

      for (const { timeframe, result, error } of chunkResults) {
        if (result && !error) {
          results.set(timeframe, result);
        } else if (error) {
          console.warn(
            `Failed to analyze ${symbol} on ${timeframe}: ${error.message}`
          );
        }
      }
    }

    return results;
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Calculate timeframe alignment
   */
  private calculateAlignment(
    results: Map<Timeframe, MomentumResult>
  ): TimeframeAlignment {
    const directions: {
      timeframe: Timeframe;
      direction: MomentumDirection;
      weight: number;
    }[] = [];

    for (const [timeframe, result] of results) {
      directions.push({
        timeframe,
        direction: result.direction,
        weight: TIMEFRAME_WEIGHT[timeframe],
      });
    }

    // Count directions
    const directionCounts: Record<
      MomentumDirection,
      { count: number; weight: number; timeframes: Timeframe[] }
    > = {
      bullish: { count: 0, weight: 0, timeframes: [] },
      bearish: { count: 0, weight: 0, timeframes: [] },
      neutral: { count: 0, weight: 0, timeframes: [] },
    };

    for (const { timeframe, direction, weight } of directions) {
      directionCounts[direction].count++;
      directionCounts[direction].weight += weight;
      directionCounts[direction].timeframes.push(timeframe);
    }

    // Determine dominant direction (excluding neutral)
    const dominantDirection: MomentumDirection =
      directionCounts.bullish.weight > directionCounts.bearish.weight
        ? 'bullish'
        : directionCounts.bearish.weight > directionCounts.bullish.weight
          ? 'bearish'
          : 'neutral';

    // Calculate alignment
    const totalWeight = directions.reduce((sum, d) => sum + d.weight, 0);
    const alignedWeight =
      dominantDirection === 'neutral'
        ? directionCounts.neutral.weight
        : directionCounts[dominantDirection].weight;

    const weightedScore = totalWeight > 0 ? (alignedWeight / totalWeight) * 100 : 0;

    // Simple alignment score (percentage of aligned timeframes)
    const alignedCount =
      dominantDirection === 'neutral'
        ? directionCounts.neutral.count
        : directionCounts[dominantDirection].count;
    const alignmentScore =
      directions.length > 0 ? (alignedCount / directions.length) * 100 : 0;

    // Determine aligned and divergent timeframes
    const alignedTimeframes = directions
      .filter((d) => d.direction === dominantDirection)
      .map((d) => d.timeframe);

    const divergentTimeframes = directions
      .filter(
        (d) => d.direction !== dominantDirection && d.direction !== 'neutral'
      )
      .map((d) => d.timeframe);

    // Aligned if above threshold
    const aligned = alignmentScore >= this.config.alignmentThreshold * 100;

    return {
      aligned,
      alignedTimeframes,
      divergentTimeframes,
      dominantDirection,
      alignmentScore,
      weightedScore,
    };
  }

  /**
   * Calculate overall momentum metrics
   */
  private calculateOverallMomentum(
    results: Map<Timeframe, MomentumResult>,
    alignment: TimeframeAlignment
  ): {
    overallDirection: MomentumDirection;
    overallStrength: MomentumStrength;
    confluenceScore: number;
  } {
    if (results.size === 0) {
      return {
        overallDirection: 'neutral',
        overallStrength: 'weak',
        confluenceScore: 0,
      };
    }

    // Calculate weighted average score
    let totalWeight = 0;
    let weightedScoreSum = 0;

    for (const [timeframe, result] of results) {
      const weight = TIMEFRAME_WEIGHT[timeframe];
      totalWeight += weight;
      weightedScoreSum += result.score * weight;
    }

    const avgScore = totalWeight > 0 ? weightedScoreSum / totalWeight : 0;

    // Determine overall direction
    let overallDirection: MomentumDirection;
    if (avgScore > 15) {
      overallDirection = 'bullish';
    } else if (avgScore < -15) {
      overallDirection = 'bearish';
    } else {
      overallDirection = 'neutral';
    }

    // Determine overall strength based on alignment and score
    let overallStrength: MomentumStrength;
    const absScore = Math.abs(avgScore);

    if (alignment.aligned && absScore > 50) {
      overallStrength = 'strong';
    } else if (alignment.aligned || absScore > 30) {
      overallStrength = 'moderate';
    } else {
      overallStrength = 'weak';
    }

    // Calculate confluence score
    // Higher when more timeframes agree and have strong signals
    const confluenceScore = Math.min(
      100,
      alignment.weightedScore * 0.4 +
        Math.abs(avgScore) * 0.4 +
        (alignment.alignedTimeframes.length / results.size) * 100 * 0.2
    );

    return { overallDirection, overallStrength, confluenceScore };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxEntries: number } {
    return this.cache.stats();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Invalidate cache for a symbol
   */
  invalidateCache(symbol: string, timeframe?: Timeframe): void {
    this.cache.invalidate(symbol, timeframe);
  }

  /**
   * Analyze all supported timeframes
   */
  async analyzeAllTimeframes(
    symbol: string,
    lookback?: number
  ): Promise<MultiTimeframeResult> {
    return this.analyze({
      symbol,
      timeframes: [...TIMEFRAMES],
      lookback,
    });
  }
}
