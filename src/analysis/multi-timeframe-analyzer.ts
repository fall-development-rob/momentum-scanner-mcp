import { Timeframe, TIMEFRAMES, TIMEFRAME_WEIGHT, isValidTimeframe } from '../types/timeframe';
import { Candle, MomentumDirection, MomentumResult, MomentumStrength, MultiTimeframeResult, TimeframeAlignment, AnalysisRequest, AnalysisError } from '../types/momentum';
import { MomentumAnalyzer, MomentumAnalyzerConfig } from './momentum-analyzer';
import { ResultCache, CacheConfig } from '../cache/result-cache';

export interface DataProvider { getCandles(symbol: string, timeframe: Timeframe, limit: number): Promise<Candle[]>; }

export interface MultiTimeframeConfig {
  analyzerConfig?: MomentumAnalyzerConfig;
  cacheConfig?: CacheConfig;
  defaultLookback?: number;
  maxConcurrency?: number;
  alignmentThreshold?: number;
}

const DEFAULT_MTF_CONFIG: Required<MultiTimeframeConfig> = {
  analyzerConfig: {}, cacheConfig: {}, defaultLookback: 100, maxConcurrency: 6, alignmentThreshold: 0.6,
};

export class MultiTimeframeAnalyzer {
  private analyzer: MomentumAnalyzer;
  private cache: ResultCache;
  private config: Required<MultiTimeframeConfig>;

  constructor(private dataProvider: DataProvider, config: MultiTimeframeConfig = {}) {
    this.config = { ...DEFAULT_MTF_CONFIG, ...config };
    this.analyzer = new MomentumAnalyzer(this.config.analyzerConfig);
    this.cache = new ResultCache(this.config.cacheConfig);
  }

  async analyze(request: AnalysisRequest): Promise<MultiTimeframeResult> {
    const { symbol, timeframes, lookback = this.config.defaultLookback } = request;
    const validTimeframes = this.validateTimeframes(timeframes);
    if (validTimeframes.length === 0) throw new AnalysisError('No valid timeframes provided', 'INVALID_TIMEFRAMES', undefined, symbol);
    const { cached, missing } = this.checkCache(symbol, validTimeframes);
    const newResults = await this.analyzeTimeframesConcurrently(symbol, missing, lookback);
    const allResults = new Map<Timeframe, MomentumResult>([...cached, ...newResults]);
    this.cache.setMany(Array.from(newResults.values()));
    const alignment = this.calculateAlignment(allResults);
    const { overallDirection, overallStrength, confluenceScore } = this.calculateOverallMomentum(allResults, alignment);
    return { symbol, timestamp: Date.now(), results: allResults, alignment, overallDirection, overallStrength, confluenceScore };
  }

  async analyzeSingle(symbol: string, timeframe: Timeframe, lookback?: number): Promise<MomentumResult> {
    const cached = this.cache.get(symbol, timeframe);
    if (cached) return cached;
    const candles = await this.dataProvider.getCandles(symbol, timeframe, lookback || this.config.defaultLookback);
    const result = this.analyzer.analyze(symbol, timeframe, candles);
    this.cache.set(result);
    return result;
  }

  private validateTimeframes(timeframes: Timeframe[]): Timeframe[] { return timeframes.filter((tf) => isValidTimeframe(tf)); }

  private checkCache(symbol: string, timeframes: Timeframe[]): { cached: Map<Timeframe, MomentumResult>; missing: Timeframe[] } {
    const cached = new Map<Timeframe, MomentumResult>(), missing: Timeframe[] = [];
    for (const tf of timeframes) { const r = this.cache.get(symbol, tf); if (r) cached.set(tf, r); else missing.push(tf); }
    return { cached, missing };
  }

  private async analyzeTimeframesConcurrently(symbol: string, timeframes: Timeframe[], lookback: number): Promise<Map<Timeframe, MomentumResult>> {
    const results = new Map<Timeframe, MomentumResult>();
    if (timeframes.length === 0) return results;
    const promises = timeframes.map(async (tf) => {
      try {
        const candles = await this.dataProvider.getCandles(symbol, tf, lookback);
        return { timeframe: tf, result: this.analyzer.analyze(symbol, tf, candles), error: null };
      } catch (e) { return { timeframe: tf, result: null, error: e instanceof Error ? e : new Error(String(e)) }; }
    });
    const chunks = this.chunkArray(promises, this.config.maxConcurrency);
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(chunk);
      for (const { timeframe, result, error } of chunkResults) {
        if (result && !error) results.set(timeframe, result);
        else if (error) console.warn(`Failed to analyze ${symbol} on ${timeframe}: ${error.message}`);
      }
    }
    return results;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) chunks.push(array.slice(i, i + chunkSize));
    return chunks;
  }

  private calculateAlignment(results: Map<Timeframe, MomentumResult>): TimeframeAlignment {
    const directions: { timeframe: Timeframe; direction: MomentumDirection; weight: number }[] = [];
    for (const [tf, r] of results) directions.push({ timeframe: tf, direction: r.direction, weight: TIMEFRAME_WEIGHT[tf] });
    const counts: Record<MomentumDirection, { count: number; weight: number; timeframes: Timeframe[] }> = {
      bullish: { count: 0, weight: 0, timeframes: [] }, bearish: { count: 0, weight: 0, timeframes: [] }, neutral: { count: 0, weight: 0, timeframes: [] },
    };
    for (const { timeframe, direction, weight } of directions) { counts[direction].count++; counts[direction].weight += weight; counts[direction].timeframes.push(timeframe); }
    const dominantDirection: MomentumDirection = counts.bullish.weight > counts.bearish.weight ? 'bullish' : counts.bearish.weight > counts.bullish.weight ? 'bearish' : 'neutral';
    const totalWeight = directions.reduce((s, d) => s + d.weight, 0);
    const alignedWeight = dominantDirection === 'neutral' ? counts.neutral.weight : counts[dominantDirection].weight;
    const weightedScore = totalWeight > 0 ? (alignedWeight / totalWeight) * 100 : 0;
    const alignedCount = dominantDirection === 'neutral' ? counts.neutral.count : counts[dominantDirection].count;
    const alignmentScore = directions.length > 0 ? (alignedCount / directions.length) * 100 : 0;
    const alignedTimeframes = directions.filter((d) => d.direction === dominantDirection).map((d) => d.timeframe);
    const divergentTimeframes = directions.filter((d) => d.direction !== dominantDirection && d.direction !== 'neutral').map((d) => d.timeframe);
    return { aligned: alignmentScore >= this.config.alignmentThreshold * 100, alignedTimeframes, divergentTimeframes, dominantDirection, alignmentScore, weightedScore };
  }

  private calculateOverallMomentum(results: Map<Timeframe, MomentumResult>, alignment: TimeframeAlignment): { overallDirection: MomentumDirection; overallStrength: MomentumStrength; confluenceScore: number } {
    if (results.size === 0) return { overallDirection: 'neutral', overallStrength: 'weak', confluenceScore: 0 };
    let totalWeight = 0, weightedScoreSum = 0;
    for (const [tf, r] of results) { const w = TIMEFRAME_WEIGHT[tf]; totalWeight += w; weightedScoreSum += r.score * w; }
    const avgScore = totalWeight > 0 ? weightedScoreSum / totalWeight : 0;
    let overallDirection: MomentumDirection = avgScore > 15 ? 'bullish' : avgScore < -15 ? 'bearish' : 'neutral';
    const absScore = Math.abs(avgScore);
    let overallStrength: MomentumStrength = alignment.aligned && absScore > 50 ? 'strong' : alignment.aligned || absScore > 30 ? 'moderate' : 'weak';
    const confluenceScore = Math.min(100, alignment.weightedScore * 0.4 + absScore * 0.4 + (alignment.alignedTimeframes.length / results.size) * 100 * 0.2);
    return { overallDirection, overallStrength, confluenceScore };
  }

  getCacheStats(): { size: number; maxEntries: number } { return this.cache.stats(); }
  clearCache(): void { this.cache.clear(); }
  invalidateCache(symbol: string, timeframe?: Timeframe): void { this.cache.invalidate(symbol, timeframe); }
  async analyzeAllTimeframes(symbol: string, lookback?: number): Promise<MultiTimeframeResult> { return this.analyze({ symbol, timeframes: [...TIMEFRAMES], lookback }); }
}
