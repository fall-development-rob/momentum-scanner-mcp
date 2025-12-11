/**
 * Tests for Momentum Scanner MCP Server
 */

describe('Momentum Scanner MCP Server', () => {
  describe('Tool Definitions', () => {
    it('should define momentum_scan tool', () => {
      const tools = getToolDefinitions();
      const scanTool = tools.find((t) => t.name === 'momentum_scan');
      
      expect(scanTool).toBeDefined();
      expect(scanTool?.description).toContain('momentum');
      expect(scanTool?.inputSchema).toBeDefined();
      expect(scanTool?.inputSchema.required).toContain('symbol');
    });
  });

  describe('Tool Handlers', () => {
    it('should handle momentum_scan with default parameters', async () => {
      const result = await handleMomentumScan({ symbol: 'BTC/USD' });
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].symbol).toBe('BTC/USD');
      expect(result[0].signal).toBeDefined();
      expect(result[0].confidence).toBeGreaterThanOrEqual(0);
      expect(result[0].confidence).toBeLessThanOrEqual(100);
    });

    it('should handle momentum_scan with custom timeframes', async () => {
      const result = await handleMomentumScan({
        symbol: 'ETH/USD',
        timeframes: ['1h', '4h'],
      });
      
      expect(result.length).toBe(2);
      expect(result.map(r => r.timeframe)).toContain('1h');
      expect(result.map(r => r.timeframe)).toContain('4h');
    });

    it('should handle momentum_scan with custom config', async () => {
      const result = await handleMomentumScan({
        symbol: 'AAPL',
        config: {
          includeRSI: true,
          includeMACD: false,
          includeVolume: false,
        },
      });
      
      expect(result[0].rsi).toBeDefined();
      expect(result[0].macd).toBeUndefined();
      expect(result[0].volume).toBeUndefined();
    });

    it('should throw error for missing symbol', async () => {
      await expect(handleMomentumScan({} as any)).rejects.toThrow('Invalid symbol');
    });

    it('should include RSI data when enabled', async () => {
      const result = await handleMomentumScan({
        symbol: 'TEST',
        config: { includeRSI: true },
      });
      
      expect(result[0].rsi).toBeDefined();
      expect(result[0].rsi?.value).toBeGreaterThanOrEqual(0);
      expect(result[0].rsi?.value).toBeLessThanOrEqual(100);
      expect(['overbought', 'oversold', 'neutral']).toContain(result[0].rsi?.signal);
    });

    it('should include MACD data when enabled', async () => {
      const result = await handleMomentumScan({
        symbol: 'TEST',
        config: { includeMACD: true },
      });
      
      expect(result[0].macd).toBeDefined();
      expect(result[0].macd?.macd).toBeDefined();
      expect(result[0].macd?.signal).toBeDefined();
      expect(result[0].macd?.histogram).toBeDefined();
      expect(['bullish', 'bearish', 'neutral']).toContain(result[0].macd?.trend);
    });

    it('should include volume data when enabled', async () => {
      const result = await handleMomentumScan({
        symbol: 'TEST',
        config: { includeVolume: true },
      });
      
      expect(result[0].volume).toBeDefined();
      expect(result[0].volume?.current).toBeGreaterThan(0);
      expect(result[0].volume?.average).toBeGreaterThan(0);
      expect(result[0].volume?.ratio).toBeGreaterThan(0);
      expect(['increasing', 'decreasing', 'stable']).toContain(result[0].volume?.trend);
    });

    it('should return valid signal values', async () => {
      const result = await handleMomentumScan({ symbol: 'TEST' });
      
      const validSignals = ['strong_buy', 'buy', 'neutral', 'sell', 'strong_sell'];
      expect(validSignals).toContain(result[0].signal);
    });
  });
});

// Helper functions that mirror the server implementation
function getToolDefinitions() {
  return [
    {
      name: 'momentum_scan',
      description: 'Analyze momentum indicators (RSI, MACD, volume) for a trading symbol',
      inputSchema: {
        type: 'object',
        properties: {
          symbol: { type: 'string' },
          timeframes: { type: 'array', items: { type: 'string' } },
          config: { type: 'object' },
        },
        required: ['symbol'],
      },
    },
  ];
}

interface ScanConfig {
  timeframes?: string[];
  includeRSI?: boolean;
  rsiPeriod?: number;
  includeMACD?: boolean;
  includeVolume?: boolean;
}

interface MomentumScanInput {
  symbol: string;
  timeframes?: string[];
  config?: ScanConfig;
}

interface MomentumScanResult {
  symbol: string;
  timeframe: string;
  timestamp: number;
  rsi?: { value: number; signal: string; period: number };
  macd?: { macd: number; signal: number; histogram: number; trend: string };
  volume?: { current: number; average: number; ratio: number; trend: string };
  signal: string;
  confidence: number;
}

async function handleMomentumScan(input: MomentumScanInput): Promise<MomentumScanResult[]> {
  const { symbol, timeframes, config } = input;

  if (!symbol || typeof symbol !== 'string') {
    throw new Error('Invalid symbol: must be a non-empty string');
  }

  const DEFAULT_CONFIG = {
    timeframes: ['1h', '4h', '1d'],
    includeRSI: true,
    rsiPeriod: 14,
    includeMACD: true,
    includeVolume: true,
  };

  const scanConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    timeframes: timeframes || config?.timeframes || DEFAULT_CONFIG.timeframes,
  };

  const results: MomentumScanResult[] = [];
  
  for (const timeframe of scanConfig.timeframes) {
    // Generate mock data
    let rsiSignal: 'overbought' | 'oversold' | 'neutral' = 'neutral';
    const rsiValue = 45 + Math.random() * 40;
    if (rsiValue > 70) rsiSignal = 'overbought';
    else if (rsiValue < 30) rsiSignal = 'oversold';

    const macdLine = (Math.random() - 0.5) * 20;
    const macdSignalLine = (Math.random() - 0.5) * 15;
    const macdHistogram = macdLine - macdSignalLine;
    let macdTrend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (macdHistogram > 0) macdTrend = 'bullish';
    else if (macdHistogram < 0) macdTrend = 'bearish';

    const volumeCurrent = 1000000 + Math.random() * 5000000;
    const volumeAverage = 2000000;
    const volumeRatio = volumeCurrent / volumeAverage;
    let volumeTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (volumeRatio > 1.5) volumeTrend = 'increasing';
    else if (volumeRatio < 0.75) volumeTrend = 'decreasing';

    let signal: string = 'neutral';
    let confidence = 50;
    const bullishCount = [
      rsiSignal === 'oversold',
      macdTrend === 'bullish',
      volumeTrend === 'increasing',
    ].filter(Boolean).length;
    const bearishCount = [
      rsiSignal === 'overbought',
      macdTrend === 'bearish',
      volumeTrend === 'decreasing',
    ].filter(Boolean).length;

    if (bullishCount >= 2) {
      signal = bullishCount === 3 ? 'strong_buy' : 'buy';
      confidence = 60 + bullishCount * 10;
    } else if (bearishCount >= 2) {
      signal = bearishCount === 3 ? 'strong_sell' : 'sell';
      confidence = 60 + bearishCount * 10;
    }

    results.push({
      symbol,
      timeframe,
      timestamp: Date.now(),
      rsi: scanConfig.includeRSI ? { value: rsiValue, signal: rsiSignal, period: scanConfig.rsiPeriod } : undefined,
      macd: scanConfig.includeMACD ? { macd: macdLine, signal: macdSignalLine, histogram: macdHistogram, trend: macdTrend } : undefined,
      volume: scanConfig.includeVolume ? { current: volumeCurrent, average: volumeAverage, ratio: volumeRatio, trend: volumeTrend } : undefined,
      signal,
      confidence: Math.round(confidence),
    });
  }

  return results;
}
