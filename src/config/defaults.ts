/**
 * Default configuration values for the momentum scanner
 */

import { ScannerConfig } from './types.js';

/**
 * Default configuration for the momentum scanner
 * These values provide sensible defaults for most use cases
 */
export const DEFAULT_CONFIG: ScannerConfig = {
  // RSI Indicator defaults - Standard RSI(14) with classic overbought/oversold levels
  rsi: {
    period: 14,
    overbought: 70,
    oversold: 30,
  },

  // MACD Indicator defaults - Standard MACD(12,26,9)
  macd: {
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
  },

  // Volume Indicator defaults
  volume: {
    averagePeriod: 20, // 20-period average volume
    significantThreshold: 1.5, // 50% above average is significant
  },

  // Scanner settings
  scanner: {
    defaultTimeframes: ['1h', '4h', '1d'], // Multi-timeframe analysis
    defaultLookback: 100, // Analyze last 100 candles
    maxSymbolsPerScan: 50, // Limit to prevent overload
    concurrentScans: 5, // Process 5 symbols concurrently
  },

  // Cache settings - Enabled by default for performance
  cache: {
    enabled: true,
    ttl: 60000, // 1 minute default TTL
    maxEntries: 1000,
    timeframeTtlMultiplier: {
      '1m': 0.5, // 30 seconds for 1-minute data
      '5m': 1, // 1 minute for 5-minute data
      '15m': 2, // 2 minutes for 15-minute data
      '1h': 5, // 5 minutes for hourly data
      '4h': 15, // 15 minutes for 4-hour data
      '1d': 60, // 60 minutes for daily data
    },
  },

  // Data provider settings - Optional, can be configured as needed
  dataProvider: {
    provider: 'mock', // Use mock data by default
    timeout: 10000, // 10 second timeout
    retries: 3, // Retry failed requests 3 times
  },

  // Logging settings
  logging: {
    level: 'info',
    enableConsole: true,
    enableFile: false,
  },

  // Performance settings
  performance: {
    enableMetrics: false,
    metricsInterval: 60000, // Collect metrics every minute
    enableProfiling: false,
  },
};

/**
 * Minimal configuration for testing or lightweight usage
 */
export const MINIMAL_CONFIG: ScannerConfig = {
  rsi: {
    period: 14,
    overbought: 70,
    oversold: 30,
  },
  macd: {
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
  },
  volume: {
    averagePeriod: 20,
    significantThreshold: 1.5,
  },
  scanner: {
    defaultTimeframes: ['1h'],
    defaultLookback: 50,
    maxSymbolsPerScan: 10,
    concurrentScans: 1,
  },
  cache: {
    enabled: false,
    ttl: 30000,
    maxEntries: 100,
  },
  logging: {
    level: 'warn',
    enableConsole: true,
  },
  performance: {
    enableMetrics: false,
  },
};

/**
 * Production-optimized configuration
 */
export const PRODUCTION_CONFIG: ScannerConfig = {
  rsi: {
    period: 14,
    overbought: 70,
    oversold: 30,
  },
  macd: {
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
  },
  volume: {
    averagePeriod: 20,
    significantThreshold: 1.5,
  },
  scanner: {
    defaultTimeframes: ['5m', '15m', '1h', '4h', '1d'],
    defaultLookback: 200,
    maxSymbolsPerScan: 100,
    concurrentScans: 10,
  },
  cache: {
    enabled: true,
    ttl: 60000,
    maxEntries: 5000,
    timeframeTtlMultiplier: {
      '1m': 0.5,
      '5m': 1,
      '15m': 2,
      '1h': 5,
      '4h': 15,
      '1d': 60,
    },
  },
  logging: {
    level: 'info',
    enableConsole: true,
    enableFile: true,
    filePath: './logs/scanner.log',
  },
  performance: {
    enableMetrics: true,
    metricsInterval: 60000,
    enableProfiling: false,
  },
};
