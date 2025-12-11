import { Timeframe } from '../types/timeframe';
import { Candle, MomentumDirection, MomentumResult, MomentumStrength, AnalysisError } from '../types/momentum';

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
  rsiPeriod: 14, rsiOverbought: 70, rsiOversold: 30,
  macdFast: 12, macdSlow: 26, macdSignal: 9,
  volumeAvgPeriod: 20,
};

export class MomentumAnalyzer {
  private config: Required<MomentumAnalyzerConfig>;

  constructor(config: MomentumAnalyzerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  analyze(symbol: string, timeframe: Timeframe, candles: Candle[]): MomentumResult {
    const minCandles = this.config.macdSlow + this.config.macdSignal;
    if (candles.length < minCandles) {
      throw new AnalysisError(
        `Insufficient candles for analysis. Need at least ${minCandles}, got ${candles.length}`,
        'INSUFFICIENT_DATA', timeframe, symbol
      );
    }
    const closes = candles.map((c) => c.close);
    const volumes = candles.map((c) => c.volume);
    const rsi = this.calculateRSI(closes);
    const { histogram } = this.calculateMACD(closes);
    const volumeRatio = this.calculateVolumeRatio(volumes);
    const { direction, strength, score } = this.calculateMomentum(rsi, histogram, volumeRatio, closes);

    return { timeframe, symbol, timestamp: Date.now(), direction, strength, score, rsi, macdSignal: histogram, volumeRatio,
      metadata: { candleCount: candles.length, latestClose: closes[closes.length - 1] } };
  }

  private calculateRSI(closes: number[]): number {
    const period = this.config.rsiPeriod;
    if (closes.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change; else losses -= change;
    }
    let avgGain = gains / period, avgLoss = losses / period;
    for (let i = period + 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      const gain = change > 0 ? change : 0, loss = change < 0 ? -change : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    if (avgLoss === 0) return 100;
    return 100 - 100 / (1 + avgGain / avgLoss);
  }

  private calculateMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
    const fastEMA = this.calculateEMA(closes, this.config.macdFast);
    const slowEMA = this.calculateEMA(closes, this.config.macdSlow);
    const macdLine = fastEMA - slowEMA;
    const macdValues: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      const fast = this.calculateEMAAtIndex(closes, this.config.macdFast, i);
      const slow = this.calculateEMAAtIndex(closes, this.config.macdSlow, i);
      macdValues.push(fast - slow);
    }
    const signal = this.calculateEMA(macdValues.slice(-this.config.macdSignal * 2), this.config.macdSignal);
    return { macd: macdLine, signal, histogram: macdLine - signal };
  }

  private calculateEMA(values: number[], period: number): number {
    if (values.length < period) return values[values.length - 1] || 0;
    const multiplier = 2 / (period + 1);
    let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < values.length; i++) ema = (values[i] - ema) * multiplier + ema;
    return ema;
  }

  private calculateEMAAtIndex(values: number[], period: number, index: number): number {
    return this.calculateEMA(values.slice(0, index + 1), period);
  }

  private calculateVolumeRatio(volumes: number[]): number {
    const period = Math.min(this.config.volumeAvgPeriod, volumes.length - 1);
    if (period < 1) return 1;
    const avgVolume = volumes.slice(-period - 1, -1).reduce((a, b) => a + b, 0) / period;
    if (avgVolume === 0) return 1;
    return volumes[volumes.length - 1] / avgVolume;
  }

  private calculateMomentum(rsi: number, macdHistogram: number, volumeRatio: number, closes: number[]): 
    { direction: MomentumDirection; strength: MomentumStrength; score: number } {
    const recentPriceChange = closes.length >= 5 ? ((closes[closes.length - 1] - closes[closes.length - 5]) / closes[closes.length - 5]) * 100 : 0;
    let rsiScore = 0;
    if (rsi > this.config.rsiOverbought) rsiScore = ((rsi - this.config.rsiOverbought) / (100 - this.config.rsiOverbought)) * 50;
    else if (rsi < this.config.rsiOversold) rsiScore = -((this.config.rsiOversold - rsi) / this.config.rsiOversold) * 50;
    else rsiScore = ((rsi - 50) / 20) * 25;
    const macdScore = Math.max(-30, Math.min(30, macdHistogram * 10));
    const volumeMultiplier = Math.max(0.8, Math.min(1.5, 0.8 + volumeRatio * 0.2));
    const priceScore = Math.max(-20, Math.min(20, recentPriceChange * 5));
    let score = (rsiScore + macdScore + priceScore) * volumeMultiplier;
    score = Math.max(-100, Math.min(100, score));
    let direction: MomentumDirection = score > 15 ? 'bullish' : score < -15 ? 'bearish' : 'neutral';
    const absScore = Math.abs(score);
    let strength: MomentumStrength = absScore > 60 ? 'strong' : absScore > 30 ? 'moderate' : 'weak';
    return { direction, strength, score };
  }
}
