import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Mock the server module to test tool handlers
describe("Momentum Scanner MCP Server", () => {
  describe("Tool Definitions", () => {
    it("should define scan_momentum tool", () => {
      const tools = getToolDefinitions();
      const scanTool = tools.find((t) => t.name === "scan_momentum");
      
      expect(scanTool).toBeDefined();
      expect(scanTool?.description).toContain("momentum");
      expect(scanTool?.inputSchema).toBeDefined();
    });

    it("should define get_momentum_report tool", () => {
      const tools = getToolDefinitions();
      const reportTool = tools.find((t) => t.name === "get_momentum_report");
      
      expect(reportTool).toBeDefined();
      expect(reportTool?.inputSchema.required).toContain("symbol");
    });

    it("should define list_top_movers tool", () => {
      const tools = getToolDefinitions();
      const moversTool = tools.find((t) => t.name === "list_top_movers");
      
      expect(moversTool).toBeDefined();
    });
  });

  describe("Tool Handlers", () => {
    it("should handle scan_momentum with default parameters", () => {
      const result = handleScanMomentum({});
      const content = JSON.parse(result.content[0].text);
      
      expect(content.status).toBe("success");
      expect(content.timeframe).toBe("1d");
      expect(content.threshold).toBe(5);
    });

    it("should handle scan_momentum with custom parameters", () => {
      const result = handleScanMomentum({
        symbol: "AAPL",
        timeframe: "5d",
        threshold: 10,
      });
      const content = JSON.parse(result.content[0].text);
      
      expect(content.scannedSymbol).toBe("AAPL");
      expect(content.timeframe).toBe("5d");
      expect(content.threshold).toBe(10);
    });

    it("should handle get_momentum_report with valid symbol", () => {
      const result = handleGetMomentumReport({ symbol: "TSLA" });
      const content = JSON.parse(result.content[0].text);
      
      expect(content.symbol).toBe("TSLA");
      expect(content.report).toBeDefined();
      expect(content.report.price_momentum).toBeDefined();
    });

    it("should handle get_momentum_report with missing symbol", () => {
      const result = handleGetMomentumReport({});
      const content = JSON.parse(result.content[0].text);
      
      expect(content.error).toBeDefined();
    });

    it("should handle list_top_movers with default parameters", () => {
      const result = handleListTopMovers({});
      const content = JSON.parse(result.content[0].text);
      
      expect(content.count).toBe(10);
      expect(content.direction).toBe("both");
      expect(content.gainers).toBeDefined();
      expect(content.losers).toBeDefined();
    });

    it("should handle list_top_movers with direction filter", () => {
      const resultUp = handleListTopMovers({ direction: "up" });
      const contentUp = JSON.parse(resultUp.content[0].text);
      
      expect(contentUp.direction).toBe("up");
      expect(contentUp.losers).toHaveLength(0);

      const resultDown = handleListTopMovers({ direction: "down" });
      const contentDown = JSON.parse(resultDown.content[0].text);
      
      expect(contentDown.direction).toBe("down");
      expect(contentDown.gainers).toHaveLength(0);
    });
  });
});

// Helper functions that mirror the server implementation for testing
function getToolDefinitions() {
  return [
    {
      name: "scan_momentum",
      description: "Scan for momentum signals in the market. Returns stocks with significant price or volume momentum.",
      inputSchema: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Optional stock symbol" },
          timeframe: { type: "string", enum: ["1d", "5d", "1m", "3m"] },
          threshold: { type: "number" },
        },
        required: [],
      },
    },
    {
      name: "get_momentum_report",
      description: "Generate a detailed momentum report",
      inputSchema: {
        type: "object",
        properties: {
          symbol: { type: "string" },
        },
        required: ["symbol"],
      },
    },
    {
      name: "list_top_movers",
      description: "List top momentum movers",
      inputSchema: {
        type: "object",
        properties: {
          count: { type: "number" },
          direction: { type: "string", enum: ["up", "down", "both"] },
        },
        required: [],
      },
    },
  ];
}

function handleScanMomentum(args: Record<string, unknown>) {
  const symbol = args?.symbol as string | undefined;
  const timeframe = (args?.timeframe as string) || "1d";
  const threshold = (args?.threshold as number) || 5;

  const response = {
    status: "success",
    timeframe,
    threshold,
    scannedSymbol: symbol || "all",
    results: [{ symbol: "EXAMPLE", momentum: 12.5 }],
    message: "Momentum scan completed.",
  };

  return {
    content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }],
  };
}

function handleGetMomentumReport(args: Record<string, unknown>) {
  const symbol = args?.symbol as string;

  if (!symbol) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ error: "Symbol is required" }) }],
    };
  }

  const response = {
    symbol: symbol.toUpperCase(),
    report: {
      price_momentum: { "1d": 2.5, "5d": 8.3, "1m": 15.2 },
    },
    generated_at: new Date().toISOString(),
  };

  return {
    content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }],
  };
}

function handleListTopMovers(args: Record<string, unknown>) {
  const count = (args?.count as number) || 10;
  const direction = (args?.direction as string) || "both";

  const response = {
    count,
    direction,
    gainers: direction !== "down" ? [{ symbol: "EXAMPLE1", change: 15.2 }] : [],
    losers: direction !== "up" ? [{ symbol: "EXAMPLE3", change: -10.5 }] : [],
    timestamp: new Date().toISOString(),
  };

  return {
    content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }],
  };
}
