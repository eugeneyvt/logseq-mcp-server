# Logseq MCP Server

A **production-ready** Model Context Protocol (MCP) server that enables AI assistants to seamlessly interact with your Logseq knowledge base. This server acts as a bridge between AI agents (like Claude) and your Logseq graph, providing comprehensive access to read, create, update, and manage your notes with enterprise-grade reliability, security, and performance.

## Features

### 📝 Page Operations

- **List all pages** in your Logseq graph
- **Get page content** formatted as readable markdown
- **Create new pages** with optional properties and initial content
- **Delete pages** (with safety checks)

### 🧱 Block Management

- **Retrieve specific blocks** by UUID
- **Create new blocks** under pages or other blocks
- **Update block content** and properties
- **Manage block properties** (set/remove custom attributes)
- **Delete blocks** with full subtree removal

### 🔍 Search & Query

- **Full-text search** across all pages and blocks
- **DataScript queries** for advanced graph exploration
- **Backlink discovery** to find references to any page
- **Graph analysis** tools for insights

### 🎯 Context Awareness

- Get currently open page/block in Logseq
- Access graph metadata and user configurations
- Real-time synchronization with your Logseq instance

### 🚀 Production Features

- **Intelligent Caching**: Automatic caching with TTL for optimal performance
- **Advanced Error Handling**: Comprehensive retry logic with exponential backoff
- **Security Hardening**: Input validation, sanitization, and rate limiting
- **Performance Monitoring**: Built-in metrics collection and health checks
- **Structured Logging**: Configurable logging with sensitive data redaction
- **Connection Resilience**: Automatic reconnection and graceful error recovery

## Prerequisites

### 1. Logseq Setup

1. **Install Logseq** (if not already installed)
2. **Enable Developer Mode**: Settings → Advanced → Developer Mode
3. **Enable HTTP API**: Settings → Features → HTTP API
4. **Generate API Token**: Settings → HTTP API Authentication Token
5. **Restart Logseq** for changes to take effect

### 2. Node.js

- Node.js 18+ required
- npm or yarn package manager

## Installation

### Option 1: Install from npm (Recommended)

```bash
npm install -g logseq-mcp-server
```

### Option 2: Install from source

```bash
git clone https://github.com/eugeneyvt/logseq-mcp-server
cd logseq-mcp-server
npm install
npm run build
```

## Configuration

### For Claude Desktop

1. **Find your Claude Desktop config file**:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. **Add the MCP server configuration**:

```json
{
  "mcpServers": {
    "logseq": {
      "command": "npx",
      "args": ["logseq-mcp-server"],
      "env": {
        "LOGSEQ_API_URL": "http://127.0.0.1:12315",
        "LOGSEQ_API_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

3. **Replace `your-api-token-here`** with your actual Logseq API token

4. **Restart Claude Desktop**

### For Other MCP Clients

Set these environment variables:

```bash
export LOGSEQ_API_URL="http://127.0.0.1:12315"
export LOGSEQ_API_TOKEN="your-api-token-here"
```

#### Advanced Configuration (Optional)

```bash
# Performance & Reliability
export LOGSEQ_TIMEOUT="30000"           # Request timeout in ms (default: 10000)
export LOGSEQ_MAX_RETRIES="5"           # Max retry attempts (default: 3)

# Logging
export LOG_LEVEL="info"                 # Log level: trace, debug, info, warn, error, fatal
export NODE_ENV="production"            # Environment: development, production

# Security (for production deployments)
export RATE_LIMIT_MAX="200"             # Max requests per window (default: 100)
export RATE_LIMIT_WINDOW="60000"        # Rate limit window in ms (default: 60000)
```

Then run:

```bash
logseq-mcp-server
```

## Available Tools

### Page Operations

#### `logseq_list_pages`

List all pages in your Logseq graph.

```
Example: "List all my pages"
```

#### `logseq_get_page`

Get information about a specific page.

```
Parameters: name (string) - Page name
Example: "Get information about my 'Project Planning' page"
```

#### `logseq_get_page_content`

Get the full content of a page as formatted markdown.

```
Parameters: name (string) - Page name
Example: "Show me the content of my daily journal"
```

#### `logseq_create_page`

Create a new page.

```
Parameters:
- name (string) - Page name
- content (optional string) - Initial content
- properties (optional object) - Page properties
Example: "Create a new page called 'Meeting Notes' with today's agenda"
```

#### `logseq_delete_page`

Delete a page (use with caution).

```
Parameters: name (string) - Page name
Example: "Delete the page 'Old Draft'"
```

### Block Operations

#### `logseq_get_block`

Get a specific block by UUID.

```
Parameters: blockId (string) - Block UUID
```

#### `logseq_create_block`

Create a new block.

```
Parameters:
- parent (string) - Parent page name or block UUID
- content (string) - Block content
- properties (optional object) - Block properties
- sibling (optional boolean) - Insert as sibling instead of child
Example: "Add a task 'Buy groceries' to my today's journal"
```

#### `logseq_update_block`

Update an existing block's content.

```
Parameters:
- blockId (string) - Block UUID
- content (string) - New content
```

#### `logseq_set_block_property`

Set a property on a block.

```
Parameters:
- blockId (string) - Block UUID
- key (string) - Property key
- value (any) - Property value
Example: Setting priority, due dates, custom tags
```

### Search & Query Operations

#### `logseq_search`

Search across all pages and blocks.

```
Parameters:
- query (string) - Search term
- limit (optional number) - Max results (default: 50)
Example: "Search for all mentions of 'machine learning'"
```

#### `logseq_datascript_query`

Execute advanced DataScript queries.

```
Parameters: query (string) - DataScript query in EDN format
Example: Finding all TODO items, pages by date, etc.
```

#### `logseq_get_backlinks`

Find all references to a specific page.

```
Parameters: pageName (string) - Target page name
Example: "Show me what pages link to 'Project X'"
```

## Usage Examples

### Basic Workflows

**Journaling with AI**:

> "Add a new entry to today's journal about my morning meeting with the dev team"

**Knowledge Management**:

> "Search for all my notes about React hooks and summarize the key points"

**Task Management**:

> "Find all my TODO items that mention 'project deadline' and show their priority"

**Research Organization**:

> "Create a new page called 'AI Research 2024' and add bullet points about the papers I should read"

### Advanced Queries

**DataScript Examples**:

```clojure
;; Find all pages created this week
[:find ?page-name
 :where
 [?page :block/name ?page-name]
 [?page :block/created-at ?created]
 [(> ?created 1640995200000)]]

;; Find all blocks with TODO status
[:find (pull ?block [*])
 :where
 [?block :block/marker "TODO"]]
```

## Performance & Monitoring

### Built-in Caching

The server automatically caches frequently accessed data:

- **Page listings**: Cached for 3 minutes
- **Page content**: Cached for 5 minutes
- **Block data**: Cached for 3 minutes
- **Query results**: Cached based on complexity

### Health Monitoring

Access server health status programmatically:

```javascript
// Health checks run automatically
// Metrics are collected for all operations
// Rate limiting prevents API abuse
```

### Production Optimizations

- **Connection pooling** for HTTP requests
- **Intelligent retry logic** with exponential backoff
- **Request deduplication** for concurrent identical requests
- **Memory-efficient caching** with automatic cleanup
- **Graceful error handling** with detailed logging

## Troubleshooting

### Connection Issues

- **"Connection refused"**: Make sure Logseq is running and HTTP API is enabled
- **"Unauthorized"**: Check your API token
- **"API not found"**: Verify Logseq version supports HTTP API

### Common Solutions

1. **Restart Logseq** after enabling HTTP API
2. **Check the API URL** (default: http://127.0.0.1:12315)
3. **Regenerate API token** if authentication fails
4. **Verify Node.js version** (18+ required)

### Debug Mode

Run with debug logging:

```bash
DEBUG=1 logseq-mcp-server
```

## Development

### Setup

```bash
git clone https://github.com/yourusername/logseq-mcp-server
cd logseq-mcp-server
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### Testing

```bash
npm run build
npm test
```

### Project Structure

```
src/
├── index.ts              # Main server entry point
├── errors/               # Error handling and definitions
│   └── index.ts         # Custom error classes
├── schemas/              # Schema definitions and validation
│   ├── config.ts        # Configuration schema
│   └── logseq.ts        # Logseq API schemas
├── tools/                # MCP tool implementations
│   ├── page-tools.ts    # Page operations
│   ├── block-tools.ts   # Block operations
│   └── query-tools.ts   # Search and query operations
├── utils/                # Core utilities
│   ├── logseq-client.ts # Enhanced Logseq API client
│   ├── cache.ts         # Intelligent caching system
│   ├── monitoring.ts    # Performance metrics & health checks
│   ├── security.ts      # Input validation & security
│   └── logger.ts        # Structured logging
└── types/                # TypeScript type definitions
    └── index.ts         # Shared types
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Security

- **Local only**: This server only works with local Logseq instances
- **Token security**: API tokens are not logged or transmitted
- **Safe operations**: Destructive operations include confirmation prompts

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/logseq-mcp-server/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/logseq-mcp-server/discussions)
- **Documentation**: [Wiki](https://github.com/yourusername/logseq-mcp-server/wiki)

## Acknowledgments

- Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- Powered by [Logseq's HTTP API](https://docs.logseq.com/)
- Inspired by the growing ecosystem of AI-powered knowledge management tools
