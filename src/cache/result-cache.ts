import { Timeframe, TIMEFRAME_MS } from '../types/timeframe.js';
import { MomentumResult } from '../types/momentum.js';

/**
 * Cache entry with TTL
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /**
   * Default TTL in milliseconds (defaults to 30 seconds)
   */
  defaultTtlMs?: number;

  /**
   * Maximum cache entries (defaults to 1000)
   */
  maxEntries?: number;

  /**
   * TTL multiplier per timeframe (higher timeframes cached longer)
   */
  timeframeTtlMultiplier?: Partial<Record<Timeframe, number>>;
}

const DEFAULT_CONFIG: Required<CacheConfig> = {
  defaultTtlMs: 30_000,
  maxEntries: 1000,
  timeframeTtlMultiplier: {
    '1m': 0.5,
    '5m': 1,
    '15m': 2,
    '1h': 4,
    '4h': 8,
    '1d': 24,
  },
};

/**
 * LRU Cache for momentum analysis results
 * Efficiently stores results with timeframe-aware TTL
 */
export class ResultCache {
  private cache: Map<string, CacheEntry<MomentumResult>> = new Map();
  private config: Required<CacheConfig>;
  private accessOrder: string[] = [];

  constructor(config: CacheConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate cache key for a result
   */
  private generateKey(symbol: string, timeframe: Timeframe): string {
    return `${symbol}:${timeframe}`;
  }

  /**
   * Get TTL for a specific timeframe
   */
  private getTtl(timeframe: Timeframe): number {
    const multiplier = this.config.timeframeTtlMultiplier[timeframe] ?? 1;
    return this.config.defaultTtlMs * multiplier;
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<MomentumResult>): boolean {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Evict oldest entries if cache is full
   */
  private evictIfNeeded(): void {
    while (
      this.cache.size >= this.config.maxEntries &&
      this.accessOrder.length > 0
    ) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * Update access order for LRU
   */
  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Get cached result
   */
  get(symbol: string, timeframe: Timeframe): MomentumResult | null {
    const key = this.generateKey(symbol, timeframe);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      return null;
    }

    this.updateAccessOrder(key);
    return entry.data;
  }

  /**
   * Set cached result
   */
  set(result: MomentumResult): void {
    const key = this.generateKey(result.symbol, result.timeframe);
    const ttl = this.getTtl(result.timeframe);
    const now = Date.now();

    this.evictIfNeeded();

    this.cache.set(key, {
      data: result,
      timestamp: now,
      expiresAt: now + ttl,
    });

    this.updateAccessOrder(key);
  }

  /**
   * Set multiple results at once
   */
  setMany(results: MomentumResult[]): void {
    for (const result of results) {
      this.set(result);
    }
  }

  /**
   * Get multiple results
   */
  getMany(
    symbol: string,
    timeframes: Timeframe[]
  ): Map<Timeframe, MomentumResult | null> {
    const results = new Map<Timeframe, MomentumResult | null>();
    for (const timeframe of timeframes) {
      results.set(timeframe, this.get(symbol, timeframe));
    }
    return results;
  }

  /**
   * Check if result exists and is valid
   */
  has(symbol: string, timeframe: Timeframe): boolean {
    return this.get(symbol, timeframe) !== null;
  }

  /**
   * Invalidate cache for a symbol
   */
  invalidate(symbol: string, timeframe?: Timeframe): void {
    if (timeframe) {
      const key = this.generateKey(symbol, timeframe);
      this.cache.delete(key);
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    } else {
      // Invalidate all timeframes for the symbol
      const keysToDelete: string[] = [];
      for (const [key] of this.cache) {
        if (key.startsWith(`${symbol}:`)) {
          keysToDelete.push(key);
        }
      }
      for (const key of keysToDelete) {
        this.cache.delete(key);
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
          this.accessOrder.splice(index, 1);
        }
      }
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; maxEntries: number } {
    return {
      size: this.cache.size,
      maxEntries: this.config.maxEntries,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    let removed = 0;
    const keysToDelete: string[] = [];
    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.cache.delete(key);
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      removed++;
    }
    return removed;
  }
}
