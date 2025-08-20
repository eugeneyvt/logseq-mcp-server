# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2025-01-20

### 🚀 Enhanced Markdown Parser - Major Architecture Improvement

#### 🌟 Advanced Markdown Processing

- **Enhanced Markdown Parser**: Complete rewrite using mdast-util-from-markdown with comprehensive AST processing
- **Logseq Syntax Preservation**: Intelligent extraction and preservation of page links, block refs, tags, and properties
- **Multi-format Support**: Full support for headings, lists, tables, code blocks, blockquotes, images, and more
- **Nested Structure Handling**: Proper parent-child relationships and hierarchy management
- **Task List Support**: Native support for Logseq task lists with checkbox states

#### 🔧 Block Operations Enhancement

- **`append_blocks` Overhaul**: Replaced basic regex parsing with enhanced markdown parser
- **Consistent Block Creation**: Now uses the same `createBlocksFromParsed` utility as `set_page_content`
- **Improved Result Reporting**: Enhanced response format with detailed parsing and creation summaries
- **Better Error Handling**: More informative error messages and validation results

#### 🎯 Content Processing Features

- **Smart Content Parsing**: Automatic detection of content types and appropriate handling
- **Format Validation**: Comprehensive validation with automatic correction capabilities
- **Logseq Syntax Extraction**: Automatic detection of `[[page links]]`, `((block refs))`, `#tags`, and `key:: value` properties
- **HTML Sanitization**: Built-in protection against malicious content with configurable settings

#### 🏗️ Technical Improvements

- **Type Safety**: Replaced all `any` types with proper TypeScript types and interfaces
- **Code Quality**: Fixed all 42 linting errors for clean, maintainable codebase
- **Performance**: Optimized parsing algorithms and memory management
- **Modular Architecture**: Clean separation of concerns between parsing, validation, and block creation

#### 📊 Enhanced Response Format

- **Detailed Results**: Each block creation includes type, level, success status, and parsed content
- **Summary Statistics**: Comprehensive overview of parsing and creation process
- **Better Logging**: Improved logging with structured data and performance metrics
- **Consistent API**: Unified response format across all block operations

#### ✅ Quality Assurance

- **Zero Linting Errors**: All ESLint rules now pass
- **Type Safety**: Full TypeScript compliance with strict mode
- **Test Coverage**: All existing tests pass with enhanced functionality
- **Documentation**: Updated API documentation reflecting new capabilities

---

## [1.0.2] - 2025-01-20

### 🚀 Core Methods Architecture - Major Enhancement

#### 🌟 Architecture Transformation

- **Core Methods + Macros Design**: Complete redesign with slim set of powerful methods
- **Context-Aware Operations**: Added graph structure mapping and intelligent placement
- **Atomic Operations**: Batch operations with rollback support and idempotency
- **Format Validation**: Comprehensive Logseq formatting rules with auto-correction

#### 🛠️ New Core Methods

- **System**: `get_system_info()` - Comprehensive system and cache status
- **Pages**: `ensure_page()`, `get_page()`, `set_page_content()`, `set_page_properties()`
- **Blocks**: `append_blocks()`, `update_block()`, `move_block()`
- **Search**: Enhanced `search()` with intelligent scoping
- **Context**: `build_graph_map()`, `suggest_placement()`, `plan_content()`
- **Batch**: `batch()`, `upsert_page_outline()` - Macro operations

#### 🎛️ Advanced Control Parameters

- **`dryRun`**: Preview operations without executing
- **`strict`**: Enable/disable format validation
- **`autofixFormat`**: Automatic formatting correction
- **`idempotencyKey`**: Prevent duplicate operations
- **`maxOps`**: Operation limits for safety

#### 🧠 Context-Aware Features

- **Graph Mapping**: Automatic graph structure analysis on startup
- **Smart Placement**: AI-powered content placement suggestions with confidence scores
- **Content Planning**: Dry-run planning with alternatives and complexity analysis
- **Intent Analysis**: Semantic matching for optimal content organization

#### 📋 Formatting & Validation

- **Strict TODO Markers**: `TODO`, `DOING`, `DONE`, `LATER`, `NOW`, `CANCELED`
- **Page Link Validation**: `[[Page Name]]` format with auto-closing
- **Property Format**: `key:: value` enforcement
- **Structural Nesting**: Parent-child relationships instead of raw indentation
- **Content Normalization**: Automatic formatting correction

#### 🔒 Enhanced Error Handling

- **Standardized Responses**: `{ ok: boolean, data?, error? }` format
- **Actionable Error Codes**: `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `LIMIT_EXCEEDED`, `BAD_QUERY`, `INTERNAL`
- **Recovery Hints**: Specific guidance for error resolution

#### 🎯 Workflow Automation

- **Session Initialization**: Automatic graph map building on startup
- **Operation Verification**: Comprehensive response formats with confirmation
- **Cache Management**: Smart invalidation and performance optimization

#### 📊 Performance & Reliability

- **Intelligent Caching**: Graph maps (5min), pages (5min), blocks (3min)
- **Atomic Transactions**: All-or-nothing operations with rollback
- **Connection Management**: Persistent HTTP with automatic retry
- **Monitoring**: Real-time metrics and performance tracking

#### ✅ Quality Assurance

- **148/148 Tests Passing**: Complete test coverage maintained
- **Zero Linting Errors**: Clean, maintainable codebase
- **TypeScript Compliance**: Full type safety and strict mode
- **Documentation**: Complete API reference and configuration guides

---

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
