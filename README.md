# Logseq MCP - AI-Powered Knowledge Base Integration

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Protocol-orange.svg)](https://modelcontextprotocol.io/)
[![Version](https://img.shields.io/npm/v/logseq-mcp-server?color=blue&label=version)](https://www.npmjs.com/package/logseq-mcp-server)

Model Context Protocol (MCP) server that enables AI assistants to seamlessly interact with your Logseq knowledge base. Transform your personal notes into an AI-powered workspace with advanced search, content creation, and knowledge management capabilities.

## ✨ Features

- 🚀 **Instant AI Integration** - Connect any MCP-compatible AI to your Logseq graph
- 🔒 **Privacy First** - All operations are local-only, no data leaves your machine  
- 🎯 **4 Intuitive Tools** - Unified Search/Get/Edit/Delete architecture for maximum clarity
- 🔍 **Advanced Search** - Multi-modal discovery with templates, properties, relations, and date filters
- 🎨 **Template System** - Single-block template enforcement with proper variable substitution
- ⚡ **Enterprise Features** - Built with caching, monitoring, security, and idempotency controls
- 🌟 **Universal Compatibility** - Works with Claude, ChatGPT, and other AI assistants

## 🛠️ Installation

### Requirements

- Node.js >= v18.0.0
- Logseq with HTTP API enabled
- MCP-compatible AI client (Claude Desktop, VS Code, Cursor, etc.)

### One-Command Install

```bash
npm install -g logseq-mcp-server-server
```

## 🚀 Quick Setup (3 Steps)

### Step 1: Configure Logseq

1. **Enable HTTP API**: Settings → Features → HTTP APIs server
2. **Generate API Token**: API → Authorization tokens → Add new token
3. **Start server**

### Step 2: Choose Your AI Client

<details>
<summary><b>📱 Claude Desktop</b></summary>

#### Method 1: Configuration File (Recommended)

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

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

**After saving**: Completely restart Claude Desktop

#### Method 2: Terminal Command

**macOS/Linux**:
```bash
echo '{"mcpServers":{"logseq":{"command":"npx","args":["logseq-mcp-server"],"env":{"LOGSEQ_API_URL":"http://127.0.0.1:12315","LOGSEQ_API_TOKEN":"your-api-token-here"}}}}' > ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Windows (PowerShell)**:
```powershell
'{"mcpServers":{"logseq":{"command":"npx","args":["logseq-mcp-server"],"env":{"LOGSEQ_API_URL":"http://127.0.0.1:12315","LOGSEQ_API_TOKEN":"your-api-token-here"}}}}' | Out-File -FilePath "$env:APPDATA\Claude\claude_desktop_config.json" -Encoding utf8
```

</details>

<details>
<summary><b>🤖 Claude Code</b></summary>

#### Method 1: Environment Setup
```bash
# Set environment variables and run directly
export LOGSEQ_API_URL="http://127.0.0.1:12315"
export LOGSEQ_API_TOKEN="your-api-token-here"
npx logseq-mcp-server
```

#### Method 2: Configuration File
Create or edit your Claude Code MCP configuration:

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

</details>

<details>
<summary><b>🔷 VS Code</b></summary>

#### Method 1: Settings UI
1. Open VS Code Settings (Ctrl/Cmd + ,)
2. Search for "MCP"
3. Add new server with these settings:
   - Name: `logseq`
   - Command: `npx`
   - Args: `["logseq-mcp-server-server"]`
   - Environment: `LOGSEQ_API_URL=http://127.0.0.1:12315`, `LOGSEQ_API_TOKEN=your-api-token-here`

#### Method 2: Settings JSON

**macOS**: `~/Library/Application Support/Code/User/settings.json`  
**Windows**: `%APPDATA%\Code\User\settings.json`

```json
{
  "mcp": {
    "servers": {
      "logseq": {
        "type": "stdio",
        "command": "npx",
    "args": ["logseq-mcp-server"],
        "env": {
          "LOGSEQ_API_URL": "http://127.0.0.1:12315",
          "LOGSEQ_API_TOKEN": "your-api-token-here"
        }
      }
    }
  }
}
```

#### Method 3: Terminal Command

**macOS**:
```bash
# Add to VS Code settings.json
cat >> ~/Library/Application\ Support/Code/User/settings.json << 'EOF'
{
  "mcp": {
    "servers": {
      "logseq": {
        "type": "stdio",
        "command": "npx",
        "args": ["logseq-mcp-server"],
        "env": {
          "LOGSEQ_API_URL": "http://127.0.0.1:12315",
          "LOGSEQ_API_TOKEN": "your-api-token-here"
        }
      }
    }
  }
}
EOF
```

**Windows (PowerShell)**:
```powershell
# Add to VS Code settings.json
Add-Content -Path "$env:APPDATA\Code\User\settings.json" -Value @'
{
  "mcp": {
    "servers": {
      "logseq": {
        "type": "stdio",
        "command": "npx",
        "args": ["logseq-mcp-server"],
        "env": {
          "LOGSEQ_API_URL": "http://127.0.0.1:12315",
          "LOGSEQ_API_TOKEN": "your-api-token-here"
        }
      }
    }
  }
}
'@
```

</details>

<details>
<summary><b>🖱️ Cursor</b></summary>

#### Method 1: Configuration File (Recommended)

**macOS**: `~/.cursor/mcp.json`  
**Windows**: `%USERPROFILE%\.cursor\mcp.json`

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

#### Method 2: Terminal Command

**macOS/Linux**:
```bash
mkdir -p ~/.cursor
echo '{"mcpServers":{"logseq":{"command":"npx","args":["logseq-mcp-server"],"env":{"LOGSEQ_API_URL":"http://127.0.0.1:12315","LOGSEQ_API_TOKEN":"your-api-token-here"}}}}' > ~/.cursor/mcp.json
```

**Windows (PowerShell)**:
```powershell
New-Item -Path "$env:USERPROFILE\.cursor" -ItemType Directory -Force
'{"mcpServers":{"logseq":{"command":"npx","args":["logseq-mcp-server"],"env":{"LOGSEQ_API_URL":"http://127.0.0.1:12315","LOGSEQ_API_TOKEN":"your-api-token-here"}}}}' | Out-File -FilePath "$env:USERPROFILE\.cursor\mcp.json" -Encoding utf8
```

</details>

<details>
<summary><b>🌪️ Windsurf</b></summary>

#### Method 1: Configuration File

**macOS**: `~/Library/Application Support/Windsurf/mcp.json`  
**Windows**: `%APPDATA%\Windsurf\mcp.json`

```json
{
  "mcpServers": {
    "logseq": {
      "command": "npx",
      "args": ["logseq-mcp-server-server"],
      "env": {
        "LOGSEQ_API_URL": "http://127.0.0.1:12315",
        "LOGSEQ_API_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

#### Method 2: Terminal Command

**macOS**:
```bash
mkdir -p ~/Library/Application\ Support/Windsurf
echo '{"mcpServers":{"logseq":{"command":"npx","args":["logseq-mcp-server"],"env":{"LOGSEQ_API_URL":"http://127.0.0.1:12315","LOGSEQ_API_TOKEN":"your-api-token-here"}}}}' > ~/Library/Application\ Support/Windsurf/mcp.json
```

**Windows (PowerShell)**:
```powershell
New-Item -Path "$env:APPDATA\Windsurf" -ItemType Directory -Force
'{"mcpServers":{"logseq":{"command":"npx","args":["logseq-mcp-server"],"env":{"LOGSEQ_API_URL":"http://127.0.0.1:12315","LOGSEQ_API_TOKEN":"your-api-token-here"}}}}' | Out-File -FilePath "$env:APPDATA\Windsurf\mcp.json" -Encoding utf8
```

</details>

<details>
<summary><b>🌐 Continue.dev</b></summary>

Add to your Continue configuration:

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

</details>

<details>
<summary><b>🔧 Zed Editor</b></summary>

Add to your Zed settings:

```json
{
  "context_servers": {
    "logseq": {
      "command": {
        "path": "npx",
        "args": ["logseq-mcp-server-server"]
      },
      "settings": {
        "LOGSEQ_API_URL": "http://127.0.0.1:12315",
        "LOGSEQ_API_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

</details>

<details>
<summary><b>🧠 Cline (VS Code Extension)</b></summary>

Add to your VS Code settings.json (Cline reads the standard MCP servers map):

```json
{
  "mcp": {
    "servers": {
      "logseq": {
        "type": "stdio",
        "command": "npx",
        "args": ["logseq-mcp-server"],
        "env": {
          "LOGSEQ_API_URL": "http://127.0.0.1:12315",
          "LOGSEQ_API_TOKEN": "your-api-token-here"
        }
      }
    }
  }
}
```

</details>

<details>
<summary><b>🔬 MCP Inspector (Debug/Testing)</b></summary>

Run the Inspector and connect to this server locally:

```bash
# macOS/Linux
export LOGSEQ_API_URL="http://127.0.0.1:12315"
export LOGSEQ_API_TOKEN="your-api-token-here"
npx @modelcontextprotocol/inspector --command npx --args logseq-mcp-server
```

```powershell
# Windows (PowerShell)
$env:LOGSEQ_API_URL = "http://127.0.0.1:12315"
$env:LOGSEQ_API_TOKEN = "your-api-token-here"
npx @modelcontextprotocol/inspector --command npx --args logseq-mcp-server
```

</details>

<details>
<summary><b>🚀 Raycast (Status)</b></summary>

Raycast AI has been rolling out MCP support. If your build exposes MCP server configuration, you can add this server similarly to the examples above (command `npx`, args `["logseq-mcp-server"]`, and the two environment variables). If you don’t see MCP settings, this may not be available in your version yet.

</details>

<details>
<summary><b>🤖 Other MCP Clients</b></summary>

#### Method 1: Direct Command
For any MCP-compatible client, run directly:

```bash
# Set environment variables
export LOGSEQ_API_URL="http://127.0.0.1:12315"
export LOGSEQ_API_TOKEN="your-api-token-here"

# Run the server
logseq-mcp-server
```

#### Method 2: Standard MCP Configuration
Most MCP clients support this standard format:

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

</details>

### Step 3: Start Using

That's it! Your AI assistant now has access to your Logseq knowledge base through 4 powerful tools.

## 🔧 Available Tools

Logseq MCP provides 4 unified tools that handle all your knowledge base operations:

### 🔍 `search` - Advanced Multi-Modal Discovery

Find content across your entire graph with sophisticated filtering:

- **Template Discovery**: `templates:*` to list all templates
- **Property Search**: `property:status=open AND date:last-week`
- **Relationship Analysis**: `backlinks:"Important Topic"`
- **Date-Based Queries**: `date:today`, `date:last-month`
- **Combined Filters**: Complex AND/OR/NOT queries

### 📖 `get` - Unified Content Retrieval

Retrieve detailed information with full context:

- **Pages**: Complete content with backlinks and graph metrics
- **Blocks**: Hierarchical content with parent-child relationships
- **Templates**: Template definitions with variable analysis
- **Properties**: Page/block metadata and property schemas
- **Relations**: Graph connections and relationship analysis
- **System**: Health status and graph statistics

### ✏️ `edit` - Comprehensive Content Management

Create, modify, and organize your knowledge:

- **Pages**: Create, update, append, prepend content
- **Blocks**: Positional operations with precise placement
- **Templates**: Single-block enforcement with variable substitution
- **Properties**: Metadata management and validation
- **Relations**: Bi-directional link creation and updates
- **Safety**: Dry-run mode, validation, and rollback support; `confirmDestroy: true` required for `operation: "remove"`; `control.maxOps` enforced to prevent large accidental edits

Notes:
- **Properties**: When targeting a page, the operation resolves to the page’s root block UUID. The page must already exist (no implicit creation).
- **Templates**: Creation enforces the Logseq single-block template standard (single root block with content inserted as children when needed). Template insertion is append-only and requires an existing target page.

### 🗑️ `delete` - Safe Content Removal

Remove content with comprehensive safety controls:

- **Impact Analysis**: Preview what will be affected before deletion
- **Confirmation Required**: Explicit `confirmDestroy: true` for safety
- **Soft Delete**: Move to trash instead of permanent removal
- **Dependency Tracking**: Handle orphaned references and relationships

## 💡 Example Usage

### Basic Operations

```
"Search for all TODO items created this week"
"Get the complete content of my 'Project Alpha' page with all backlinks"
"Create a new page called 'Meeting Notes 2024-01-15' with today's agenda"
"Apply my 'Daily Review Template' to create a new review for today"
```

### Advanced Workflows

```
"Find all pages tagged #project that have status=active, then create a summary page linking to all of them"
"Search for templates related to meetings, then use the best one to create notes for tomorrow's team standup"
"Get the graph structure around 'Machine Learning' and create a comprehensive overview page with all related concepts"
```

### Template System

```
"List all available templates in my knowledge base"
"Apply the 'Project Template' with variables: name='Website Redesign', deadline='March 1st', team='Design'"
"Create a new template called 'Book Notes' for capturing reading highlights"
```

## 🎯 Key Features

### Revolutionary 4-Tool Architecture

- **Simplified AI Selection**: Instead of 15+ confusing micro-tools, choose from 4 clear action verbs
- **Consistent Interface**: All tools follow the same parameter patterns and response formats  
- **Type Safety**: Comprehensive validation with helpful error messages
- **Production Ready**: Built with monitoring, caching, and reliability features

### Advanced Search Capabilities

- **Multi-Modal Discovery**: Search across pages, blocks, templates, tasks simultaneously
- **Sophisticated Filtering**: Date ranges, properties, tags, relationships, content length
- **Cursor-Based Pagination**: Handle large result sets efficiently (up to 100 items per page)
- **Query Intelligence**: Automatic query type detection and optimization

### Template System Excellence

- **Single-Block Enforcement**: Templates must be single blocks (Logseq standard compliance)
- **Variable Substitution**: Full `{{variableName}}` placeholder support with validation
- **Template Discovery**: Easy finding and application of existing templates
- **Creation Validation**: Automatic format checking and error prevention

### Enterprise-Grade Safety

- **Idempotency Controls**: Prevent duplicate operations with safe retry mechanisms
- **Dry-Run Mode**: Preview all operations before execution
- **Confirmation Prompts**: Required confirmation for destructive operations
- **Impact Analysis**: Comprehensive dependency tracking and orphan detection
- **Soft Delete**: Recovery options for accidental deletions

## 📊 Performance Features

### Intelligent Caching System

- **Page Content**: 5-minute TTL with smart invalidation
- **Graph Structure**: 3-minute TTL with relationship tracking
- **Search Results**: Optimized caching for repeated queries
- **Template Library**: Persistent caching for faster template discovery

### Connection Management

- **HTTP Connection Pooling**: Efficient request handling
- **Automatic Retry Logic**: Exponential backoff for reliability
- **Request Deduplication**: Prevent duplicate concurrent operations
- **Timeout Management**: Configurable timeouts for different operation types

### Monitoring & Observability

- **Real-time Metrics**: Operation timing, cache hit rates, error tracking
- **Structured Logging**: Production-ready logs with sensitive data redaction
- **Health Monitoring**: Automatic system status checks
- **Rate Limiting**: Protection against abuse with configurable limits

## 🔒 Security & Privacy

### Privacy-First Design

- **Local-Only Operations**: No data transmission to external servers
- **API Token Security**: Tokens never logged or exposed
- **Input Sanitization**: Comprehensive validation of all user inputs
- **Error Sanitization**: Sensitive information stripped from error messages

### Built-in Protections

- **Rate Limiting**: Configurable protection against abuse
- **Content Validation**: Automatic detection and prevention of malicious content
- **Secure Defaults**: Conservative security settings out of the box
- **GDPR Compliance**: No data collection or external transmission

## 🐛 Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| **Connection Refused** | Ensure Logseq is running with HTTP API enabled |
| **Unauthorized** | Check your API token and regenerate if needed |
| **Slow Performance** | Increase timeout settings or check network connectivity |
| **Template Errors** | Ensure templates are single blocks (Logseq requirement) |

### Debug Mode

```bash
# Enable debug logging
DEBUG=1 logseq-mcp-server

# Set custom log level
LOG_LEVEL=debug logseq-mcp-server
```

### Environment Variables

```bash
# Core Configuration (Required)
export LOGSEQ_API_URL="http://127.0.0.1:12315"
export LOGSEQ_API_TOKEN="your-api-token-here"

# Performance Tuning (Optional)
export LOGSEQ_TIMEOUT="30000"           # 30 second timeout
export LOGSEQ_MAX_RETRIES="5"           # 5 retry attempts

# Logging (Optional)
# Default: 'error' in production or when NODE_ENV is unset; 'info' in development
# Override to increase verbosity when needed:
# export LOG_LEVEL="info"                 # e.g., operational logs in prod
export NODE_ENV="production"            # Environment mode
```

## 📚 Documentation

- **[API Reference](docs/API.md)** - Complete tool documentation with examples
- **[Configuration Guide](docs/CONFIGURATION.md)** - Detailed setup and customization options
- **[Changelog](CHANGELOG.md)** - Version history and release notes

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Make** your changes with tests
4. **Commit** your changes (`git commit -m 'Add amazing feature'`)
5. **Push** to the branch (`git push origin feature/amazing-feature`)
6. **Open** a Pull Request

### Development Setup

```bash
# Clone the repository
git clone https://github.com/eugeneyvt/logseq-mcp-server
cd logseq-mcp-server

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your Logseq configuration

# Start development
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## 🌟 Community

- **GitHub Issues**: [Report bugs and request features](https://github.com/eugeneyvt/logseq-mcp-server/issues)
- **GitHub Discussions**: [Ask questions and share ideas](https://github.com/eugeneyvt/logseq-mcp-server/discussions)
- **Documentation**: [Comprehensive guides and examples](https://github.com/eugeneyvt/logseq-mcp-server/wiki)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with the **[Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)**
- Powered by **[Logseq's HTTP API](https://docs.logseq.com/)**
- Inspired by the growing ecosystem of AI-powered knowledge management tools
- Special thanks to the Logseq community for their continuous feedback and support

---

<div align="center">

**Transform your Logseq knowledge base into an AI-powered workspace**

[![npm](https://img.shields.io/npm/v/logseq-mcp-server?color=blue)](https://www.npmjs.com/package/logseq-mcp-server)
[![GitHub stars](https://img.shields.io/github/stars/eugeneyvt/logseq-mcp-server?style=social)](https://github.com/eugeneyvt/logseq-mcp-server/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/eugeneyvt/logseq-mcp-server)](https://github.com/eugeneyvt/logseq-mcp-server/issues)

</div>
