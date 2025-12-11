/**
 * Configuration types for the momentum scanner
 */

import { Timeframe } from '../types/timeframe.js';

/**
 * RSI Indicator Configuration
 */
export interface RSIIndicatorConfig {
  period: number;
  overbought: number;
  oversold: number;
}

/**
 * MACD Indicator Configuration
 */
export interface MACDIndicatorConfig {
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
}

/**
 * Volume Indicator Configuration
 */
export interface VolumeIndicatorConfig {
  averagePeriod: number;
  significantThreshold: number; // Multiplier for significant volume
}

/**
 * Scanner Settings Configuration
 */
export interface ScannerSettings {
  defaultTimeframes: Timeframe[];
  defaultLookback: number; // Number of candles to analyze
  maxSymbolsPerScan: number;
  concurrentScans: number;
}

/**
 * Cache Configuration
 */
export interface CacheSettings {
  enabled: boolean;
  ttl: number; // Time-to-live in milliseconds
  maxEntries: number;
  timeframeTtlMultiplier?: Partial<Record<Timeframe, number>>;
}

/**
 * API/Data Provider Configuration
 */
export interface DataProviderConfig {
  provider?: string; // Name of data provider (e.g., 'binance', 'alpaca')
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

/**
 * Logging Configuration
 */
export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  enableConsole: boolean;
  enableFile?: boolean;
  filePath?: string;
}

/**
 * Performance Configuration
 */
export interface PerformanceConfig {
  enableMetrics: boolean;
  metricsInterval?: number; // Milliseconds
  enableProfiling?: boolean;
}

/**
 * Complete Scanner Configuration
 */
export interface ScannerConfig {
  // Indicator configurations
  rsi: RSIIndicatorConfig;
  macd: MACDIndicatorConfig;
  volume: VolumeIndicatorConfig;

  // Scanner settings
  scanner: ScannerSettings;

  // Cache settings
  cache: CacheSettings;

  // Data provider settings
  dataProvider?: DataProviderConfig;

  // Logging settings
  logging: LoggingConfig;

  // Performance settings
  performance: PerformanceConfig;

  // Custom settings for extensibility
  custom?: Record<string, unknown>;
}

/**
 * Partial configuration for merging with defaults
 */
export type PartialScannerConfig = {
  [K in keyof ScannerConfig]?: ScannerConfig[K] extends object
    ? Partial<ScannerConfig[K]>
    : ScannerConfig[K];
};

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Configuration source type
 */
export type ConfigSource = 'default' | 'file' | 'env' | 'override';

/**
 * Configuration metadata
 */
export interface ConfigMetadata {
  source: ConfigSource;
  loadedAt: number;
  version: string;
}
