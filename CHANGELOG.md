# Changelog

## [1.0.0] - 2024-01-01

### Initial Release

#### Features

- **Complete MCP server implementation** for Logseq integration
- **Page Operations**: List, get, create, delete pages with full content access
- **Block Management**: CRUD operations for blocks with property management
- **Search & Query**: Full-text search and DataScript query support
- **Error Handling**: Comprehensive error handling with helpful troubleshooting messages
- **Type Safety**: Full TypeScript implementation with Zod validation
- **Documentation**: Complete setup and usage documentation

#### Supported Tools

- `logseq_list_pages` - List all pages in the graph
- `logseq_get_page` - Get page information
- `logseq_get_page_content` - Get formatted page content
- `logseq_create_page` - Create new pages
- `logseq_delete_page` - Delete pages (with safety checks)
- `logseq_get_block` - Get specific blocks by UUID
- `logseq_create_block` - Create new blocks
- `logseq_update_block` - Update block content
- `logseq_remove_block` - Remove blocks
- `logseq_set_block_property` - Set block properties
- `logseq_remove_block_property` - Remove block properties
- `logseq_search` - Full-text search across the graph
- `logseq_datascript_query` - Execute DataScript queries
- `logseq_get_backlinks` - Find page references
- `logseq_get_current_graph` - Get graph information
- `logseq_get_current_page` - Get currently open page
- `logseq_get_current_block` - Get currently focused block

#### Technical Details

- Built with TypeScript and ES modules
- Uses official MCP SDK for protocol compliance
- Comprehensive input validation with Zod schemas
- Axios for HTTP client with proper error handling
- Support for both Claude Desktop and other MCP clients
