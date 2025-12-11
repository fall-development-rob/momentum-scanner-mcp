import { Timeframe } from '../types/timeframe';
import { MomentumResult } from '../types/momentum';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheConfig {
  defaultTtlMs?: number;
  maxEntries?: number;
  timeframeTtlMultiplier?: Partial<Record<Timeframe, number>>;
}

const DEFAULT_CONFIG: Required<CacheConfig> = {
  defaultTtlMs: 30_000,
  maxEntries: 1000,
  timeframeTtlMultiplier: { '1m': 0.5, '5m': 1, '15m': 2, '1h': 4, '4h': 8, '1d': 24 },
};

export class ResultCache {
  private cache: Map<string, CacheEntry<MomentumResult>> = new Map();
  private config: Required<CacheConfig>;
  private accessOrder: string[] = [];

  constructor(config: CacheConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private generateKey(symbol: string, timeframe: Timeframe): string {
    return `${symbol}:${timeframe}`;
  }

  private getTtl(timeframe: Timeframe): number {
    const multiplier = this.config.timeframeTtlMultiplier[timeframe] ?? 1;
    return this.config.defaultTtlMs * multiplier;
  }

  private isExpired(entry: CacheEntry<MomentumResult>): boolean {
    return Date.now() > entry.expiresAt;
  }

  private evictIfNeeded(): void {
    while (this.cache.size >= this.config.maxEntries && this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) this.cache.delete(oldestKey);
    }
  }

  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) this.accessOrder.splice(index, 1);
    this.accessOrder.push(key);
  }

  get(symbol: string, timeframe: Timeframe): MomentumResult | null {
    const key = this.generateKey(symbol, timeframe);
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      const index = this.accessOrder.indexOf(key);
      if (index > -1) this.accessOrder.splice(index, 1);
      return null;
    }
    this.updateAccessOrder(key);
    return entry.data;
  }

  set(result: MomentumResult): void {
    const key = this.generateKey(result.symbol, result.timeframe);
    const ttl = this.getTtl(result.timeframe);
    const now = Date.now();
    this.evictIfNeeded();
    this.cache.set(key, { data: result, timestamp: now, expiresAt: now + ttl });
    this.updateAccessOrder(key);
  }

  setMany(results: MomentumResult[]): void {
    for (const result of results) this.set(result);
  }

  getMany(symbol: string, timeframes: Timeframe[]): Map<Timeframe, MomentumResult | null> {
    const results = new Map<Timeframe, MomentumResult | null>();
    for (const timeframe of timeframes) results.set(timeframe, this.get(symbol, timeframe));
    return results;
  }

  has(symbol: string, timeframe: Timeframe): boolean {
    return this.get(symbol, timeframe) !== null;
  }

  invalidate(symbol: string, timeframe?: Timeframe): void {
    if (timeframe) {
      const key = this.generateKey(symbol, timeframe);
      this.cache.delete(key);
      const index = this.accessOrder.indexOf(key);
      if (index > -1) this.accessOrder.splice(index, 1);
    } else {
      const keysToDelete: string[] = [];
      for (const [key] of this.cache) {
        if (key.startsWith(`${symbol}:`)) keysToDelete.push(key);
      }
      for (const key of keysToDelete) {
        this.cache.delete(key);
        const index = this.accessOrder.indexOf(key);
        if (index > -1) this.accessOrder.splice(index, 1);
      }
    }
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  stats(): { size: number; maxEntries: number } {
    return { size: this.cache.size, maxEntries: this.config.maxEntries };
  }

  cleanup(): number {
    let removed = 0;
    const keysToDelete: string[] = [];
    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry)) keysToDelete.push(key);
    }
    for (const key of keysToDelete) {
      this.cache.delete(key);
      const index = this.accessOrder.indexOf(key);
      if (index > -1) this.accessOrder.splice(index, 1);
      removed++;
    }
    return removed;
  }
}
