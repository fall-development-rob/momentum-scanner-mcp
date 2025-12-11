#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * Momentum Scanner MCP Server
 * 
 * This server implements the Model Context Protocol (MCP) to provide
 * momentum scanning functionality to Claude clients via stdio transport.
 */

// Define available tools for the momentum scanner
const TOOLS: Tool[] = [
  {
    name: "scan_momentum",
    description: "Scan for momentum signals in the market. Returns stocks with significant price or volume momentum.",
    inputSchema: {
      type: "object" as const,
      properties: {
        symbol: {
          type: "string",
          description: "Optional stock symbol to scan. If not provided, scans the entire market.",
        },
        timeframe: {
          type: "string",
          enum: ["1d", "5d", "1m", "3m"],
          description: "Timeframe for momentum analysis",
        },
        threshold: {
          type: "number",
          description: "Minimum momentum threshold (percentage)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_momentum_report",
    description: "Generate a detailed momentum report for a specific symbol",
    inputSchema: {
      type: "object" as const,
      properties: {
        symbol: {
          type: "string",
          description: "Stock symbol to analyze",
        },
      },
      required: ["symbol"],
    },
  },
  {
    name: "list_top_movers",
    description: "List top momentum movers (gainers and losers)",
    inputSchema: {
      type: "object" as const,
      properties: {
        count: {
          type: "number",
          description: "Number of top movers to return (default: 10)",
        },
        direction: {
          type: "string",
          enum: ["up", "down", "both"],
          description: "Filter by momentum direction",
        },
      },
      required: [],
    },
  },
];

/**
 * Creates and configures the MCP server instance
 */
function createServer(): Server {
  const server = new Server(
    {
      name: "momentum-scanner-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool listing handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "scan_momentum":
        return handleScanMomentum(args);
      case "get_momentum_report":
        return handleGetMomentumReport(args);
      case "list_top_movers":
        return handleListTopMovers(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return server;
}

/**
 * Handle scan_momentum tool call
 */
function handleScanMomentum(args: Record<string, unknown> | undefined): {
  content: Array<{ type: "text"; text: string }>;
} {
  const symbol = args?.symbol as string | undefined;
  const timeframe = (args?.timeframe as string) || "1d";
  const threshold = (args?.threshold as number) || 5;

  // Placeholder response - actual implementation will connect to data sources
  const response = {
    status: "success",
    timeframe,
    threshold,
    scannedSymbol: symbol || "all",
    results: [
      {
        symbol: "EXAMPLE",
        momentum: 12.5,
        volume_change: 250,
        signal: "bullish",
      },
    ],
    message: "Momentum scan completed. Connect to live data source for real results.",
  };

  return {
    content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
  };
}

/**
 * Handle get_momentum_report tool call
 */
function handleGetMomentumReport(args: Record<string, unknown> | undefined): {
  content: Array<{ type: "text"; text: string }>;
} {
  const symbol = args?.symbol as string;

  if (!symbol) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: "Symbol is required" }) }],
    };
  }

  // Placeholder response
  const response = {
    symbol: symbol.toUpperCase(),
    report: {
      price_momentum: {
        "1d": 2.5,
        "5d": 8.3,
        "1m": 15.2,
      },
      volume_momentum: {
        relative_volume: 1.8,
        avg_volume: 1000000,
        current_volume: 1800000,
      },
      signals: {
        trend: "bullish",
        strength: "moderate",
        recommendation: "watch",
      },
    },
    generated_at: new Date().toISOString(),
    message: "Report generated. Connect to live data source for real results.",
  };

  return {
    content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
  };
}

/**
 * Handle list_top_movers tool call
 */
function handleListTopMovers(args: Record<string, unknown> | undefined): {
  content: Array<{ type: "text"; text: string }>;
} {
  const count = (args?.count as number) || 10;
  const direction = (args?.direction as string) || "both";

  // Placeholder response
  const response = {
    count,
    direction,
    gainers: direction !== "down" ? [
      { symbol: "EXAMPLE1", change: 15.2, volume: 5000000 },
      { symbol: "EXAMPLE2", change: 12.8, volume: 3000000 },
    ] : [],
    losers: direction !== "up" ? [
      { symbol: "EXAMPLE3", change: -10.5, volume: 4000000 },
      { symbol: "EXAMPLE4", change: -8.2, volume: 2500000 },
    ] : [],
    timestamp: new Date().toISOString(),
    message: "Top movers retrieved. Connect to live data source for real results.",
  };

  return {
    content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
  };
}

/**
 * Main entry point - initializes and runs the MCP server
 */
async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  // Set up graceful shutdown handlers
  const shutdown = async (): Promise<void> => {
    console.error("Shutting down momentum-scanner-mcp server...");
    await server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Connect server to stdio transport
  await server.connect(transport);
  console.error("momentum-scanner-mcp server started on stdio");
}

// Run the server
main().catch((error) => {
  console.error("Fatal error starting server:", error);
  process.exit(1);
});
