# Changelog

## 1.0.0-beta.7 - 2025-08-27

### Fixes

- Simplified module execution guard - removed complex filename matching, now always runs main() for CLI entry
- Further optimized startup flow for maximum compatibility with npx environments
- Enhanced process lifecycle management for reliable operation

## 1.0.0-beta.6 - 2025-08-27

### Fixes

- Added missing MCP initialization handler to prevent early server exit
- Server now properly responds to initialize requests from Claude Desktop
- Fixed transport closing issue after initialization - all MCP protocol flows work correctly

## 1.0.0-beta.5 - 2025-08-27

### Fixes

- Keep process alive after MCP connect to prevent premature stdio close when launched via `npx`, which caused Claude Code to report "Server transport closed". The server now resumes `stdin` and waits for stream end or `SIGINT`/`SIGTERM`.
- Initialize: echo client `protocolVersion` when provided for better compatibility.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-beta.1] - 2025-08-25

### 🚀 **BETA RELEASE**

First public beta release of the Logseq MCP server with unified 4-tool architecture.

#### **✨ Features**

- **4-Tool Unified Architecture**: Search, Get, Edit, Delete tools for intuitive AI interaction
- **Advanced Search**: Multi-modal discovery with templates, properties, relations, date filters
- **Template System**: Single-block enforcement with variable substitution
- **Enterprise Safety**: Idempotency controls, dry-run mode, confirmation prompts
- **Production Ready**: Caching, monitoring, security, error handling
- **Universal Compatibility**: Works with Claude Desktop, VS Code, Cursor, Windsurf, and more

#### **🛡️ Security & Privacy**

- **Local-Only Operations**: No data transmission to external servers
- **Input Sanitization**: Comprehensive validation of all user inputs
- **Token Security**: API tokens never logged or exposed
- **Rate Limiting**: Protection against abuse with configurable limits

#### **📊 Performance**

- **Intelligent Caching**: 3-5 minute TTL for different content types
- **Connection Pooling**: Efficient HTTP request management
- **Cursor-Based Pagination**: Handle large result sets (up to 100 items)
- **Automatic Retry**: Exponential backoff for reliability

#### **🔧 Developer Experience**

- **Simple Installation**: `npm install -g logseq-mcp-server`
- **Zero Configuration**: Works with just API credentials
- **Comprehensive Documentation**: Complete API reference and configuration guide
- **Multiple Client Support**: Easy setup for all major MCP clients

---

## [2.0.0] - 2025-08-20 [INTERNAL]

### 🚀 **MAJOR UPDATE**: Complete 4-Tool Unified Architecture

This is a **breaking change** that completely redesigns the Logseq MCP Server to address fundamental usability issues and provide a much more intuitive experience for AI models and developers.

#### **🔥 Breaking Changes**

- **Complete API Redesign**: Replaced 15+ confusing micro-tools with 4 clear action verbs
- **Tool Selection Simplified**: Search/Get/Edit/Delete architecture dramatically improves AI tool selection accuracy
- **New Parameter Structure**: All tools now use consistent, type-safe parameters with validation
- **Enhanced Error Handling**: Structured error codes with actionable hints replace generic messages
- **Template System Overhaul**: Single-block enforcement with proper variable substitution
- **Advanced Search**: Multi-modal discovery with sophisticated filtering replaces basic text search

#### **✨ New 4-Tool Architecture**

##### **🔍 Search Tool** - Advanced Discovery

- Multi-modal search across pages, blocks, templates, tasks, and properties
- Sophisticated filtering: `property:status=open AND date:last-week`
- Template discovery: `templates:*`, `template:"Meeting Template"`
- Relationship analysis: `backlinks:"Important Topic"`, `references:"Research Topic"`
- Date-based queries: `date:today`, `date:last-week`, `date:last-month`
- Combined filters with AND/OR/NOT logic
- Cursor-based pagination (100 items max per request)

##### **📖 Get Tool** - Unified Content Retrieval

- Retrieve pages, blocks, templates, properties, relations, tasks, system info, graph data
- Include options: children, properties, backlinks, outgoing links, content previews
- Format control: tree vs flat representation for hierarchical content
- Depth control for relationship and hierarchy traversal
- Comprehensive metadata with graph metrics and relationship analysis

##### **✏️ Edit Tool** - Content Creation & Modification

- Create, update, append, prepend, move content across all Logseq types
- Type+operation validation with helpful error messages
- Template single-block enforcement (major template system fix)
- Variable substitution for template insertion
- Position control for precise content placement
- Dry-run mode and idempotency keys for safe operations

##### **🗑️ Delete Tool** - Safe Content Removal

- Comprehensive safety controls with `confirmDestroy: true` requirement
- Impact analysis showing dependencies and orphaned references
- Cascade deletion with dependency tracking
- Soft delete option (move to trash instead of permanent deletion)
- Simulation mode to preview deletions

#### **🎯 Key Improvements**

##### **AI Model Experience**

- **75% reduction in tool selection complexity** (15+ tools → 4 tools)
- **Clear action verbs** instead of confusing method names
- **Obvious tool selection**: "I want to create something" → Edit tool
- **Helpful error messages** when wrong combinations are used
- **Consistent parameter patterns** across all operations

##### **Template System Reliability**

- **Single-block templates** (Logseq standard compliance)
- **Proper template insertion** as blocks, not page replacement
- **Clear creation vs insertion** distinction
- **Better integration** with search functionality
- **Variable substitution** with validation

##### **Developer Experience**

- **Consistent patterns** across all operations
- **Extensible design** - easy to add new content types
- **Type safety** with comprehensive validation
- **Production-ready** with idempotency, pagination, error handling
- **Comprehensive documentation** with real-world examples

#### **🛡️ Enhanced Safety & Reliability**

- **Idempotency controls** prevent duplicate operations
- **Dry-run mode** for testing operations without execution
- **Confirmation requirements** for destructive operations
- **Structured error handling** with actionable hints
- **Input validation** and sanitization
- **Rate limiting** and performance controls
- **Atomic operations** with rollback support

#### **📊 Performance & Scalability**

- **Cursor-based pagination** replaces offset-based pagination
- **Hard limits** (100 items max per request) for stability
- **Content truncation** (3-5k chars) for performance
- **Intelligent caching** with TTL-based invalidation
- **Connection pooling** and retry logic
- **Batch processing** capabilities

#### **🔧 Technical Architecture**

- **Unified handlers**: `search-tool.ts`, `get-tool.ts`, `edit-tool.ts`, `delete-tool.ts`
- **Structured schemas**: `unified-types.ts`, `tool-schemas.ts`, `error-codes.ts`
- **Advanced markdown parser** with Logseq syntax preservation
- **Comprehensive validation** and type safety
- **Modular design** for maintainability and extensibility

#### **📚 Documentation Updates**

- **Complete README overhaul** with new architecture examples
- **New API documentation** reflecting 4-tool structure
- **Configuration guide** with advanced features
- **Migration examples** for existing users
- **Real-world scenarios** with tool combinations

---

## [1.0.4] - 2025-08-20

### 🚀 Complete Knowledge Graph Management - Major Feature Enhancement

#### 🌟 Enhanced Search & Discovery

- **Multi-Modal Search**: Enhanced search tool now supports templates, properties, relations, dates, and combined filters
- **Template Discovery**: `templates:*` lists all available templates, `template:"Meeting Template"` finds specific templates
- **Property-Based Search**: `property:status=open`, `properties:page="Project Alpha"` for property discovery and filtering
- **Relationship Analysis**: `backlinks:"Important Topic"`, `references:"Research Topic"` for comprehensive relationship discovery
- **Date-Based Search**: `date:2024-01-01`, `date:today`, `date:last-week`, `date:last-month` for temporal filtering
- **Combined Filters**: `property:status=open AND date:last-week`, `templates:* OR property:type=template` with AND/OR/NOT logic

#### 🎨 Template System

- **`apply_template` Tool**: New tool for template operations with variable substitution
- **Template Discovery**: Automatic detection of available templates in the graph
- **Variable Substitution**: Support for `{{projectName}}` → "My Project" placeholder replacement
- **Multiple Modes**: Replace, append, or prepend content with template application
- **Validation**: Placeholder detection and structure analysis with comprehensive error reporting

#### 🔗 Relationship Management

- **`manage_relations` Tool**: New tool for comprehensive relationship operations
- **Bi-Directional Links**: Create and manage links between pages with automatic reference updates
- **Graph Analysis**: Analyze relationship structure around specific pages with centrality scores
- **Graph Structure**: Get overall graph connectivity patterns and clustering information
- **Link Operations**: Create, remove, and analyze page relationships with detailed metrics

#### 📊 Enhanced Page Retrieval

- **Comprehensive Data**: `get_page` now returns backlinks, outgoing links, and related pages
- **Relationship Metadata**: Reference counts, last referenced timestamps, and connection types
- **Graph Metrics**: Centrality scores, connection counts, and cluster information
- **AI-Powered Relatedness**: Intelligent suggestions for related content with relevance scores

#### 🏷️ Complete Property Management

- **Query Mode**: `set_page_properties` now supports calling without parameters to get current properties
- **Enhanced CRUD**: Upsert/remove properties in one call with comprehensive validation
- **Property Discovery**: Find pages with specific properties using advanced search patterns
- **Fallback Support**: Block-based updates if API fails with graceful degradation

#### 🛡️ Enhanced Safety Controls

- **Explicit Confirmation**: Destructive operations now require `confirmDestroy: true` parameter
- **Enhanced Dry Run**: Detailed previews of what will be deleted/changed before execution
- **Context Awareness**: Shows page content, block counts, and relationships before deletion
- **Comprehensive Validation**: Property type checking and format validation with auto-correction

#### 🔍 Advanced Query Intelligence

- **Pattern Recognition**: Intelligent handling of `"empty"`, `"*"`, and date format patterns
- **Operator Precedence**: Proper AND/OR/NOT logic with correct operator precedence
- **Context Metadata**: Query type detection and filter analysis in search results
- **Performance Optimization**: Efficient handling of complex queries with result caching

#### 🏗️ Technical Architecture

- **Modular Design**: Maintains existing architecture with only 2 new tools added
- **Enhanced Handlers**: `search-handlers.ts`, `template-handlers.ts`, `relation-handlers.ts`
- **Type Safety**: 100% TypeScript compliance with comprehensive type definitions
- **Performance**: Optimized for large graphs with intelligent caching and relationship analysis

---

## [1.0.3] - 2025-08-20

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

## [1.0.2] - 2025-08-20

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
