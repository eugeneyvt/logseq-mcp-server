# Core Methods API Reference

This document provides comprehensive documentation for all available core methods in the Logseq MCP Server.

The server uses an advanced **core methods + macros** architecture designed for:

- **Minimum API calls** - Smart batching and atomic operations
- **Maximum precision** - UUID-based operations with strict validation
- **Context awareness** - Graph structure mapping and intelligent placement
- **Format validation** - Automatic normalization and error correction
- **Advanced parsing** - Enhanced markdown parser with Logseq syntax preservation

## 🚀 Markdown Processing

The server features a **comprehensive markdown parser** that provides advanced content processing capabilities.

### Supported Content Types

#### 📝 Text & Formatting
- **Headings**: H1-H6 with proper hierarchy and level detection
- **Paragraphs**: Regular text with inline formatting support
- **Emphasis**: *italic*, **bold**, ~~strikethrough~~ formatting
- **Inline Code**: `code snippets` with proper escaping
- **Links**: [text](url) with title support
- **Images**: ![alt](url) with metadata extraction

#### 📋 Lists & Tasks
- **Unordered Lists**: - item with automatic nesting detection
- **Ordered Lists**: 1. item with proper numbering
- **Task Lists**: - [ ] TODO, - [x] DONE with checkbox states
- **Nested Lists**: Automatic depth detection and hierarchy management

#### 🗂️ Structured Content
- **Tables**: Full table support with headers and cell content
- **Code Blocks**: ```language\ncode``` with language detection
- **Blockquotes**: > quoted content with proper formatting
- **Thematic Breaks**: --- horizontal rules
- **Math**: $$ math expressions $$ and inline $math$

### Logseq Syntax Preservation

The parser automatically detects and preserves Logseq-specific syntax:

#### 🔗 Page Links
```markdown
[[Page Name]] → Automatically detected and preserved
[[Page Name|Display Text]] → Link with custom display text
```

#### 📎 Block References
```markdown
((block-uuid)) → Block reference preservation
((block-uuid "custom text")) → Reference with custom text
```

#### 🏷️ Tags
```markdown
#tag → Automatic tag detection and preservation
#multi-word-tag → Multi-word tag support
```

#### ⚙️ Properties
```markdown
key:: value → Property extraction and preservation
status:: active → Metadata preservation
priority:: high → Structured data handling
```

### Smart Content Processing

#### 🧠 Intelligent Detection
- **Content Type Recognition**: Automatic detection of content types
- **Structure Analysis**: Proper parent-child relationship mapping
- **Format Validation**: Comprehensive validation with auto-correction
- **Nesting Management**: Intelligent handling of nested structures

#### 🔧 Automatic Corrections
- **Format Normalization**: Consistent formatting across content
- **Link Validation**: Automatic link format correction
- **Property Formatting**: Standardized property syntax
- **Content Cleanup**: Removal of excessive whitespace and formatting

#### 📊 Response Format

All parsing operations return detailed information:

```json
{
  "results": [
    {
      "success": true,
      "block": { "id": "uuid", "content": "parsed content" },
      "type": "heading",
      "level": 1,
      "parsedContent": "actual content used"
    }
  ],
  "summary": {
    "originalItems": 3,
    "parsedBlocks": 3,
    "createdBlocks": 3,
    "successfulBlocks": 3
  }
}
```

### Configuration Options

The parser supports configurable behavior:

```typescript
interface ParseConfig {
  allowHtml?: boolean;           // Enable HTML content
  preserveLogseqSyntax?: boolean; // Preserve Logseq-specific syntax
  sanitizeHtml?: boolean;        // Sanitize potentially dangerous HTML
  maxNestingLevel?: number;      // Maximum nesting depth (default: 10)
}
```

### Performance Features

- **AST-based Parsing**: Fast, efficient content processing
- **Memory Optimization**: Efficient memory usage for large documents
- **Caching**: Intelligent caching of parsed results
- **Batch Processing**: Efficient handling of multiple content items

## Method Categories

- [System Information](#system-information)
- [Page Operations](#page-operations)
- [Block Operations](#block-operations)
- [Search & Query](#search--query)
- [Context-Aware Extensions](#context-aware-extensions)
- [Batch & Macro Operations](#batch--macro-operations)
- [Control Parameters](#control-parameters)

## System Information

### `get_system_info`

Get comprehensive system information including Logseq version, graph status, and cache information.

**Parameters:** None

**Returns:** System status and configuration

**Example Usage:**

```
"Show me system information"
"What's the current graph status?"
"Check cache status"
```

**Response Format:**

```json
{
  "ok": true,
  "data": {
    "graph": "My Knowledge Base",
    "userConfigs": {...},
    "serverVersion": "1.0.1",
    "cacheStatus": {
      "graphMap": true,
      "graphMapAge": 180000
    }
  }
}
```

---

## Page Operations

### `ensure_page`

Ensure a page exists with configurable behavior when the page is absent.

**Parameters:**

- `name` (string, required): The name of the page
- `ifAbsent` (enum, optional): Action when page doesn't exist
  - `"create"` (default): Create the page
  - `"error"`: Return error
  - `"skip"`: Skip operation
- `control` (object, optional): Control parameters

**Returns:** Page information or action taken

**Example Usage:**

```
"Ensure page 'Meeting Notes' exists, create if needed"
"Check if 'Project Alpha' page exists, error if not"
```

**Response Format:**

```json
{
  "ok": true,
  "data": {
    "action": "page_created",
    "page": {
      "id": 123,
      "name": "Meeting Notes",
      "journal": false
    }
  }
}
```

---

### `get_page`

Get detailed information about a specific page.

**Parameters:**

- `name` (string, required): The name of the page

**Returns:** Page metadata with comprehensive information

**Example Usage:**

```
"Get information about 'Project Planning'"
"Show details for my daily journal"
```

**Response Format:**

```json
{
  "ok": true,
  "data": {
    "id": 456,
    "name": "Project Planning",
    "originalName": "Project Planning",
    "journal": false,
    "properties": {
      "type": "project",
      "status": "active"
    }
  }
}
```

---

### `set_page_content`

Replace the entire content of a page with **comprehensive markdown parsing** and validation.

**Parameters:**

- `name` (string, required): The name of the page
- `content` (string, required): New content for the page in markdown format
- `control` (object, optional): Control parameters including format validation

**Returns:** Content replacement confirmation with detailed block information

**Example Usage:**

```
"Replace content of 'Daily Standup' with today's agenda"
"Set page content with strict formatting validation"
"Create a project page with structured headings and lists"
```

**Response Format:**

```json
{
  "ok": true,
  "data": {
    "action": "content_set",
    "page": "Daily Standup",
    "blocksCleared": 3,
    "blocksCreated": 5,
    "blocksFailed": 0,
    "contentLength": 1250,
    "blockStructure": [
      { "type": "heading", "success": true, "level": 1 },
      { "type": "list-item", "success": true, "level": 0 }
    ]
  }
}
```

**Features:**

- **Advanced Markdown Parsing**: Comprehensive parsing with Logseq syntax preservation
- **Smart Content Structure**: Automatic detection and handling of headings, lists, tables, code blocks
- **Logseq Syntax Support**: Preserves `[[page links]]`, `((block refs))`, `#tags`, and `key:: value` properties
- **Format Validation**: Automatic normalization and error correction
- **Atomic Operations**: Complete content replacement with rollback support
- **Detailed Reporting**: Comprehensive block creation statistics and structure information

---

### `set_page_properties`

Efficiently manage page properties with batch upsert and remove operations.

**Parameters:**

- `name` (string, required): The name of the page
- `upsert` (object, required): Properties to set or update
- `remove` (array, optional): Property keys to remove
- `control` (object, optional): Control parameters

**Returns:** Property update confirmation

**Example Usage:**

```
"Set page properties: type=project, status=active, priority=high"
"Remove the 'archived' property from the page"
```

**Response Format:**

```json
{
  "ok": true,
  "data": {
    "action": "properties_updated",
    "page": "Project Alpha",
    "updated": ["type", "status"],
    "removed": ["archived"]
  }
}
```

---

## Block Operations

### `append_blocks`

Add multiple blocks to a page with **comprehensive markdown parsing** and precise positioning control.

**Parameters:**

- `page` (string, required): Target page name
- `items` (array, required): Array of block items to append
  - `content` (string, required): Block content in markdown format
  - `parentUuid` (string, optional): Parent block UUID
  - `position` (number, optional): Position index
  - `refUuid` (string, optional): Reference block UUID
  - `properties` (object, optional): Block properties
- `control` (object, optional): Control parameters

**Returns:** Enhanced response with detailed parsing and creation information

**Example Usage:**

```
"Append structured meeting notes with agenda items and action items"
"Add multiple TODO blocks with different priorities"
"Create a project outline with headings and nested lists"
```

**Response Format:**

```json
{
  "ok": true,
  "data": {
    "results": [
      {
        "success": true,
        "block": { "id": "uuid-1", "content": "Agenda item 1" },
        "type": "paragraph",
        "level": 0,
        "parsedContent": "Agenda item 1"
      }
    ],
    "summary": {
      "originalItems": 1,
      "parsedBlocks": 1,
      "createdBlocks": 1,
      "successfulBlocks": 1
    }
  }
}
```

**Features:**

- **Advanced Markdown Parsing**: Uses comprehensive parser with Logseq syntax preservation
- **Smart Content Detection**: Automatic recognition of headings, lists, tables, code blocks, etc.
- **Logseq Syntax Support**: Preserves `[[page links]]`, `((block refs))`, `#tags`, and `key:: value` properties
- **Consistent Block Creation**: Uses the same parsing engine as `set_page_content`
- **Detailed Results**: Comprehensive response with parsing statistics and block metadata
- **Format Validation**: Automatic content normalization and error correction
- **Batch Processing**: Efficient handling of multiple blocks with atomic operations

---

### `update_block`

Update block content by UUID with validation and cache management.

**Parameters:**

- `uuid` (string, required): Block UUID
- `content` (string, required): New block content
- `control` (object, optional): Control parameters

**Returns:** Updated block information

**Example Usage:**

```
"Update block abc-123 with new task description"
"Change block content with format validation"
```

**Response Format:**

```json
{
  "ok": true,
  "data": {
    "action": "block_updated",
    "block": {
      "id": "abc-123",
      "content": "Updated task description",
      "page": { "name": "Daily Journal" }
    }
  }
}
```

**Features:**

- UUID-based precision operations
- Content format validation
- Automatic cache invalidation
- Support for dry-run previews

---

### `move_block`

Move blocks to new parents with positioning and reference management.

**Parameters:**

- `uuid` (string, required): Block UUID to move
- `newParentUuid` (string, required): New parent block UUID
- `position` (number, optional): Position under new parent
- `refUuid` (string, optional): Reference block for positioning
- `control` (object, optional): Control parameters

**Returns:** Move operation confirmation

**Example Usage:**

```
"Move task block to different project section"
"Reorganize blocks with specific positioning"
```

---

## Search & Query

### `search`

Enhanced search with scoping, pagination, and intelligent result ranking.

**Parameters:**

- `q` (string, required): Search query
- `scope` (enum, optional): Search scope
  - `"all"` (default): Search everything
  - `"pages"`: Search only page names
  - `"blocks"`: Search only block content
  - `"current-page"`: Search current page only
- `cursor` (string, optional): Pagination cursor
- `limit` (number, optional): Maximum results (default: 50)

**Returns:** Search results with metadata

**Example Usage:**

```
"Search for 'machine learning' in all content"
"Find pages with 'project' in the name"
"Search current page for 'TODO'"
```

**Response Format:**

```json
{
  "ok": true,
  "data": {
    "query": "machine learning",
    "scope": "all",
    "results": [...],
    "count": 12,
    "hasMore": false
  }
}
```

**Features:**

- Intelligent scoping for focused searches
- DataScript query integration
- Fallback search mechanisms
- Performance optimization with result limits

---

## Context-Aware Extensions

### `build_graph_map`

Build or refresh the comprehensive graph structure cache for context-aware operations.

**Parameters:**

- `refresh` (boolean, optional): Force refresh of cached data (default: false)

**Returns:** Graph structure with statistics

**Example Usage:**

```
"Build graph map for context awareness"
"Refresh the graph structure cache"
```

**Response Format:**

```json
{
  "ok": true,
  "data": {
    "pages": [
      {
        "name": "Project Alpha",
        "id": 123,
        "prefixes": ["Projects"],
        "tags": ["work", "priority"],
        "journal": false,
        "lastModified": 1640995200000
      }
    ],
    "generatedAt": 1640995200000,
    "stats": {
      "totalPages": 142,
      "journalPages": 30,
      "taggedPages": 85
    }
  }
}
```

**Features:**

- Automatic session initialization
- Performance metrics tracking
- Intelligent caching (5-minute TTL)
- Page organization analysis

---

### `suggest_placement`

AI-powered content placement suggestions based on intent analysis and graph structure.

**Parameters:**

- `intent` (string, required): Purpose or intent of the content
- `title` (string, required): Content title
- `keywords` (array, optional): Keywords for matching
- `preferBranch` (string, optional): Preferred page branch/namespace
- `control` (object, optional): Control parameters

**Returns:** Placement suggestions with confidence scores

**Example Usage:**

```
"Suggest where to place meeting notes about project review"
"Find best location for technical documentation"
```

**Response Format:**

```json
{
  "ok": true,
  "data": {
    "suggestedPage": "Project Reviews",
    "confidence": 0.85,
    "reasoning": "Best match based on: title similarity, keyword match: project",
    "alternatives": [
      {
        "page": "Meeting Notes",
        "confidence": 0.72,
        "reason": "content type match"
      }
    ]
  }
}
```

**Features:**

- Intent analysis and semantic matching
- Confidence scoring for reliability
- Alternative suggestions
- Branch preference support

---

### `plan_content`

Create dry-run content plans with multiple strategies and complexity analysis.

**Parameters:**

- `title` (string, required): Content title
- `outline` (array, optional): Content outline
- `intent` (string, optional): Content purpose
- `control` (object, optional): Control parameters

**Returns:** Content creation plan with alternatives

**Example Usage:**

```
"Plan content structure for quarterly review"
"Create implementation plan for new feature documentation"
```

---

## Batch & Macro Operations

### `batch`

Execute multiple operations atomically with rollback support and comprehensive error handling.

**Parameters:**

- `ops` (array, required): Operations to execute
  - `type` (string): Operation type
  - `params` (object): Operation parameters
  - `id` (string, optional): Operation ID for referencing
- `atomic` (boolean, optional): Execute atomically (default: true)
- `control` (object, optional): Control parameters

**Returns:** Batch execution results

**Example Usage:**

```
"Execute page creation and content addition atomically"
"Batch multiple block updates with rollback support"
```

**Response Format:**

```json
{
  "ok": true,
  "data": {
    "action": "batch_executed",
    "success": true,
    "totalOps": 3,
    "completedOps": 3,
    "errors": 0,
    "results": [...]
  }
}
```

**Features:**

- Atomic transaction support
- Individual operation tracking
- Automatic rollback on failure
- Idempotency key support

---

### `upsert_page_outline`

Create or update page outlines with hierarchical structure in a single operation.

**Parameters:**

- `name` (string, required): Page name
- `outline` (array, required): Outline items
- `replace` (boolean, optional): Replace existing content (default: false)
- `control` (object, optional): Control parameters

**Returns:** Outline creation results

**Example Usage:**

```
"Create structured page outline for project documentation"
"Update page with hierarchical content structure"
```

---

## Control Parameters

All core methods support advanced control parameters for fine-tuned behavior:

### Standard Control Parameters

```json
{
  "control": {
    "dryRun": false,
    "strict": true,
    "idempotencyKey": "unique-key",
    "maxOps": 100,
    "autofixFormat": true
  }
}
```

**Parameter Details:**

- **`dryRun`** (boolean): Preview operations without executing
  - `true`: Return what would happen without making changes
  - `false` (default): Execute the operation

- **`strict`** (boolean): Enable strict validation mode
  - `true` (default): Enforce format validation and requirements
  - `false`: Allow more lenient validation

- **`idempotencyKey`** (string): Prevent duplicate operations
  - Unique identifier for operation deduplication
  - Same key returns cached result if operation already completed

- **`maxOps`** (number): Limit operation scope
  - Default: 100
  - Prevents runaway operations and ensures performance

- **`autofixFormat`** (boolean): Automatic format correction
  - `true` (default): Automatically fix common formatting issues
  - `false`: Return validation errors instead

## Error Handling

All methods return standardized error responses with actionable hints:

### Error Response Format

```json
{
  "ok": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Page 'Missing Page' not found",
    "hint": "Use ensure_page to create the page first"
  }
}
```

### Standard Error Codes

- `NOT_FOUND`: Resource doesn't exist
- `VALIDATION_ERROR`: Input validation failed
- `CONFLICT`: Operation conflicts with existing state
- `LIMIT_EXCEEDED`: Operation exceeds configured limits
- `BAD_QUERY`: Query syntax or logic is invalid
- `INTERNAL`: Internal server error

## Performance Features

### Intelligent Caching

- Page listings: 3 minutes
- Page content: 5 minutes
- Block content: 3 minutes
- Graph maps: 5 minutes

### Connection Management

- Persistent HTTP connections
- Automatic retry with exponential backoff
- Connection pooling and reuse
- Request deduplication

### Monitoring

- Real-time performance metrics
- Cache hit/miss rates
- Operation timing
- Error rate tracking

## Security & Privacy

### Built-in Protections

- Local-only operations (no external data transmission)
- Comprehensive input validation and sanitization
- API token security with automatic redaction
- Error message sanitization

### Safe Operations

- Dry-run mode for testing
- Atomic operations with rollback
- Idempotency protection
- Operation limits and safeguards

## Best Practices

### For Optimal Performance

1. Use `build_graph_map` at session start
2. Leverage batch operations for multiple changes
3. Use UUID-based operations when possible
4. Enable caching for frequently accessed content

### For Reliability

1. Always use error handling with proper codes
2. Implement retry logic for transient failures
3. Use dry-run mode for testing operations
4. Monitor operation limits and adjust as needed

### For Content Quality

1. Enable `autofixFormat` for automatic corrections
2. Use `strict` mode for validation
3. Leverage `suggest_placement` for organization
4. Use `plan_content` for complex content creation
