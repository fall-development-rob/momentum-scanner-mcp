/**
 * Configuration validation utilities
 */

import {
  ScannerConfig,
  ConfigValidationResult,
  RSIIndicatorConfig,
  MACDIndicatorConfig,
  VolumeIndicatorConfig,
  ScannerSettings,
  CacheSettings,
} from './types.js';

/**
 * Validates RSI configuration
 */
function validateRSI(config: RSIIndicatorConfig): string[] {
  const errors: string[] = [];

  if (config.period < 2) {
    errors.push('RSI period must be at least 2');
  }
  if (config.period > 100) {
    errors.push('RSI period should not exceed 100');
  }
  if (config.overbought <= config.oversold) {
    errors.push('RSI overbought level must be greater than oversold level');
  }
  if (config.overbought > 100 || config.overbought < 0) {
    errors.push('RSI overbought level must be between 0 and 100');
  }
  if (config.oversold > 100 || config.oversold < 0) {
    errors.push('RSI oversold level must be between 0 and 100');
  }

  return errors;
}

/**
 * Validates MACD configuration
 */
function validateMACD(config: MACDIndicatorConfig): string[] {
  const errors: string[] = [];

  if (config.fastPeriod < 2) {
    errors.push('MACD fast period must be at least 2');
  }
  if (config.slowPeriod < 2) {
    errors.push('MACD slow period must be at least 2');
  }
  if (config.signalPeriod < 2) {
    errors.push('MACD signal period must be at least 2');
  }
  if (config.fastPeriod >= config.slowPeriod) {
    errors.push('MACD fast period must be less than slow period');
  }
  if (config.slowPeriod > 200) {
    errors.push('MACD slow period should not exceed 200');
  }

  return errors;
}

/**
 * Validates Volume configuration
 */
function validateVolume(config: VolumeIndicatorConfig): string[] {
  const errors: string[] = [];

  if (config.averagePeriod < 2) {
    errors.push('Volume average period must be at least 2');
  }
  if (config.averagePeriod > 200) {
    errors.push('Volume average period should not exceed 200');
  }
  if (config.significantThreshold <= 0) {
    errors.push('Volume significant threshold must be positive');
  }
  if (config.significantThreshold > 10) {
    errors.push('Volume significant threshold seems too high (>10x)');
  }

  return errors;
}

/**
 * Validates Scanner settings
 */
function validateScanner(config: ScannerSettings): string[] {
  const errors: string[] = [];

  if (config.defaultTimeframes.length === 0) {
    errors.push('At least one default timeframe must be specified');
  }
  if (config.defaultLookback < 10) {
    errors.push('Default lookback should be at least 10 candles');
  }
  if (config.defaultLookback > 1000) {
    errors.push('Default lookback should not exceed 1000 candles');
  }
  if (config.maxSymbolsPerScan < 1) {
    errors.push('Max symbols per scan must be at least 1');
  }
  if (config.concurrentScans < 1) {
    errors.push('Concurrent scans must be at least 1');
  }
  if (config.concurrentScans > 50) {
    errors.push('Concurrent scans should not exceed 50');
  }

  return errors;
}

/**
 * Validates Cache settings
 */
function validateCache(config: CacheSettings): string[] {
  const errors: string[] = [];

  if (config.ttl < 0) {
    errors.push('Cache TTL cannot be negative');
  }
  if (config.ttl > 86400000) {
    // 24 hours
    errors.push('Cache TTL should not exceed 24 hours');
  }
  if (config.maxEntries < 0) {
    errors.push('Cache max entries cannot be negative');
  }
  if (config.maxEntries > 100000) {
    errors.push('Cache max entries should not exceed 100000');
  }

  // Validate timeframe multipliers if present
  if (config.timeframeTtlMultiplier) {
    for (const [timeframe, multiplier] of Object.entries(
      config.timeframeTtlMultiplier
    )) {
      if (multiplier < 0) {
        errors.push(
          `Cache TTL multiplier for ${timeframe} cannot be negative`
        );
      }
      if (multiplier > 1000) {
        errors.push(
          `Cache TTL multiplier for ${timeframe} should not exceed 1000`
        );
      }
    }
  }

  return errors;
}

/**
 * Validates complete scanner configuration
 */
export function validateConfig(
  config: ScannerConfig
): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate each section
  errors.push(...validateRSI(config.rsi));
  errors.push(...validateMACD(config.macd));
  errors.push(...validateVolume(config.volume));
  errors.push(...validateScanner(config.scanner));
  errors.push(...validateCache(config.cache));

  // Add warnings for potentially problematic configurations
  if (config.cache.enabled && config.cache.ttl < 1000) {
    warnings.push(
      'Very low cache TTL (<1s) may reduce performance benefits'
    );
  }

  if (config.scanner.concurrentScans > 20) {
    warnings.push(
      'High concurrent scans may cause performance issues or rate limiting'
    );
  }

  if (config.scanner.defaultLookback > 500) {
    warnings.push('Large lookback period may increase computation time');
  }

  if (config.logging.level === 'debug' && !config.logging.enableFile) {
    warnings.push(
      'Debug logging without file output may clutter console'
    );
  }

  // Validate data provider if present
  if (config.dataProvider) {
    if (config.dataProvider.timeout && config.dataProvider.timeout < 1000) {
      errors.push('Data provider timeout should be at least 1000ms');
    }
    if (
      config.dataProvider.retries &&
      config.dataProvider.retries > 10
    ) {
      warnings.push('High retry count may cause long delays on failures');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates a partial configuration and returns errors
 */
export function validatePartialConfig(
  config: any
): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (config.rsi) {
    errors.push(...validateRSI(config.rsi as RSIIndicatorConfig));
  }
  if (config.macd) {
    errors.push(...validateMACD(config.macd as MACDIndicatorConfig));
  }
  if (config.volume) {
    errors.push(...validateVolume(config.volume as VolumeIndicatorConfig));
  }
  if (config.scanner) {
    errors.push(...validateScanner(config.scanner as ScannerSettings));
  }
  if (config.cache) {
    errors.push(...validateCache(config.cache as CacheSettings));
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Checks if a configuration is safe for production use
 */
export function isProductionSafe(config: ScannerConfig): boolean {
  const validation = validateConfig(config);
  if (!validation.valid) {
    return false;
  }

  // Additional production checks
  if (!config.cache.enabled) {
    return false; // Production should use caching
  }

  if (config.logging.level === 'debug') {
    return false; // Debug logging not suitable for production
  }

  if (config.dataProvider?.provider === 'mock') {
    return false; // Mock data not suitable for production
  }

  return true;
}
