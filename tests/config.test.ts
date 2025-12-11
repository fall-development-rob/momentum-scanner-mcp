/**
 * Tests for configuration management system
 */

import {
  ScannerConfig,
  PartialScannerConfig,
  DEFAULT_CONFIG,
  MINIMAL_CONFIG,
  PRODUCTION_CONFIG,
  validateConfig,
  validatePartialConfig,
  isProductionSafe,
  mergeConfig,
  loadConfig,
  ConfigManager,
} from '../src/config/index';

describe('Configuration System', () => {
  describe('Default Configurations', () => {
    it('should have valid DEFAULT_CONFIG', () => {
      const validation = validateConfig(DEFAULT_CONFIG);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should have valid MINIMAL_CONFIG', () => {
      const validation = validateConfig(MINIMAL_CONFIG);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should have valid PRODUCTION_CONFIG', () => {
      const validation = validateConfig(PRODUCTION_CONFIG);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('PRODUCTION_CONFIG should be production-safe', () => {
      expect(isProductionSafe(PRODUCTION_CONFIG)).toBe(true);
    });

    it('DEFAULT_CONFIG should have expected RSI settings', () => {
      expect(DEFAULT_CONFIG.rsi.period).toBe(14);
      expect(DEFAULT_CONFIG.rsi.overbought).toBe(70);
      expect(DEFAULT_CONFIG.rsi.oversold).toBe(30);
    });

    it('DEFAULT_CONFIG should have expected MACD settings', () => {
      expect(DEFAULT_CONFIG.macd.fastPeriod).toBe(12);
      expect(DEFAULT_CONFIG.macd.slowPeriod).toBe(26);
      expect(DEFAULT_CONFIG.macd.signalPeriod).toBe(9);
    });

    it('DEFAULT_CONFIG should have cache enabled', () => {
      expect(DEFAULT_CONFIG.cache.enabled).toBe(true);
      expect(DEFAULT_CONFIG.cache.ttl).toBeGreaterThan(0);
    });
  });

  describe('Configuration Validation', () => {
    describe('RSI Validation', () => {
      it('should reject RSI period less than 2', () => {
        const config: ScannerConfig = {
          ...DEFAULT_CONFIG,
          rsi: { period: 1, overbought: 70, oversold: 30 },
        };
        const validation = validateConfig(config);
        expect(validation.valid).toBe(false);
        expect(validation.errors.some((e) => e.includes('period'))).toBe(true);
      });

      it('should reject invalid overbought/oversold levels', () => {
        const config: ScannerConfig = {
          ...DEFAULT_CONFIG,
          rsi: { period: 14, overbought: 30, oversold: 70 },
        };
        const validation = validateConfig(config);
        expect(validation.valid).toBe(false);
      });

      it('should reject out-of-range levels', () => {
        const config: ScannerConfig = {
          ...DEFAULT_CONFIG,
          rsi: { period: 14, overbought: 150, oversold: 30 },
        };
        const validation = validateConfig(config);
        expect(validation.valid).toBe(false);
      });
    });

    describe('MACD Validation', () => {
      it('should reject fast period >= slow period', () => {
        const config: ScannerConfig = {
          ...DEFAULT_CONFIG,
          macd: { fastPeriod: 26, slowPeriod: 12, signalPeriod: 9 },
        };
        const validation = validateConfig(config);
        expect(validation.valid).toBe(false);
        expect(
          validation.errors.some((e) => e.includes('fast period'))
        ).toBe(true);
      });

      it('should reject period less than 2', () => {
        const config: ScannerConfig = {
          ...DEFAULT_CONFIG,
          macd: { fastPeriod: 1, slowPeriod: 26, signalPeriod: 9 },
        };
        const validation = validateConfig(config);
        expect(validation.valid).toBe(false);
      });
    });

    describe('Scanner Validation', () => {
      it('should reject empty timeframes array', () => {
        const config: ScannerConfig = {
          ...DEFAULT_CONFIG,
          scanner: {
            ...DEFAULT_CONFIG.scanner,
            defaultTimeframes: [],
          },
        };
        const validation = validateConfig(config);
        expect(validation.valid).toBe(false);
        expect(
          validation.errors.some((e) => e.includes('timeframe'))
        ).toBe(true);
      });

      it('should reject lookback less than 10', () => {
        const config: ScannerConfig = {
          ...DEFAULT_CONFIG,
          scanner: {
            ...DEFAULT_CONFIG.scanner,
            defaultLookback: 5,
          },
        };
        const validation = validateConfig(config);
        expect(validation.valid).toBe(false);
      });

      it('should reject concurrent scans less than 1', () => {
        const config: ScannerConfig = {
          ...DEFAULT_CONFIG,
          scanner: {
            ...DEFAULT_CONFIG.scanner,
            concurrentScans: 0,
          },
        };
        const validation = validateConfig(config);
        expect(validation.valid).toBe(false);
      });
    });

    describe('Cache Validation', () => {
      it('should reject negative TTL', () => {
        const config: ScannerConfig = {
          ...DEFAULT_CONFIG,
          cache: {
            ...DEFAULT_CONFIG.cache,
            ttl: -1000,
          },
        };
        const validation = validateConfig(config);
        expect(validation.valid).toBe(false);
      });

      it('should warn on very low TTL', () => {
        const config: ScannerConfig = {
          ...DEFAULT_CONFIG,
          cache: {
            ...DEFAULT_CONFIG.cache,
            ttl: 500,
          },
        };
        const validation = validateConfig(config);
        expect(validation.warnings.length).toBeGreaterThan(0);
      });
    });

    describe('Partial Validation', () => {
      it('should validate partial RSI config', () => {
        const partial: PartialScannerConfig = {
          rsi: { period: 21, overbought: 80, oversold: 20 },
        };
        const validation = validatePartialConfig(partial);
        expect(validation.valid).toBe(true);
      });

      it('should reject invalid partial config', () => {
        const partial: PartialScannerConfig = {
          rsi: { period: 1, overbought: 70, oversold: 30 },
        };
        const validation = validatePartialConfig(partial);
        expect(validation.valid).toBe(false);
      });
    });
  });

  describe('Configuration Merging', () => {
    it('should merge simple overrides', () => {
      const base = DEFAULT_CONFIG;
      const override: PartialScannerConfig = {
        rsi: { period: 21, overbought: 80, oversold: 20 },
      };
      const merged = mergeConfig(base, override);

      expect(merged.rsi.period).toBe(21);
      expect(merged.rsi.overbought).toBe(80);
      expect(merged.rsi.oversold).toBe(20);
      expect(merged.macd).toEqual(base.macd); // Unchanged
    });

    it('should deep merge nested objects', () => {
      const base = DEFAULT_CONFIG;
      const override: PartialScannerConfig = {
        cache: { ttl: 120000 },
      };
      const merged = mergeConfig(base, override);

      expect(merged.cache.ttl).toBe(120000);
      expect(merged.cache.enabled).toBe(base.cache.enabled); // Preserved
      expect(merged.cache.maxEntries).toBe(base.cache.maxEntries); // Preserved
    });

    it('should merge multiple overrides in order', () => {
      const base = DEFAULT_CONFIG;
      const override1: PartialScannerConfig = {
        rsi: { period: 21 },
      };
      const override2: PartialScannerConfig = {
        rsi: { period: 28 },
      };
      const merged = mergeConfig(base, override1, override2);

      expect(merged.rsi.period).toBe(28); // Last override wins
    });

    it('should handle array overrides', () => {
      const base = DEFAULT_CONFIG;
      const override: PartialScannerConfig = {
        scanner: {
          defaultTimeframes: ['5m', '1h'],
        },
      };
      const merged = mergeConfig(base, override);

      expect(merged.scanner.defaultTimeframes).toEqual(['5m', '1h']);
    });
  });

  describe('Configuration Loading', () => {
    it('should load default config without options', () => {
      const config = loadConfig({ skipEnv: true });
      expect(config).toBeDefined();
      expect(validateConfig(config).valid).toBe(true);
    });

    it('should merge overrides with defaults', () => {
      const config = loadConfig({
        skipEnv: true,
        overrides: {
          rsi: { period: 21 },
        },
      });

      expect(config.rsi.period).toBe(21);
      expect(config.macd).toEqual(DEFAULT_CONFIG.macd);
    });

    it('should throw on invalid configuration', () => {
      expect(() => {
        loadConfig({
          skipEnv: true,
          overrides: {
            rsi: { period: 1, overbought: 70, oversold: 30 },
          },
        });
      }).toThrow();
    });

    it('should skip validation when requested', () => {
      expect(() => {
        loadConfig({
          skipEnv: true,
          skipValidation: true,
          overrides: {
            rsi: { period: 1, overbought: 70, oversold: 30 },
          },
        });
      }).not.toThrow();
    });
  });

  describe('ConfigManager', () => {
    it('should initialize with default config', () => {
      const manager = new ConfigManager({ skipEnv: true });
      const config = manager.getConfig();

      expect(config).toBeDefined();
      expect(validateConfig(config).valid).toBe(true);
    });

    it('should update configuration', () => {
      const manager = new ConfigManager({ skipEnv: true });
      manager.updateConfig({
        rsi: { period: 21 },
      });

      const config = manager.getConfig();
      expect(config.rsi.period).toBe(21);
    });

    it('should reject invalid updates', () => {
      const manager = new ConfigManager({ skipEnv: true });
      expect(() => {
        manager.updateConfig({
          rsi: { period: 1, overbought: 70, oversold: 30 },
        });
      }).toThrow();
    });

    it('should reset to defaults', () => {
      const manager = new ConfigManager({ skipEnv: true });
      manager.updateConfig({ rsi: { period: 21 } });
      manager.resetToDefaults();

      const config = manager.getConfig();
      expect(config.rsi.period).toBe(DEFAULT_CONFIG.rsi.period);
    });

    it('should export configuration as JSON', () => {
      const manager = new ConfigManager({ skipEnv: true });
      const json = manager.exportConfig();

      expect(json).toBeDefined();
      expect(typeof json).toBe('string');
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should track metadata', () => {
      const manager = new ConfigManager({ skipEnv: true });
      const metadata = manager.getMetadata();

      expect(metadata.source).toBeDefined();
      expect(metadata.loadedAt).toBeGreaterThan(0);
      expect(metadata.version).toBeDefined();
    });
  });

  describe('Production Safety', () => {
    it('should reject config with cache disabled', () => {
      const config: ScannerConfig = {
        ...PRODUCTION_CONFIG,
        cache: { ...PRODUCTION_CONFIG.cache, enabled: false },
      };
      expect(isProductionSafe(config)).toBe(false);
    });

    it('should reject config with debug logging', () => {
      const config: ScannerConfig = {
        ...PRODUCTION_CONFIG,
        logging: { ...PRODUCTION_CONFIG.logging, level: 'debug' },
      };
      expect(isProductionSafe(config)).toBe(false);
    });

    it('should reject config with mock data provider', () => {
      const config: ScannerConfig = {
        ...PRODUCTION_CONFIG,
        dataProvider: { provider: 'mock' },
      };
      expect(isProductionSafe(config)).toBe(false);
    });

    it('should accept valid production config', () => {
      expect(isProductionSafe(PRODUCTION_CONFIG)).toBe(true);
    });
  });
});
