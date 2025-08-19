# 🧠 Logseq MCP Server

> **Transform your Logseq knowledge base into an AI-powered workspace**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Protocol-orange.svg)](https://modelcontextprotocol.io/)

A **production-ready** Model Context Protocol (MCP) server that enables AI assistants to seamlessly interact with your Logseq knowledge base. This server acts as a bridge between AI agents and Logseq graphs, providing comprehensive access to read, create, update, and manage your notes with enterprise-grade reliability, security, and performance.

## ✨ Why Logseq MCP Server?

- 🚀 **Instant AI Integration** - Connect any MCP-compatible AI to your Logseq graph
- 🔒 **Privacy First** - All operations are local-only, no data leaves your machine
- 🎯 **17+ Powerful Tools** - Complete coverage of Logseq operations
- ⚡ **Production Ready** - Built with caching, monitoring, and security
- 🎨 **Universal Compatibility** - Works with Claude, ChatGPT, and other AI assistants

## 🎯 Target Audience

- **Knowledge Workers** - Researchers, writers, and content creators
- **Developers** - Software engineers and technical teams
- **Students** - Academic researchers and learners
- **Productivity Enthusiasts** - Anyone using Logseq for personal knowledge management
- **AI Developers** - Building AI applications that need knowledge base access

## 🚀 Quick Start

### 1. Install the Server

```bash
npm install -g logseq-mcp-server
```

### 2. Configure Logseq

1. **Enable Developer Mode**: Settings → Advanced → Developer Mode
2. **Enable HTTP API**: Settings → Features → HTTP API
3. **Generate API Token**: Settings → HTTP API Authentication Token
4. **Restart Logseq**

### 3. Connect Your AI Assistant

Choose your AI platform below and follow the configuration steps.

## 🔧 Configuration Guide

### 🤖 Claude Desktop

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

### 🧠 ChatGPT (with MCP Support)

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

### 🤖 Anthropic Claude Console

```bash
# Set environment variables
export LOGSEQ_API_URL="http://127.0.0.1:12315"
export LOGSEQ_API_TOKEN="your-api-token-here"

# Run Claude Console with MCP support
claude console --mcp-servers logseq
```

### 🐙 GitHub Copilot Chat

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

### 🔧 Custom MCP Clients

For any MCP-compatible client, set these environment variables:

```bash
export LOGSEQ_API_URL="http://127.0.0.1:12315"
export LOGSEQ_API_TOKEN="your-api-token-here"
```

Then run:

```bash
logseq-mcp-server
```

## 🛠️ Available Tools

### 📝 Page Operations

| Tool                      | Description                  | Example                                      |
| ------------------------- | ---------------------------- | -------------------------------------------- |
| `logseq_list_pages`       | List all pages in your graph | "List all my pages"                          |
| `logseq_get_page`         | Get page information         | "Get info about 'Project Planning'"          |
| `logseq_get_page_content` | Get formatted page content   | "Show my daily journal content"              |
| `logseq_create_page`      | Create new pages             | "Create 'Meeting Notes' with today's agenda" |
| `logseq_delete_page`      | Delete pages safely          | "Delete the 'Old Draft' page"                |

### 🧱 Block Management

| Tool                        | Description          | Example                                       |
| --------------------------- | -------------------- | --------------------------------------------- |
| `logseq_get_block`          | Get block by UUID    | "Get block abc123..."                         |
| `logseq_create_block`       | Create new blocks    | "Add task 'Buy groceries' to today's journal" |
| `logseq_update_block`       | Update block content | "Change that block to include priority"       |
| `logseq_set_block_property` | Set block properties | "Set priority to 'high' for that task"        |
| `logseq_delete_block`       | Remove blocks        | "Delete that block and its children"          |

### 🔍 Search & Query

| Tool                      | Description      | Example                           |
| ------------------------- | ---------------- | --------------------------------- |
| `logseq_search`           | Full-text search | "Search for 'machine learning'"   |
| `logseq_datascript_query` | Advanced queries | "Find all TODO items"             |
| `logseq_get_backlinks`    | Find references  | "What pages link to 'Project X'?" |

### 🎯 Context & State

| Tool                       | Description       | Example                     |
| -------------------------- | ----------------- | --------------------------- |
| `logseq_get_current_graph` | Get graph info    | "What graph am I in?"       |
| `logseq_get_current_page`  | Get open page     | "What page am I viewing?"   |
| `logseq_get_current_block` | Get focused block | "Which block am I editing?" |

## 💡 Usage Examples

### 🎯 Real-World Scenarios

#### **Academic Research**

```
"Create a new page called 'AI Research 2024' and add bullet points about:
- Machine learning papers I should read
- Key researchers to follow
- Conference deadlines
- My research questions"
```

#### **Project Management**

```
"Search for all my TODO items that mention 'project deadline' and show their priority.
Then create a new page called 'Q1 Priorities' with the high-priority items."
```

#### **Daily Journaling**

```
"Add a new entry to today's journal about my morning meeting with the dev team.
Include the key decisions we made and action items assigned."
```

#### **Knowledge Synthesis**

```
"Find all my notes about React hooks and create a summary page with:
- Common patterns I use
- Best practices I've learned
- Examples from my projects
- Links to the original notes"
```

### 🔍 Advanced DataScript Queries

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

;; Find pages with specific properties
[:find ?page-name
 :where
 [?page :block/name ?page-name]
 [?page :block/properties ?props]
 [(get ?props :type) ?type]
 [(= ?type "project")]]
```

## ⚡ Performance Features

### 🚀 Built-in Optimizations

- **Smart Caching**: Page listings (3min), content (5min), blocks (3min)
- **Connection Pooling**: Efficient HTTP request management
- **Retry Logic**: Exponential backoff for reliability
- **Request Deduplication**: Prevents duplicate concurrent requests
- **Memory Management**: Automatic cache cleanup and optimization

### 📊 Monitoring & Health

- **Real-time Metrics**: Request timing, cache hit rates, error rates
- **Health Checks**: Automatic server status monitoring
- **Rate Limiting**: Configurable protection against abuse
- **Structured Logging**: Comprehensive logging with sensitive data redaction

## 🔒 Security & Privacy

### 🛡️ Built-in Protections

- **Local-Only Operations**: No data leaves your machine
- **Input Validation**: Comprehensive sanitization of all inputs
- **Token Security**: API tokens are never logged or transmitted
- **Rate Limiting**: Prevents abuse and ensures stability
- **Error Sanitization**: No sensitive information in error messages

### 🔐 Safe Operations

- **Confirmation Prompts**: Destructive operations require confirmation
- **Property Validation**: All inputs are validated before processing
- **Content Filtering**: Prevents script injection and malicious content

## 🚨 Troubleshooting

### 🔍 Common Issues

| Problem                  | Solution                                       |
| ------------------------ | ---------------------------------------------- |
| **"Connection refused"** | Ensure Logseq is running with HTTP API enabled |
| **"Unauthorized"**       | Check your API token and regenerate if needed  |
| **"API not found"**      | Verify Logseq version supports HTTP API        |
| **Slow performance**     | Check network and increase timeout settings    |

### 🐛 Debug Mode

```bash
# Enable debug logging
DEBUG=1 logseq-mcp-server

# Set log level
LOG_LEVEL=debug logseq-mcp-server

# Check server health
curl http://localhost:3000/health
```

### 📋 Environment Variables

```bash
# Core Configuration
export LOGSEQ_API_URL="http://127.0.0.1:12315"
export LOGSEQ_API_TOKEN="your-api-token-here"

# Performance Tuning
export LOGSEQ_TIMEOUT="30000"           # 30 second timeout
export LOGSEQ_MAX_RETRIES="5"           # 5 retry attempts

# Security Settings
export RATE_LIMIT_MAX="200"             # 200 requests per minute
export RATE_LIMIT_WINDOW="60000"        # 1 minute window

# Logging
export LOG_LEVEL="info"                 # Log level
export NODE_ENV="production"            # Environment
```

## 🏗️ Development

### 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/eugeneyvt/logseq-ai
cd logseq-ai

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### 📁 Project Structure

```
src/
├── index.ts              # Main server entry point
├── errors/               # Error handling and definitions
├── schemas/              # Schema definitions and validation
├── tools/                # MCP tool implementations
├── utils/                # Core utilities
└── types/                # TypeScript type definitions
```

### 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test suites
npm run test:unit
npm run test:integration

# Generate coverage report
npm run test:coverage
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Make** your changes
4. **Add** tests for new functionality
5. **Commit** your changes (`git commit -m 'Add amazing feature'`)
6. **Push** to the branch (`git push origin feature/amazing-feature`)
7. **Open** a Pull Request

### 🎯 Contribution Areas

- **New MCP Tools**: Add functionality for specific Logseq operations
- **Performance Improvements**: Optimize caching, queries, and error handling
- **Documentation**: Improve examples, tutorials, and API documentation
- **Testing**: Add test coverage and integration tests
- **UI/UX**: Enhance user experience and error messages

## 📚 Additional Resources

### 📖 Documentation

- **[API Reference](API.md)** - Complete tool documentation
- **[Configuration Guide](CONFIGURATION.md)** - Detailed setup instructions
- **[Development Roadmap](ROADMAP.md)** - Future development plans
- **[Changelog](CHANGELOG.md)** - Version history and updates

### 🔗 Related Links

- **[Model Context Protocol](https://modelcontextprotocol.io/)** - MCP specification
- **[Logseq Documentation](https://docs.logseq.com/)** - Logseq API reference
- **[MCP SDK](https://github.com/modelcontextprotocol/sdk)** - Development toolkit

### 💬 Community

- **GitHub Issues**: [Report bugs and request features](https://github.com/eugeneyvt/logseq-ai/issues)
- **GitHub Discussions**: [Ask questions and share ideas](https://github.com/eugeneyvt/logseq-ai/discussions)
- **GitHub Wiki**: [Community documentation and guides](https://github.com/eugeneyvt/logseq-ai/wiki)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with the **[Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)**
- Powered by **[Logseq's HTTP API](https://docs.logseq.com/)**
- Inspired by the growing ecosystem of AI-powered knowledge management tools
- Special thanks to the Logseq community and contributors

---

<div align="center">

**Made with ❤️ for the Logseq community**

[![GitHub stars](https://img.shields.io/github/stars/eugeneyvt/logseq-ai?style=social)](https://github.com/eugeneyvt/logseq-ai/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/eugeneyvt/logseq-ai?style=social)](https://github.com/eugeneyvt/logseq-ai/network/members)
[![GitHub issues](https://img.shields.io/github/issues/eugeneyvt/logseq-ai)](https://github.com/eugeneyvt/logseq-ai/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/eugeneyvt/logseq-ai)](https://github.com/eugeneyvt/logseq-ai/pulls)

</div>
