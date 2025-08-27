import 'dotenv/config';
import { fileURLToPath } from 'url';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import {
  createErrorResponse,
  sanitizeErrorForLogging,
  createStructuredError,
  ErrorCode,
} from './utils/system/errors.js';
import { formatError } from './utils/error-formatting.js';
import { createSearchTool } from './tools/search/index.js';
import { createGetTool } from './tools/get/index.js';
import { createEditTool } from './tools/edit/index.js';
import { createDeleteTool } from './tools/delete/index.js';
import { loadConfig, validateConfigSecurity } from './schemas/config.js';
import { LogseqClient } from './logseq-client.js';
import { logger } from './utils/system/logger.js';

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
        name: 'logseq-mcp',
        version: '1.0.0-beta.1',
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
   * Initialize all available tools using unified 4-tool architecture
   */
  private setupTools(): void {
    logger.debug('Setting up unified 4-tool architecture');

    // Create the 4 unified tools
    const searchTool = createSearchTool(this.client);
    const getTool = createGetTool(this.client);
    const editTool = createEditTool(this.client);
    const deleteTool = createDeleteTool(this.client);

    // Set up tools and handlers
    this.allTools = [searchTool.tool, getTool.tool, editTool.tool, deleteTool.tool];

    this.allHandlers = {
      search: searchTool.handler,
      get: getTool.handler,
      edit: editTool.handler,
      delete: deleteTool.handler,
    };

    logger.debug({ toolCount: this.allTools.length }, 'Tools initialized');
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

        // Convert unknown error to StructuredError
        const structuredError = createStructuredError(ErrorCode.INTERNAL, {
          error: formatError(error),
        });

        const errorResponse = createErrorResponse(structuredError);

        // Provide helpful error messages
        let helpText = '';
        if (errorResponse.error.message.includes('Connection refused')) {
          helpText =
            '\n\nTroubleshooting:\n' +
            '1. Make sure Logseq is running\n' +
            '2. Enable Developer Mode in Logseq (Settings → Advanced → Developer Mode)\n' +
            '3. Enable HTTP API (Settings → Features → HTTP API)\n' +
            '4. Generate an API token (Settings → HTTP API Authentication Token)\n' +
            '5. Verify the API URL and token are correct';
        } else if (errorResponse.error.message.includes('Unauthorized')) {
          helpText = '\n\nPlease check your API token in the configuration.';
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${errorResponse.error.message}${helpText}`,
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
    logger.info('Starting Logseq MCP Server v1.0.0-beta.1...');

    // Check if API token is provided
    if (!this.client.apiToken) {
      logger.warn(
        'No LOGSEQ_API_TOKEN provided. Server will start but tools will require authentication.'
      );
      logger.warn('Set LOGSEQ_API_TOKEN environment variable to connect to Logseq.');
    } else {
      logger.debug('Testing connection to Logseq...');
      const isConnected = await this.client.testConnection();
      if (!isConnected) {
        logger.warn(
          'Could not connect to Logseq. The server will start anyway, but tools may fail.'
        );
        logger.warn(
          'Make sure Logseq is running with HTTP API enabled and the correct token is provided.'
        );
      } else {
        logger.info('Successfully connected to Logseq API');
      }
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('Logseq MCP Server is running and ready');
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
