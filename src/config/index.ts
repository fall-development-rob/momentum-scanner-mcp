/**
 * Configuration management system for momentum scanner
 *
 * This module provides a comprehensive configuration system with:
 * - Type-safe configuration definitions
 * - Default configurations for different environments
 * - Configuration validation
 * - Multiple configuration sources (defaults, files, env vars, overrides)
 * - Runtime configuration management
 *
 * @example
 * ```typescript
 * import { loadConfig, ConfigManager, DEFAULT_CONFIG } from './config';
 *
 * // Load with defaults and environment variables
 * const config = loadConfig();
 *
 * // Load with custom file
 * const config = loadConfig({ configFile: './scanner.config.json' });
 *
 * // Use config manager for runtime updates
 * const manager = new ConfigManager();
 * const config = manager.getConfig();
 * manager.updateConfig({ cache: { ttl: 120000 } });
 * ```
 */

// Export types
export type {
  ScannerConfig,
  PartialScannerConfig,
  RSIIndicatorConfig,
  MACDIndicatorConfig,
  VolumeIndicatorConfig,
  ScannerSettings,
  CacheSettings,
  DataProviderConfig,
  LoggingConfig,
  PerformanceConfig,
  ConfigValidationResult,
  ConfigSource,
  ConfigMetadata,
} from './types.js';

// Export defaults
export {
  DEFAULT_CONFIG,
  MINIMAL_CONFIG,
  PRODUCTION_CONFIG,
} from './defaults.js';

// Export validation functions
export {
  validateConfig,
  validatePartialConfig,
  isProductionSafe,
} from './validator.js';

// Export loading and merging functions
export {
  mergeConfig,
  loadConfigFromFile,
  loadConfigFromEnv,
  loadConfig,
  createConfigMetadata,
  ConfigManager,
} from './loader.js';

// Re-export for convenience
import { DEFAULT_CONFIG } from './defaults.js';
import { loadConfig } from './loader.js';

/**
 * Quick access to default configuration
 */
export const defaultConfig = DEFAULT_CONFIG;

/**
 * Quick function to load configuration with sensible defaults
 */
export const getConfig = loadConfig;
