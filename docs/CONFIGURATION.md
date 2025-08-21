# Configuration Guide

This guide provides detailed configuration options for the Logseq MCP Server.

## Environment Variables

### Required Configuration

| Variable           | Description              | Default                  | Example                  |
| ------------------ | ------------------------ | ------------------------ | ------------------------ |
| `LOGSEQ_API_URL`   | Logseq HTTP API endpoint | `http://localhost:12315` | `http://127.0.0.1:12315` |
| `LOGSEQ_API_TOKEN` | API authentication token | _none_                   | `your-token-here`        |

### Performance Configuration

| Variable             | Description            | Default | Example |
| -------------------- | ---------------------- | ------- | ------- |
| `LOGSEQ_TIMEOUT`     | Request timeout (ms)   | `10000` | `30000` |
| `LOGSEQ_MAX_RETRIES` | Maximum retry attempts | `3`     | `5`     |

### Logging Configuration

| Variable    | Description      | Default       | Example                  |
| ----------- | ---------------- | ------------- | ------------------------ |
| `LOG_LEVEL` | Logging level    | `info`        | `debug`, `warn`, `error` |
| `NODE_ENV`  | Environment mode | `development` | `production`             |

### Security Configuration

| Variable            | Description                              | Default | Example  |
| ------------------- | ---------------------------------------- | ------- | -------- |
| `RATE_LIMIT_MAX`    | Max requests per window                  | `100`   | `200`    |
| `RATE_LIMIT_WINDOW` | Rate limit window (ms)                   | `60000` | `120000` |
| `CONFIRM_DESTROY`   | Require confirmation for destructive ops | `false` | `true`   |

## New Capabilities

### Template System Configuration

The enhanced template system automatically discovers templates in your Logseq graph:

- **Template Discovery**: Automatically finds pages with template properties or naming patterns
- **Variable Substitution**: Supports `{{variableName}}` placeholders with automatic validation
- **Application Modes**: Replace, append, or prepend content with flexible template usage

### Relationship Management

Advanced relationship features for comprehensive knowledge graph management:

- **Bi-Directional Links**: Automatic creation and maintenance of page relationships
- **Graph Analysis**: Built-in centrality scoring and clustering detection
- **Reference Tracking**: Comprehensive tracking of page references and backlinks

### Enhanced Search Capabilities

Multi-modal search with intelligent pattern recognition:

- **Query Types**: Templates, properties, relations, dates, and combined filters
- **Pattern Recognition**: Smart handling of `"empty"`, `"*"`, and date formats
- **Combined Logic**: AND/OR/NOT operators with proper precedence

## Configuration Examples

### Development Setup

```bash
# .env file for development
LOGSEQ_API_URL=http://localhost:12315
LOGSEQ_API_TOKEN=dev-token-12345
LOG_LEVEL=debug
NODE_ENV=development
LOGSEQ_TIMEOUT=15000
```

### Production Setup

```bash
# .env file for production
LOGSEQ_API_URL=http://127.0.0.1:12315
LOGSEQ_API_TOKEN=prod-secure-token-xyz789
LOG_LEVEL=info
NODE_ENV=production
LOGSEQ_TIMEOUT=30000
LOGSEQ_MAX_RETRIES=5
RATE_LIMIT_MAX=200
RATE_LIMIT_WINDOW=60000
```

### Claude Desktop Configuration

#### Basic Configuration

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

#### Production Configuration

```json
{
  "mcpServers": {
    "logseq": {
      "command": "npx",
      "args": ["logseq-mcp-server"],
      "env": {
        "LOGSEQ_API_URL": "http://127.0.0.1:12315",
        "LOGSEQ_API_TOKEN": "your-secure-api-token",
        "LOG_LEVEL": "info",
        "NODE_ENV": "production",
        "LOGSEQ_TIMEOUT": "30000",
        "LOGSEQ_MAX_RETRIES": "5",
        "RATE_LIMIT_MAX": "200"
      }
    }
  }
}
```

#### Debug Configuration

```json
{
  "mcpServers": {
    "logseq": {
      "command": "npx",
      "args": ["logseq-mcp-server"],
      "env": {
        "LOGSEQ_API_URL": "http://127.0.0.1:12315",
        "LOGSEQ_API_TOKEN": "your-api-token-here",
        "LOG_LEVEL": "debug",
        "NODE_ENV": "development",
        "LOGSEQ_TIMEOUT": "60000"
      }
    }
  }
}
```

## Performance Tuning

### For Large Graphs (10,000+ pages)

```bash
# Increase timeouts and enable more aggressive caching
LOGSEQ_TIMEOUT=60000
LOGSEQ_MAX_RETRIES=5
LOG_LEVEL=warn  # Reduce log noise
```

### For High-Frequency Usage

```bash
# Increase rate limits and optimize for performance
RATE_LIMIT_MAX=500
RATE_LIMIT_WINDOW=60000
LOGSEQ_TIMEOUT=15000
```

### For Unreliable Networks

```bash
# Increase retries and timeouts
LOGSEQ_MAX_RETRIES=10
LOGSEQ_TIMEOUT=45000
LOG_LEVEL=info  # Monitor connection issues
```

## Monitoring Configuration

### Health Check Endpoints

The server provides internal health monitoring:

- **Metrics Collection**: Automatic performance metrics
- **Error Tracking**: Comprehensive error logging with sanitization
- **Rate Limiting**: Automatic protection against abuse
- **Cache Statistics**: Monitor cache hit rates and performance

### Log Output Examples

#### Info Level (Production)

```
[INFO] Logseq MCP Server starting on port 3000
[INFO] Connected to Logseq API at http://127.0.0.1:12315
[INFO] Page cache hit rate: 85%
```

#### Debug Level (Development)

```
[DEBUG] API request: GET /pages (took 45ms)
[DEBUG] Cache miss for key: page-contents-daily-journal
[DEBUG] Retrying request (attempt 2/3) after 1000ms delay
```

## Core Methods Configuration

### Control Parameters

All core methods support advanced control parameters. Configure default behaviors:

```bash
# Enable strict formatting validation by default
LOGSEQ_STRICT_MODE=true

# Auto-fix formatting issues
LOGSEQ_AUTOFIX_FORMAT=true

# Default operation limits
LOGSEQ_MAX_OPS=100

# Default dry-run behavior
LOGSEQ_DEFAULT_DRY_RUN=false
```

### Context-Aware Features

Configure graph mapping and placement features:

```bash
# Graph map cache duration (seconds)
GRAPH_MAP_CACHE_TTL=300

# Placement confidence threshold
PLACEMENT_CONFIDENCE_THRESHOLD=0.7

# Enable automatic graph mapping on startup
AUTO_BUILD_GRAPH_MAP=true
```

### Formatting Validation

Control content validation behavior:

```bash
# Enforce strict TODO markers
STRICT_TODO_MARKERS=true

# Validate page link format
VALIDATE_PAGE_LINKS=true

# Auto-normalize block content
AUTO_NORMALIZE_CONTENT=true

# Block property validation
VALIDATE_BLOCK_PROPERTIES=true
```

## Security Configuration

### Input Validation

The server automatically validates and sanitizes:

- Page names and content with strict formatting rules
- Block content with TODO marker validation
- Search queries and DataScript with injection protection
- API tokens and URLs with format validation

### Rate Limiting

Configure rate limiting to prevent abuse:

```bash
# Allow 200 requests per minute per client
RATE_LIMIT_MAX=200
RATE_LIMIT_WINDOW=60000
```

### Data Privacy

- **No data transmission**: All operations are local-only
- **Token security**: API tokens are automatically redacted from logs
- **Error sanitization**: Error messages strip sensitive information

## Troubleshooting Configuration Issues

### Common Problems

1. **Token Authentication**

   ```bash
   # Verify your token
   curl -H "Authorization: Bearer your-token" http://localhost:12315/api
   ```

2. **Port Conflicts**

   ```bash
   # Check if port 12315 is in use
   lsof -i :12315
   ```

3. **API Availability**
   ```bash
   # Test API endpoint
   curl http://localhost:12315/api/health
   ```

### Configuration Validation

The server validates all configuration on startup and will report specific issues:

```
[ERROR] Invalid configuration:
- LOGSEQ_API_TOKEN is required
- LOGSEQ_TIMEOUT must be a positive number
- LOG_LEVEL must be one of: trace, debug, info, warn, error, fatal
```

## Advanced Configuration

### Custom Configuration Files

Create a `logseq-mcp.config.js` file:

```javascript
module.exports = {
  api: {
    url: process.env.LOGSEQ_API_URL || 'http://localhost:12315',
    token: process.env.LOGSEQ_API_TOKEN,
    timeout: parseInt(process.env.LOGSEQ_TIMEOUT) || 10000,
    maxRetries: parseInt(process.env.LOGSEQ_MAX_RETRIES) || 3,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    isDevelopment: process.env.NODE_ENV !== 'production',
  },
  security: {
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000,
  },
};
```

### Docker Configuration

```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000

ENV LOGSEQ_API_URL=http://host.docker.internal:12315
ENV NODE_ENV=production
ENV LOG_LEVEL=info

CMD ["node", "dist/index.js"]
```

## Best Practices

1. **Use environment-specific configurations**
2. **Enable debug logging only when troubleshooting**
3. **Set appropriate timeouts for your network conditions**
4. **Monitor logs for performance and error patterns**
5. **Regularly rotate API tokens for security**
6. **Use rate limiting in shared environments**
