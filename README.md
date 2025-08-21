# 🧠 Logseq MCP Server

> **Transform your Logseq knowledge base into an AI-powered workspace**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Protocol-orange.svg)](https://modelcontextprotocol.io/)
[![Version](https://img.shields.io/badge/version-1.0.4-blue.svg)](https://github.com/eugeneyvt/logseq-ai/releases)

A **production-ready** Model Context Protocol (MCP) server that enables AI assistants to seamlessly interact with your Logseq knowledge base. This server acts as a bridge between AI agents and Logseq graphs, providing comprehensive access to read, create, update, and manage your notes with enterprise-grade reliability, security, and performance.

## ✨ Why Logseq MCP Server?

- 🚀 **Instant AI Integration** - Connect any MCP-compatible AI to your Logseq graph
- 🔒 **Privacy First** - All operations are local-only, no data leaves your machine
- 🎯 **15+ Core Methods** - Streamlined, efficient tools for all Logseq operations including templates, properties, and relationships
- 🔍 **Multi-Modal Search** - Advanced discovery with templates, properties, relations, dates, and combined filters
- 🎨 **Template System** - Apply templates with variable substitution and multiple application modes
- 🔗 **Knowledge Graph Management** - Bi-directional relationships, graph analysis, and centrality scoring
- ⚡ **Production Ready** - Built with caching, monitoring, and security
- 🎨 **Universal Compatibility** - Works with Claude, ChatGPT, and other AI assistants
- 🧠 **Advanced Markdown Parser** - Comprehensive content processing with Logseq syntax preservation

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

## 🛠️ Available Core Methods

### 🌟 Core Methods Architecture

This server uses an advanced **core methods + macros** design for maximum efficiency:

- **Minimum API calls** - Smart batching and atomic operations
- **Maximum precision** - UUID-based operations with strict validation
- **Context awareness** - Graph structure mapping and intelligent placement
- **Format validation** - Automatic normalization and error correction
- **Advanced parsing** - Comprehensive markdown parser with Logseq syntax preservation

### 📝 System & Page Operations

| Method                | Description                          | Features                                          |
| --------------------- | ------------------------------------ | ------------------------------------------------- |
| `get_system_info`     | Get system and graph status          | Cache status, version info                        |
| `ensure_page`         | Ensure page exists with smart policy | Create/error/skip modes, validation               |
| `get_page`            | Get page information                 | Cached, with error hints, relationship data       |
| `set_page_content`    | Replace entire page content          | Comprehensive markdown parser, atomic replacement |
| `set_page_properties` | Manage page properties efficiently   | Batch upsert/remove operations, query mode        |

### 🧱 Block Operations

| Method          | Description                        | Features                                                                   |
| --------------- | ---------------------------------- | -------------------------------------------------------------------------- |
| `append_blocks` | Add multiple blocks with precision | **Comprehensive markdown parser**, parent/child relationships, positioning |
| `ensure_page`   | Create nested pages with hierarchy | Supports "Parent/Child/Subchild" structure                                 |
| `update_block`  | Update block content by UUID       | Format validation, cache invalidation                                      |
| `move_block`    | Move blocks with positioning       | Structural integrity, reference updates                                    |

### 🔍 Search & Context

| Method              | Description                                        | Features                                                                                                        |
| ------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `search`            | Enhanced search with intelligent wildcard handling | Supports "\*" for all pages, "empty" for empty pages, templates, properties, relations, dates, combined filters |
| `build_graph_map`   | Build graph structure cache                        | Auto-refresh, performance metrics                                                                               |
| `suggest_placement` | AI-powered content placement                       | Intent analysis, confidence scores                                                                              |
| `plan_content`      | Dry-run content planning                           | Alternative strategies, complexity                                                                              |

### 🎨 Templates & Relationships

| Method             | Description                    | Features                                                      |
| ------------------ | ------------------------------ | ------------------------------------------------------------- |
| `apply_template`   | Apply templates with variables | Template discovery, variable substitution, multiple modes     |
| `manage_relations` | Manage page relationships      | Bi-directional links, graph analysis, structure visualization |

### ⚡ Batch & Macro Operations

| Method                | Description                    | Features                      |
| --------------------- | ------------------------------ | ----------------------------- |
| `batch`               | Execute multiple operations    | Atomic transactions, rollback |
| `upsert_page_outline` | Create structured page layouts | Hierarchical content creation |

### 🎛️ Advanced Control Parameters

All methods support powerful control parameters:

- **`dryRun`** - Preview operations without executing
- **`strict`** - Enable/disable format validation
- **`autofixFormat`** - Automatically fix common formatting issues
- **`idempotencyKey`** - Prevent duplicate operations
- **`maxOps`** - Limit operation scope for safety

### 🚀 Markdown Processing

The server features a **comprehensive markdown parser** that provides:

- **Multi-format Support**: Headings (H1-H6), lists, tables, code blocks, blockquotes, images, thematic breaks
- **Logseq Syntax Preservation**: Automatic detection and preservation of `[[page links]]`, `((block refs))`, `#tags`, and `key:: value` properties
- **Smart Content Parsing**: Intelligent content type detection with appropriate handling
- **Nested Structure Management**: Proper parent-child relationships and hierarchy
- **Task List Support**: Native support for Logseq task lists with checkbox states
- **HTML Sanitization**: Built-in protection against malicious content

## 💡 Usage Examples

### 🚀 New Capabilities Showcase

#### **Template System**

```
"Find all templates in my graph and apply the 'Project Template' to create 'Q2 Marketing Campaign'"
"Use 'Meeting Template' with variables: date='2024-01-15', team='Engineering', agenda='Sprint Planning'"
"Apply 'Daily Review Template' to today's journal in append mode"
```

#### **Advanced Search & Discovery**

```
"Find all pages with status=open AND created in the last week"
"Show me all templates OR pages with type=template"
"Find pages that have priority=high AND are NOT archived"
"List all backlinks to 'Important Concept' with reference counts"
"Search for content from yesterday OR pages with urgent priority"
```

#### **Knowledge Graph Management**

```
"Create bi-directional links between 'Research' and 'Implementation' with text 'leads to'"
"Analyze the relationship structure around 'Central Topic' and show centrality scores"
"Get comprehensive overview of 'Project Alpha' including all relationships and metrics"
"Show me the graph structure and most connected pages"
```

### 🎯 Real-World Scenarios

#### **Nested Page Creation**

```
"Create a nested project structure: Projects/Web Development/Frontend/React"
"Organize research into: Research/AI/Neural Networks/Deep Learning"
"Set up work hierarchy: Work/Meetings/2025/Q1/Weekly Standups"
```

#### **Academic Research**

```
"Use ensure_page to create 'AI Research 2025' and then append_blocks with:
- Machine learning papers I should read
- Key researchers to follow
- Conference deadlines
- My research questions"
```

#### **Project Management**

```
"Use search with scope='blocks' to find TODO items mentioning 'project deadline'.
Then use batch operations to ensure_page 'Q1 Priorities' and append_blocks
with the high-priority items in a single atomic transaction."
```

#### **Daily Journaling**

```
"Use suggest_placement to find the best location for meeting notes,
then append_blocks to today's journal with structured meeting content:
decisions made, action items, and next steps."
```

#### **Knowledge Synthesis**

```
"First use build_graph_map to understand the knowledge structure,
then search for React hooks content. Use plan_content to design
a summary page structure, then execute with batch operations:
- Common patterns I use
- Best practices I've learned
- Examples from my projects
- Links to the original notes"
```

#### **Template Management**

```
"Find all available templates in my graph, then apply the 'Project Template'
to create 'Q2 Marketing Campaign' with variables: quarter='Q2', team='Marketing', budget='50k'"
```

#### **Relationship Analysis**

```
"Show me all pages that link to 'Important Concept', create bi-directional
links between related topics, and analyze the graph structure around 'Central Topic'"
```

#### **Advanced Property Search**

```
"Find all pages with status=open AND created in the last week,
then update their priority property to 'high' and create relationships
to the 'Current Sprint' page"
```

#### **Content Cleanup**

```
"Find all empty pages that need content or cleanup:
- Use find_empty_pages to identify pages with no content
- Filter out journal pages if not needed
- Get detailed analysis of why pages are empty
- Prioritize cleanup based on page importance"
```

### 🔍 Advanced Search & Query Capabilities

The enhanced search tool provides powerful multi-modal discovery:

#### **Template Discovery**

```
"templates:*"                    // List all available templates
"template:\"Meeting Template\""  // Find specific template
```

#### **Property-Based Search**

```
"property:status=open"           // Find pages with specific properties
"properties:page=\"Project Alpha\"" // Get all properties for a page
```

#### **Relationship Analysis**

```
"backlinks:\"Important Topic\""  // Find pages that reference this
"references:\"Research Topic\""   // Find all references and mentions
```

#### **Date-Based Search**

```
"date:2024-01-01"               // Specific date
"date:today"                     // Today's content
"date:last-week"                 // Last week's content
"date:last-month"                // Last month's content
```

#### **Combined Filters**

```
"property:status=open AND date:last-week"  // Multiple conditions
"templates:* OR property:type=template"    // OR logic
"property:priority=high AND NOT archived"  // NOT operator
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

- **Confirmation Prompts**: Destructive operations require explicit `confirmDestroy: true`
- **Enhanced Dry Run**: Detailed previews of what will be deleted/changed
- **Context Awareness**: Shows page content, block counts, relationships before deletion
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
├── handlers/             # Request handlers and core methods
│   ├── block-handlers.ts # Block operations (append_blocks, update_block, move_block)
│   ├── page-handlers.ts  # Page operations (ensure_page, get_page, set_page_content)
│   ├── graph-handlers.ts # Graph operations (search, build_graph_map, suggest_placement)
│   ├── search-handlers.ts # Enhanced search with templates, properties, relations, dates
│   ├── template-handlers.ts # Template operations and variable substitution
│   ├── relation-handlers.ts # Relationship management and graph analysis
│   ├── system-handlers.ts # System information and health checks
│   └── core-methods.ts   # Core MCP method definitions
├── utils/                # Core utilities and helpers
│   ├── markdown-parser.ts # Enhanced markdown parser with Logseq syntax support
│   ├── block-creator.ts  # Block creation utilities with hierarchy management
│   ├── formatting/       # Content formatting and validation
│   ├── security/         # Security utilities and input validation
│   ├── monitoring/       # Performance monitoring and metrics
│   ├── cache.ts          # Intelligent caching system
│   └── logger.ts         # Structured logging with sensitive data redaction
├── schemas/              # Schema definitions and validation
├── tools/                # MCP tool implementations
├── client/               # Logseq API client with connection management
├── types/                # TypeScript type definitions
└── errors/               # Error handling and definitions
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

### 🧪 Comprehensive Testing Guide

Test all the new capabilities with these comprehensive prompts:

#### **Template System Testing**

```
"List all templates available in my graph"
"Find and show me the structure of my 'Meeting Template'"
"Apply the 'Daily Review Template' to a new page called 'Review 2024-01-15' with variables: date='2024-01-15', team='Engineering', project='AI Integration'"
"Create a new page using the 'Project Template' with project name 'Website Redesign' and deadline 'March 1st'"
```

#### **Advanced Search Testing**

```
"Find all pages with status=open AND created in the last week"
"Show me all templates OR pages with type=template"
"Find pages that have priority=high AND are NOT archived"
"List all project pages OR pages that link to 'Project Management'"
"Find empty pages OR pages with status=draft"
```

#### **Relationship Management Testing**

```
"Find all pages that link to 'Important Concept'"
"Show me all references (links and mentions) to 'Research Topic'"
"Create a bi-directional link between 'Frontend Design' and 'User Experience' with link text 'influences'"
"Analyze the relationship structure around the page 'Central Topic'"
"Show me the graph structure and most connected pages"
```

#### **Property Management Testing**

```
"Show me all properties for the page 'Project Alpha'"
"Find all pages that have status=open"
"Set the status property to 'completed' for the page 'Task 1'"
"Add properties priority=high and due_date=2024-02-01 to page 'Important Task'"
"Find all pages that have a priority property set to 'urgent'"
```

#### **Complex Workflow Testing**

```
"Find all project templates, then apply the best one to create 'Q2 Marketing Campaign' with variables: quarter='Q2', team='Marketing', budget='50k'"
"Search for all open tasks AND create relationships between them and 'Current Sprint'"
"Find all empty meeting pages OR pages tagged as 'incomplete' AND add a 'needs-review' property"
"Create a comprehensive overview of 'Product Development' including all backlinks, outgoing links, and related pages"
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
