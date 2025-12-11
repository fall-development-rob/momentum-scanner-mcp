#!/usr/bin/env node

/**
 * Momentum Scanner MCP Server
 * Entry point for the MCP server with stdio transport
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import {
  momentumScanTool,
  executeMomentumScan,
  MomentumScanInput,
} from './tools/momentum-scan.js';

import {
  scannerTool,
  executeScanner,
  ScannerInput,
} from './tools/scanner.js';

/**
 * Define available tools for the momentum scanner
 */
const TOOLS: Tool[] = [momentumScanTool, scannerTool];

/**
 * Creates and configures the MCP server instance
 */
function createServer(): Server {
  const server = new Server(
    {
      name: 'momentum-scanner-mcp',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool listing handler (responds to initialize handshake)
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === 'momentum_scan') {
        const input = args as unknown as MomentumScanInput;
        const results = await executeMomentumScan(input);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      } else if (name === 'momentum_scanner') {
        const input = args as unknown as ScannerInput;
        const results = await executeScanner(input);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      } else {
        throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: errorMessage }, null, 2),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Main entry point - initializes and runs the MCP server
 */
async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  // Set up graceful shutdown handlers
  const shutdown = async (): Promise<void> => {
    console.error('Shutting down momentum-scanner-mcp server...');
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Connect server to stdio transport
  await server.connect(transport);
  console.error('momentum-scanner-mcp server started on stdio');
  console.error('Available tools: momentum_scan, momentum_scanner');
}

// Run the server
main().catch((error) => {
  console.error('Fatal error starting server:', error);
  process.exit(1);
});
