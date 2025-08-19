# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-08-19

### Documentation & Code Quality Improvements

#### 📚 Documentation Improvements

- **Complete README Overhaul**: Transformed from technical reference to user-friendly guide
- **Visual Enhancements**: Added emojis, badges, tables, and better formatting throughout
- **Real-World Examples**: Added practical usage scenarios for academic research, project management, and knowledge synthesis
- **Additional Resources**: Added links to API.md, CONFIGURATION.md, ROADMAP.md, and community resources
- **MCP Client Support**: Added configuration examples for ChatGPT, Claude Console, GitHub Copilot Chat, and custom MCP clients

#### 🎯 User Experience

- **Quick Start Guide**: 3-step setup process for immediate use
- **Tool Reference Tables**: Clean, searchable tables for all available tools
- **Environment Variable Reference**: Comprehensive configuration options
- **Community Integration**: Added GitHub social badges and contribution guidelines
- **Enhanced Troubleshooting**: Added common issues table and debug mode instructions

#### 🔧 Technical Improvements

- **Type Safety**: Fixed all TypeScript compilation errors
- **Code Quality**: Resolved ESLint warnings and improved code formatting
- **Testing**: Enhanced test coverage and fixed test configuration issues

---

## [1.0.0] - 2025-08-19

### Initial Release

#### 🚀 Core Features

- **Complete MCP server implementation** for Logseq integration
- **17 MCP Tools**: Comprehensive coverage of Logseq operations
- **Production Ready**: Built with enterprise-grade reliability, security, and performance

#### 📝 Page Operations

- `logseq_list_pages` - List all pages in the graph
- `logseq_get_page` - Get page information
- `logseq_get_page_content` - Get formatted page content
- `logseq_create_page` - Create new pages
- `logseq_delete_page` - Delete pages (with safety checks)

#### 🧱 Block Management

- `logseq_get_block` - Get specific blocks by UUID
- `logseq_create_block` - Create new blocks
- `logseq_update_block` - Update block content
- `logseq_delete_block` - Remove blocks
- `logseq_set_block_property` - Set block properties
- `logseq_remove_block_property` - Remove block properties

#### 🔍 Search & Query

- `logseq_search` - Full-text search across the graph
- `logseq_datascript_query` - Execute DataScript queries
- `logseq_get_backlinks` - Find page references

#### 🎯 Context & State

- `logseq_get_current_graph` - Get graph information
- `logseq_get_current_page` - Get currently open page
- `logseq_get_current_block` - Get currently focused block

#### 🛡️ Technical Features

- **Type Safety**: Full TypeScript implementation with Zod validation
- **Error Handling**: Comprehensive error handling with helpful troubleshooting messages
- **Security**: Input validation, sanitization, and rate limiting
- **Performance**: Intelligent caching, connection pooling, and retry logic
- **Monitoring**: Built-in metrics collection and health checks

#### 🔧 Development Features

- Built with TypeScript and ES modules
- Uses official MCP SDK for protocol compliance
- Comprehensive input validation with Zod schemas
- Axios for HTTP client with proper error handling
- Support for both Claude Desktop and other MCP clients

---

## [Unreleased]

### Planned Features

- Advanced editor operations (block selection, cursor management)
- Enhanced search capabilities with filters
- UI management and user interaction tools
- Git integration and version control
- Batch operations and advanced data management

See [ROADMAP.md](ROADMAP.md) for detailed development plans.
