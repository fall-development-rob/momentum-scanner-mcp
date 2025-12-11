# Configuration Management System

This directory contains the configuration management system for the momentum scanner MCP server.

## Overview

The configuration system provides:
- **Type-safe** configuration definitions
- **Multiple sources**: defaults, files, environment variables, runtime overrides
- **Validation**: automatic validation with error and warning reporting
- **Merging**: deep merging of configuration from multiple sources
- **Runtime management**: dynamic configuration updates
- **Presets**: default, minimal, and production configurations

## Quick Start

```typescript
import { loadConfig, ConfigManager } from './config';

// Load with defaults + environment variables
const config = loadConfig();

// Load from file
const config = loadConfig({ configFile: './scanner.config.json' });

// Load with overrides
const config = loadConfig({
  overrides: {
    cache: { enabled: true, ttl: 60000 },
    logging: { level: 'debug' }
  }
});
```

## Configuration Structure

```typescript
interface ScannerConfig {
  rsi: {
    period: number;
    overbought: number;
    oversold: number;
  };
  macd: {
    fastPeriod: number;
    slowPeriod: number;
    signalPeriod: number;
  };
  volume: {
    averagePeriod: number;
    significantThreshold: number;
  };
  scanner: {
    defaultTimeframes: Timeframe[];
    defaultLookback: number;
    maxSymbolsPerScan: number;
    concurrentScans: number;
  };
  cache: {
    enabled: boolean;
    ttl: number;
    maxEntries: number;
    timeframeTtlMultiplier?: Partial<Record<Timeframe, number>>;
  };
  dataProvider?: {
    provider?: string;
    apiKey?: string;
    apiSecret?: string;
    baseUrl?: string;
    timeout?: number;
    retries?: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableConsole: boolean;
    enableFile?: boolean;
    filePath?: string;
  };
  performance: {
    enableMetrics: boolean;
    metricsInterval?: number;
    enableProfiling?: boolean;
  };
}
```

## Environment Variables

Configure via environment variables with `SCANNER_` prefix:

```bash
# RSI Configuration
SCANNER_RSI_PERIOD=14
SCANNER_RSI_OVERBOUGHT=70
SCANNER_RSI_OVERSOLD=30

# MACD Configuration
SCANNER_MACD_FAST=12
SCANNER_MACD_SLOW=26
SCANNER_MACD_SIGNAL=9

# Cache Configuration
SCANNER_CACHE_ENABLED=true
SCANNER_CACHE_TTL=60000

# Data Provider
SCANNER_DATA_PROVIDER=binance
SCANNER_API_KEY=your_api_key
SCANNER_API_SECRET=your_api_secret

# Logging
SCANNER_LOG_LEVEL=info
```

## Configuration Files

Create a JSON file with partial or complete configuration:

```json
{
  "rsi": {
    "period": 14,
    "overbought": 70,
    "oversold": 30
  },
  "cache": {
    "enabled": true,
    "ttl": 60000,
    "maxEntries": 1000
  },
  "logging": {
    "level": "info",
    "enableConsole": true
  }
}
```

Load with:

```typescript
const config = loadConfig({ configFile: './scanner.config.json' });
```

## Configuration Presets

### Default Configuration
Balanced settings for most use cases:

```typescript
import { DEFAULT_CONFIG } from './config';
```

### Minimal Configuration
Lightweight settings for testing:

```typescript
import { MINIMAL_CONFIG } from './config';
```

### Production Configuration
Optimized for production deployment:

```typescript
import { PRODUCTION_CONFIG } from './config';
```

## Runtime Configuration Management

Use `ConfigManager` for dynamic configuration:

```typescript
import { ConfigManager } from './config';

const manager = new ConfigManager();

// Get current config
const config = manager.getConfig();

// Update config at runtime
manager.updateConfig({
  cache: { ttl: 120000 }
});

// Reset to defaults
manager.resetToDefaults();

// Export config as JSON
const json = manager.exportConfig();
```

## Validation

Configurations are automatically validated:

```typescript
import { validateConfig, isProductionSafe } from './config';

const validation = validateConfig(config);
if (!validation.valid) {
  console.error('Errors:', validation.errors);
}
if (validation.warnings.length > 0) {
  console.warn('Warnings:', validation.warnings);
}

// Check if safe for production
if (isProductionSafe(config)) {
  console.log('Config is production-ready');
}
```

## Configuration Precedence

When loading configuration, the following precedence is used (highest to lowest):

1. **Runtime overrides** - Passed to `loadConfig({ overrides: {...} })`
2. **Environment variables** - `SCANNER_*` environment variables
3. **Configuration file** - JSON file specified in `configFile` option
4. **Default configuration** - Built-in defaults

## Files

- **`types.ts`** - TypeScript type definitions
- **`defaults.ts`** - Default configuration presets
- **`validator.ts`** - Configuration validation logic
- **`loader.ts`** - Loading and merging utilities
- **`index.ts`** - Main exports and API

## Best Practices

1. **Use environment variables** for sensitive data (API keys, secrets)
2. **Use configuration files** for deployment-specific settings
3. **Use runtime overrides** for testing or temporary changes
4. **Validate configuration** before using in production
5. **Enable caching** for better performance
6. **Set appropriate log levels** (info/warn for production, debug for development)
7. **Configure TTL multipliers** based on data update frequency

## Example: Production Setup

```typescript
import { loadConfig, isProductionSafe } from './config';

const config = loadConfig({
  configFile: './config/production.json',
  skipEnv: false, // Include environment variables
});

if (!isProductionSafe(config)) {
  throw new Error('Configuration is not production-safe');
}

// Use config...
```
