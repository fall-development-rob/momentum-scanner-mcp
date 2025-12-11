/**
 * Configuration loading and merging utilities
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import {
  ScannerConfig,
  PartialScannerConfig,
  ConfigMetadata,
  ConfigSource,
} from './types.js';
import { DEFAULT_CONFIG } from './defaults.js';
import { validateConfig } from './validator.js';

/**
 * Deep merges two objects, with the second overriding the first
 */
function deepMerge<T extends Record<string, any>>(
  base: T,
  override: Partial<T>
): T {
  const result = { ...base };

  for (const key in override) {
    const overrideValue = override[key];
    const baseValue = base[key];

    if (
      overrideValue !== undefined &&
      typeof overrideValue === 'object' &&
      !Array.isArray(overrideValue) &&
      overrideValue !== null &&
      typeof baseValue === 'object' &&
      !Array.isArray(baseValue) &&
      baseValue !== null
    ) {
      // Recursively merge nested objects
      result[key] = deepMerge(
        baseValue as Record<string, any>,
        overrideValue as Record<string, any>
      ) as T[Extract<keyof T, string>];
    } else if (overrideValue !== undefined) {
      // Override primitive values and arrays
      result[key] = overrideValue as T[Extract<keyof T, string>];
    }
  }

  return result;
}

/**
 * Merges multiple configuration objects with defaults
 * Later configurations override earlier ones
 */
export function mergeConfig(
  base: ScannerConfig,
  ...overrides: PartialScannerConfig[]
): ScannerConfig {
  let result = base;
  for (const override of overrides) {
    result = deepMerge(result, override as any);
  }
  return result;
}

/**
 * Loads configuration from a JSON file
 */
export function loadConfigFromFile(filePath: string): PartialScannerConfig {
  const resolvedPath = resolve(filePath);

  if (!existsSync(resolvedPath)) {
    throw new Error(`Configuration file not found: ${resolvedPath}`);
  }

  try {
    const content = readFileSync(resolvedPath, 'utf-8');
    const config = JSON.parse(content);
    return config as PartialScannerConfig;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    throw new Error(
      `Failed to load configuration from ${resolvedPath}: ${message}`
    );
  }
}

/**
 * Loads configuration from environment variables
 * Environment variables should be prefixed with SCANNER_
 */
export function loadConfigFromEnv(): PartialScannerConfig {
  const config: PartialScannerConfig = {};

  // RSI configuration
  if (process.env.SCANNER_RSI_PERIOD) {
    config.rsi = config.rsi || {};
    config.rsi.period = parseInt(process.env.SCANNER_RSI_PERIOD, 10);
  }
  if (process.env.SCANNER_RSI_OVERBOUGHT) {
    config.rsi = config.rsi || {};
    config.rsi.overbought = parseInt(
      process.env.SCANNER_RSI_OVERBOUGHT,
      10
    );
  }
  if (process.env.SCANNER_RSI_OVERSOLD) {
    config.rsi = config.rsi || {};
    config.rsi.oversold = parseInt(process.env.SCANNER_RSI_OVERSOLD, 10);
  }

  // MACD configuration
  if (process.env.SCANNER_MACD_FAST) {
    config.macd = config.macd || {};
    config.macd.fastPeriod = parseInt(process.env.SCANNER_MACD_FAST, 10);
  }
  if (process.env.SCANNER_MACD_SLOW) {
    config.macd = config.macd || {};
    config.macd.slowPeriod = parseInt(process.env.SCANNER_MACD_SLOW, 10);
  }
  if (process.env.SCANNER_MACD_SIGNAL) {
    config.macd = config.macd || {};
    config.macd.signalPeriod = parseInt(
      process.env.SCANNER_MACD_SIGNAL,
      10
    );
  }

  // Cache configuration
  if (process.env.SCANNER_CACHE_ENABLED) {
    if (!config.cache) config.cache = {} as any;
    config.cache!.enabled =
      process.env.SCANNER_CACHE_ENABLED.toLowerCase() === 'true';
  }
  if (process.env.SCANNER_CACHE_TTL) {
    if (!config.cache) config.cache = {} as any;
    config.cache!.ttl = parseInt(process.env.SCANNER_CACHE_TTL, 10);
  }

  // Data provider configuration
  if (process.env.SCANNER_DATA_PROVIDER) {
    config.dataProvider = config.dataProvider || {};
    config.dataProvider.provider = process.env.SCANNER_DATA_PROVIDER;
  }
  if (process.env.SCANNER_API_KEY) {
    config.dataProvider = config.dataProvider || {};
    config.dataProvider.apiKey = process.env.SCANNER_API_KEY;
  }
  if (process.env.SCANNER_API_SECRET) {
    config.dataProvider = config.dataProvider || {};
    config.dataProvider.apiSecret = process.env.SCANNER_API_SECRET;
  }

  // Logging configuration
  if (process.env.SCANNER_LOG_LEVEL) {
    if (!config.logging) config.logging = {} as any;
    const level = process.env.SCANNER_LOG_LEVEL.toLowerCase();
    if (['debug', 'info', 'warn', 'error'].includes(level)) {
      config.logging!.level = level as 'debug' | 'info' | 'warn' | 'error';
    }
  }

  return config;
}

/**
 * Loads configuration with the following precedence (highest to lowest):
 * 1. Explicit overrides passed to the function
 * 2. Environment variables
 * 3. Configuration file (if specified)
 * 4. Default configuration
 */
export function loadConfig(options?: {
  configFile?: string;
  overrides?: PartialScannerConfig;
  skipEnv?: boolean;
  skipValidation?: boolean;
}): ScannerConfig {
  const { configFile, overrides, skipEnv, skipValidation } = options || {};

  // Start with defaults
  let config = DEFAULT_CONFIG;

  // Merge file configuration if provided
  if (configFile) {
    const fileConfig = loadConfigFromFile(configFile);
    config = mergeConfig(config, fileConfig);
  }

  // Merge environment variables unless skipped
  if (!skipEnv) {
    const envConfig = loadConfigFromEnv();
    config = mergeConfig(config, envConfig);
  }

  // Merge explicit overrides
  if (overrides) {
    config = mergeConfig(config, overrides);
  }

  // Validate unless skipped
  if (!skipValidation) {
    const validation = validateConfig(config);
    if (!validation.valid) {
      throw new Error(
        `Invalid configuration: ${validation.errors.join(', ')}`
      );
    }

    // Log warnings if present
    if (validation.warnings.length > 0) {
      console.warn(
        'Configuration warnings:',
        validation.warnings.join(', ')
      );
    }
  }

  return config;
}

/**
 * Creates configuration metadata
 */
export function createConfigMetadata(source: ConfigSource): ConfigMetadata {
  return {
    source,
    loadedAt: Date.now(),
    version: '0.1.0',
  };
}

/**
 * Configuration manager class for runtime config management
 */
export class ConfigManager {
  private config: ScannerConfig;
  private metadata: ConfigMetadata;

  constructor(options?: {
    configFile?: string;
    overrides?: PartialScannerConfig;
    skipEnv?: boolean;
  }) {
    this.config = loadConfig(options);
    this.metadata = createConfigMetadata(
      options?.configFile
        ? 'file'
        : options?.overrides
        ? 'override'
        : options?.skipEnv
        ? 'default'
        : 'env'
    );
  }

  /**
   * Gets the current configuration
   */
  getConfig(): Readonly<ScannerConfig> {
    return this.config;
  }

  /**
   * Gets configuration metadata
   */
  getMetadata(): Readonly<ConfigMetadata> {
    return this.metadata;
  }

  /**
   * Updates configuration at runtime
   */
  updateConfig(overrides: PartialScannerConfig): void {
    const newConfig = mergeConfig(this.config, overrides);
    const validation = validateConfig(newConfig);

    if (!validation.valid) {
      throw new Error(
        `Invalid configuration update: ${validation.errors.join(', ')}`
      );
    }

    this.config = newConfig;
    this.metadata = createConfigMetadata('override');
  }

  /**
   * Resets configuration to defaults
   */
  resetToDefaults(): void {
    this.config = DEFAULT_CONFIG;
    this.metadata = createConfigMetadata('default');
  }

  /**
   * Exports current configuration as JSON string
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }
}
