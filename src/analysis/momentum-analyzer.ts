import { Timeframe } from '../types/timeframe.js';
import {
  Candle,
  MomentumDirection,
  MomentumResult,
  MomentumStrength,
  AnalysisError,
} from '../types/momentum.js';

/**
 * Momentum analyzer configuration
 */
export interface MomentumAnalyzerConfig {
  rsiPeriod?: number;
  rsiOverbought?: number;
  rsiOversold?: number;
  macdFast?: number;
  macdSlow?: number;
  macdSignal?: number;
  volumeAvgPeriod?: number;
}

const DEFAULT_CONFIG: Required<MomentumAnalyzerConfig> = {
  rsiPeriod: 14,
  rsiOverbought: 70,
  rsiOversold: 30,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  volumeAvgPeriod: 20,
};

/**
 * Single timeframe momentum analyzer
 * Calculates RSI, MACD, and volume-based momentum indicators
 */
export class MomentumAnalyzer {
  private config: Required<MomentumAnalyzerConfig>;

  constructor(config: MomentumAnalyzerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze momentum for a single timeframe
   */
  analyze(symbol: string, timeframe: Timeframe, candles: Candle[]): MomentumResult {
    const minCandles = this.config.macdSlow + this.config.macdSignal;
    if (candles.length < minCandles) {
      throw new AnalysisError(
        `Insufficient candles for analysis. Need at least ${minCandles}, got ${candles.length}`,
        'INSUFFICIENT_DATA',
        timeframe,
        symbol
      );
    }

    const closes = candles.map((c) => c.close);
    const volumes = candles.map((c) => c.volume);

    const rsi = this.calculateRSI(closes);
    const { histogram } = this.calculateMACD(closes);
    const volumeRatio = this.calculateVolumeRatio(volumes);

    const { direction, strength, score } = this.calculateMomentum(
      rsi,
      histogram,
      volumeRatio,
      closes
    );

    return {
      timeframe,
      symbol,
      timestamp: Date.now(),
      direction,
      strength,
      score,
      rsi,
      macdSignal: histogram,
      volumeRatio,
      metadata: {
        candleCount: candles.length,
        latestClose: closes[closes.length - 1],
      },
    };
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  private calculateRSI(closes: number[]): number {
    const period = this.config.rsiPeriod;
    if (closes.length < period + 1) {
      return 50; // Neutral default
    }

    let gains = 0;
    let losses = 0;

    // Calculate initial average gain/loss
    for (let i = 1; i <= period; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Calculate smoothed RSI
    for (let i = period + 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    if (avgLoss === 0) {
      return 100;
    }

    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  private calculateMACD(closes: number[]): {
    macd: number;
    signal: number;
    histogram: number;
  } {
    const fastEMA = this.calculateEMA(closes, this.config.macdFast);
    const slowEMA = this.calculateEMA(closes, this.config.macdSlow);

    const macdLine = fastEMA - slowEMA;

    // Simplified signal line calculation
    const macdValues: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      const fast = this.calculateEMAAtIndex(closes, this.config.macdFast, i);
      const slow = this.calculateEMAAtIndex(closes, this.config.macdSlow, i);
      macdValues.push(fast - slow);
    }

    const signal = this.calculateEMA(
      macdValues.slice(-this.config.macdSignal * 2),
      this.config.macdSignal
    );
    const histogram = macdLine - signal;

    return { macd: macdLine, signal, histogram };
  }

  /**
   * Calculate EMA (Exponential Moving Average)
   */
  private calculateEMA(values: number[], period: number): number {
    if (values.length < period) {
      return values[values.length - 1] || 0;
    }

    const multiplier = 2 / (period + 1);
    let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < values.length; i++) {
      ema = (values[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  /**
   * Calculate EMA at a specific index
   */
  private calculateEMAAtIndex(
    values: number[],
    period: number,
    index: number
  ): number {
    const sliced = values.slice(0, index + 1);
    return this.calculateEMA(sliced, period);
  }

  /**
   * Calculate volume ratio (current vs average)
   */
  private calculateVolumeRatio(volumes: number[]): number {
    const period = Math.min(this.config.volumeAvgPeriod, volumes.length - 1);
    if (period < 1) {
      return 1;
    }

    const avgVolume =
      volumes.slice(-period - 1, -1).reduce((a, b) => a + b, 0) / period;
    const currentVolume = volumes[volumes.length - 1];

    if (avgVolume === 0) {
      return 1;
    }

    return currentVolume / avgVolume;
  }

  /**
   * Calculate overall momentum direction, strength, and score
   */
  private calculateMomentum(
    rsi: number,
    macdHistogram: number,
    volumeRatio: number,
    closes: number[]
  ): { direction: MomentumDirection; strength: MomentumStrength; score: number } {
    // Calculate price change momentum
    const recentPriceChange =
      closes.length >= 5
        ? ((closes[closes.length - 1] - closes[closes.length - 5]) /
            closes[closes.length - 5]) *
          100
        : 0;

    // RSI score (-50 to 50)
    let rsiScore = 0;
    if (rsi > this.config.rsiOverbought) {
      rsiScore =
        ((rsi - this.config.rsiOverbought) /
          (100 - this.config.rsiOverbought)) *
        50;
    } else if (rsi < this.config.rsiOversold) {
      rsiScore =
        -((this.config.rsiOversold - rsi) / this.config.rsiOversold) * 50;
    } else {
      rsiScore = ((rsi - 50) / 20) * 25;
    }

    // MACD score (-30 to 30)
    const macdScore = Math.max(-30, Math.min(30, macdHistogram * 10));

    // Volume amplifier (0.8 to 1.5)
    const volumeMultiplier = Math.max(0.8, Math.min(1.5, 0.8 + volumeRatio * 0.2));

    // Price momentum score (-20 to 20)
    const priceScore = Math.max(-20, Math.min(20, recentPriceChange * 5));

    // Combined score
    let score = (rsiScore + macdScore + priceScore) * volumeMultiplier;
    score = Math.max(-100, Math.min(100, score));

    // Determine direction
    let direction: MomentumDirection;
    if (score > 15) {
      direction = 'bullish';
    } else if (score < -15) {
      direction = 'bearish';
    } else {
      direction = 'neutral';
    }

    // Determine strength
    let strength: MomentumStrength;
    const absScore = Math.abs(score);
    if (absScore > 60) {
      strength = 'strong';
    } else if (absScore > 30) {
      strength = 'moderate';
    } else {
      strength = 'weak';
    }

    return { direction, strength, score };
  }
}
