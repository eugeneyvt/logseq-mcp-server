import 'dotenv/config';
import { fileURLToPath } from 'url';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { createErrorResponse, sanitizeErrorForLogging } from './errors/index.js';
import { createCoreMethods } from './handlers/core-methods.js';
import { loadConfig, validateConfigSecurity } from './schemas/config.js';
import { LogseqClient } from './logseq-client.js';
import { logger } from './utils/logger.js';

import type { Config } from './schemas/config.js';

/**
 * Main MCP server class for Logseq integration
 * Enhanced with core methods + macros design for improved efficiency
 */
class LogseqMcpServer {
  private readonly server: Server;
  private readonly client: LogseqClient;
  private allTools: Array<import('@modelcontextprotocol/sdk/types.js').Tool> = [];
  private allHandlers: Record<string, (args: unknown) => Promise<unknown>> = {};

  constructor(config: Config) {
    this.server = new Server(
      {
        name: 'logseq-mcp-server',
        version: '1.0.2',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.client = new LogseqClient(config);
    this.setupTools();
    this.setupHandlers();
  }

  /**
   * Initialize all available tools using core methods design
   */
  private setupTools(): void {
    logger.debug('Setting up core methods');

    // Create core methods (slim set + macros + context-aware extensions)
    const { tools: coreTools, handlers: coreHandlers } = createCoreMethods(this.client);

    // Use only the core methods
    this.allTools = [...coreTools];
    this.allHandlers = {
      ...coreHandlers,
    };

    logger.info({ toolCount: this.allTools.length }, 'Core methods initialized');
  }

  /**
   * Set up request handlers for the MCP server
   */
  private setupHandlers(): void {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug('Handling list tools request');
      return {
        tools: this.allTools,
      };
    });

    // Call tool handler with comprehensive error handling
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      logger.debug({ toolName: name }, 'Handling tool call request');

      try {
        const handler = this.allHandlers[name];
        if (!handler) {
          logger.warn({ toolName: name }, 'Tool not found');
          throw new Error(`Tool "${name}" not found`);
        }

        // Call the handler with proper error handling
        const result = await handler(args ?? {});

        logger.info({ toolName: name }, 'Tool call completed successfully');
        return result as { content: Array<{ type: string; text: string }> };
      } catch (error) {
        logger.error(
          {
            toolName: name,
            error: sanitizeErrorForLogging(error),
          },
          'Tool call failed'
        );

        const errorResponse = createErrorResponse(error);

        // Provide helpful error messages
        let helpText = '';
        if (errorResponse.message.includes('Connection refused')) {
          helpText =
            '\n\nTroubleshooting:\n' +
            '1. Make sure Logseq is running\n' +
            '2. Enable Developer Mode in Logseq (Settings → Advanced → Developer Mode)\n' +
            '3. Enable HTTP API (Settings → Features → HTTP API)\n' +
            '4. Generate an API token (Settings → HTTP API Authentication Token)\n' +
            '5. Verify the API URL and token are correct';
        } else if (errorResponse.message.includes('Unauthorized')) {
          helpText = '\n\nPlease check your API token in the configuration.';
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${errorResponse.message}${helpText}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Start the MCP server with enhanced workflow automation
   * Note: All logs go to stderr to keep stdout clean for JSON-RPC protocol
   */
  async run(): Promise<void> {
    // Test connection on startup
    logger.info('Starting Logseq MCP Server v1.0.2 with enhanced core methods...');
    logger.debug('Testing connection to Logseq...');

    const isConnected = await this.client.testConnection();
    if (!isConnected) {
      logger.warn('Could not connect to Logseq. The server will start anyway, but tools may fail.');
      logger.warn(
        'Make sure Logseq is running with HTTP API enabled and the correct token is provided.'
      );
    } else {
      logger.info('Successfully connected to Logseq!');

      // On session start, refresh build_graph_map for context awareness
      logger.info('Building initial graph map...');
      try {
        const buildGraphHandler = this.allHandlers['build_graph_map'];
        if (buildGraphHandler) {
          await buildGraphHandler({ refresh: true });
          logger.info('Graph map initialized successfully');
        }
      } catch (error) {
        logger.warn(
          { error: sanitizeErrorForLogging(error) },
          'Failed to build initial graph map, will build on first use'
        );
      }
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('Logseq MCP Server is running and ready to receive requests.');
    logger.info('Enhanced features active:');
    logger.info('- Core methods with slim set + macros design');
    logger.info(
      '- Context-aware extensions (graph mapping, placement suggestions, content planning)'
    );
    logger.info('- Strict formatting validation and normalization');
    logger.info('- Batch/atomic operations with idempotency controls');
    logger.info('- Standardized error handling with actionable hints');
  }
}

/**
 * Error handling for uncaught exceptions
 */
function setupErrorHandlers(): void {
  process.on('uncaughtException', (error) => {
    logger.fatal({ error: sanitizeErrorForLogging(error) }, 'Uncaught exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.fatal(
      {
        reason: sanitizeErrorForLogging(reason),
        promise: String(promise),
      },
      'Unhandled rejection'
    );
    process.exit(1);
  });
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    setupErrorHandlers();

    const config = loadConfig();
    validateConfigSecurity(config);

    const server = new LogseqMcpServer(config);
    await server.run();
  } catch (error) {
    logger.fatal({ error: sanitizeErrorForLogging(error) }, 'Failed to start server');
    process.exit(1);
  }
}

// Only run if this file is executed directly
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  main().catch((error) => {
    logger.fatal({ error: sanitizeErrorForLogging(error) }, 'Server crashed');
    process.exit(1);
  });
}
