# API Reference

This document provides comprehensive documentation for the **unified 4-tool architecture** in Logseq MCP v1.0.0-beta.1.

The server uses an innovative **4-tool unified architecture** that dramatically simplifies AI tool selection while providing comprehensive Logseq operations:

- **🎯 4 Clear Action Verbs** - Search, Get, Edit, Delete for intuitive tool selection
- **🔧 Maximum Precision** - UUID-based operations with strict validation
- **🛡️ Enhanced Safety** - Idempotency controls, dry-run mode, confirmation requirements
- **📊 Advanced Features** - Pagination, filtering, error handling, content validation
- **🎨 Template Excellence** - Single-block enforcement and proper variable substitution

## 🚀 Markdown Processing

The server features a **comprehensive markdown parser** that provides advanced content processing capabilities.

### Supported Content Types

#### 📝 Text & Formatting

- **Headings**: H1-H6 with proper hierarchy and level detection
- **Paragraphs**: Regular text with inline formatting support
- **Emphasis**: _italic_, **bold**, ~~strikethrough~~ formatting
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
- **Code Blocks**: `language\ncode` with language detection
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
  allowHtml?: boolean; // Enable HTML content
  preserveLogseqSyntax?: boolean; // Preserve Logseq-specific syntax
  sanitizeHtml?: boolean; // Sanitize potentially dangerous HTML
  maxNestingLevel?: number; // Maximum nesting depth (default: 10)
}
```

### Performance Features

- **AST-based Parsing**: Fast, efficient content processing
- **Memory Optimization**: Efficient memory usage for large documents
- **Caching**: Intelligent caching of parsed results
- **Batch Processing**: Efficient handling of multiple content items

## Tool Categories

- [🔍 Search Tool](#search-tool) - Advanced multi-modal search and discovery
- [📖 Get Tool](#get-tool) - Unified content retrieval with full details
- [✏️ Edit Tool](#edit-tool) - Content creation, modification, and movement
- [🗑️ Delete Tool](#delete-tool) - Safe content removal with impact analysis
- [🎛️ Control Parameters](#control-parameters) - Advanced safety and behavior controls

## 🔍 Search Tool

### Overview

The Search tool provides advanced multi-modal discovery with sophisticated filtering and pagination.

**Purpose**: Comprehensive search across all Logseq content types with intelligent query processing and cursor-based pagination.

### Parameters Schema

```typescript
{
  // What to search
  target?: "pages" | "blocks" | "templates" | "both" // default: "both"
  query?: string // Free-text search, exact phrases with quotes

  // Advanced filtering
  filter?: {
    // Date filters (ISO 8601)
    createdAfter?: string        // "2025-01-01T00:00:00Z"
    createdBefore?: string
    updatedAfter?: string
    updatedBefore?: string
    scheduledOn?: string         // "2025-01-15" (date only)
    deadlinedOn?: string         // "2025-01-15" (date only)

    // Tag filters
    tags_any?: string[]          // has any of these tags
    tags_all?: string[]          // has all of these tags

    // Property filters
    properties_all?: Record<string, any>  // must have all these properties
    properties_any?: Record<string, any>  // must have any of these properties

    // Content filters
    contains?: string            // content must contain this text
    exclude?: string             // content must not contain this text
    lengthMin?: number           // minimum content length
    lengthMax?: number           // maximum content length

    // Task-specific filters
    todoState?: "TODO" | "DOING" | "DONE" | "WAITING" | "LATER" | "NOW" | "CANCELED"

    // Relationship filters
    backlinks_of_page_title?: string    // pages that link to this page
    linked_to_page_title?: string       // pages that this page links to
    hasRefs?: boolean                    // has any references
  }

  // Result control
  sort?: "relevance" | "created" | "updated" | "title" | "page_title" | "deadline" | "scheduled" | "length"
  order?: "asc" | "desc"               // default: "desc"
  limit?: number                       // 1-100, default: 20
  cursor?: string                      // opaque pagination cursor
}
```

### Advanced Query Types

#### Template Discovery
```
"templates:*"                    // List all available templates
"template:\"Meeting Template\""  // Find specific template
```

#### Property-Based Search
```
"property:status=open"           // Find pages with specific properties
"properties:page=\"Project Alpha\"" // Get all properties for a page
```

#### Relationship Analysis
```
"backlinks:\"Important Topic\""  // Find pages that reference this
"references:\"Research Topic\""   // Find all references and mentions
```

Notes:
- Relation and backlink analysis apply safe internal caps (default limit: 500). When limits are reached, results may be truncated.

#### Date-Based Search
```
"date:2024-01-01"               // Specific date
"date:today"                     // Today's content
"date:last-week"                 // Last week's content
"date:last-month"                // Last month's content
```

#### Combined Filters
```
"property:status=open AND date:last-week"  // Multiple conditions
"templates:* OR property:type=template"    // OR logic
"property:priority=high AND NOT archived"  // NOT operator
```

### Response Format

```json
{
  "ok": true,
  "data": {
    "query": "machine learning",
    "target": "both",
    "queryType": "text",
    "results": [...],
    "count": 12,
    "hasMore": false,
    "next_cursor": "eyJwYWdlIjoxfQ==",
    "metadata": {
      "queryType": "text",
      "filtersApplied": ["date", "property"],
      "dateRange": null
    }
  }
}
```

---

## 📖 Get Tool

### Overview

The Get tool provides unified content retrieval with full details, context, and comprehensive metadata.

**Purpose**: Retrieve specific content with full details and context across all Logseq types.

### Parameters Schema

```typescript
{
  type: "page" | "block" | "template" | "properties" | "relations" | "tasks" | "system" | "graph"
  target: string | string[]    // identifier(s) - page titles, block UUIDs, etc.

  // Include options
  include?: {
    children?: boolean         // include child blocks
    properties?: boolean       // include properties
    backlinks?: boolean        // include backlink information
    content?: boolean          // include full content vs summary
  }

  // Format options
  format?: "tree" | "flat"     // for hierarchical content
  depth?: number               // relationship/hierarchy depth (1-5)
  preview_length?: number      // text preview max chars (default: 500)
}
```

### Supported Type Operations

#### Page Retrieval
**Purpose**: Get page content, properties, backlinks, children, and graph metrics

- `target`: page title
- `include.children`: get all blocks
- `include.backlinks`: get pages linking to this page
- Returns comprehensive page metadata with relationship analysis

#### Block Retrieval
**Purpose**: Get block details, children, properties, and context

- `target`: block UUID
- `include.children`: get child blocks
- `format`: tree vs flat representation
- Returns block content with hierarchical information

#### Template Retrieval
**Purpose**: Get template definition, placeholders, and usage examples

- `target`: template name
- Includes placeholder analysis and variable requirements
- Returns template structure with validation information

#### Properties Retrieval
**Purpose**: Get page/block properties with metadata

- `target`: page title or block UUID
- Returns all properties with types and modification dates
- Provides property schema and validation information

#### Relations Retrieval
**Purpose**: Get page relationships and graph connections

- `target`: page title
- `depth`: how many relationship hops to traverse
- Returns backlinks, outgoing links, related pages with relevance scores

#### Tasks Retrieval
**Purpose**: Get task details, state, scheduling information

- `target`: block UUID or page title
- Returns task state, scheduling, dependencies
- Provides task lifecycle and status information

#### System Retrieval
**Purpose**: Get system information and health status

- No target required
- Returns Logseq version, API status, graph statistics
- Provides server health and configuration information

#### Graph Retrieval
**Purpose**: Get graph structure and analytics

- `target`: optional focus page
- Returns graph metrics, clusters, important pages
- Provides graph structure analysis and connectivity patterns

### Response Format

```json
{
  "ok": true,
  "data": {
    "type": "page",
    "target": "Project Alpha",
    "content": "...",
    "properties": {...},
    "relationships": {
      "backlinks": [...],
      "outgoingLinks": [...],
      "relatedPages": [...]
    },
    "graphMetrics": {
      "centralityScore": 0.8,
      "connectionCount": 15
    },
    "metadata": {
      "created": "2024-01-15T10:00:00Z",
      "modified": "2024-01-20T14:30:00Z",
      "version": 5
    }
  }
}
```

---

## ✏️ Edit Tool

### Overview

The Edit tool enables content creation, modification, and movement across all Logseq types with comprehensive validation and safety controls.

**Purpose**: Create, update, append, prepend, move content with type+operation validation and template system fixes.

### Parameters Schema

```typescript
{
  type: "page" | "block" | "template" | "properties" | "relations" | "tasks"
  operation: "create" | "update" | "append" | "prepend" | "move" | "remove"
  target: string              // identifier

  // Content and positioning
  content?: any               // operation-specific content
  position?: {                // for move operations
    after_block_id?: string
    before_block_id?: string
    parent_block_id?: string
    index?: number
  }

  // Type-specific parameters
  variables?: Record<string, any>    // for template operations
  templateName?: string              // for template insertion
  taskState?: string                 // for task operations
  linkContext?: string               // for relation operations
  propertyKey?: string               // for property operations
  propertyValue?: any                // for property operations

  // Safety and control
  dryRun?: boolean                   // validate without executing
  idempotencyKey?: string            // for safe retries
  confirmDestroy?: boolean           // required true for operation="remove"

  // Standard controls
  control?: {
    strict?: boolean
    autofixFormat?: boolean
    maxOps?: number
  }
}
```

### Valid Type + Operation Combinations

#### Page Operations
- **create**: Create new page with initial content
- **update**: Replace entire page content
- **append**: Add content to end of page
- **prepend**: Add content to beginning of page

#### Block Operations
- **create**: Create new block at specified position
- **update**: Update existing block content
- **move**: Move block to new position
- **append**: Add child block
- **prepend**: Add block before others

#### Template Operations (Single-Block Enforced)
- **create**: Create new single-block template (enforced)
- **update**: Update template definition
- **append**: Insert template into target location

#### Properties Operations
- **create**: Add new property (alias for update)
- **update**: Set/update property value
- **remove**: Remove property (via operation="remove")
  - Note: When targeting a page, the operation resolves the page’s root block UUID; the page must already exist.

#### Relations Operations
- **create**: Create link between pages
- **remove**: Remove link between pages
- **update**: Update link context/metadata
  - Notes: Source resolves to a block UUID for content updates; visible links are de-duplicated and context is sanitized.

#### Tasks Operations
- **create**: Create new task block
- **update**: Update task content or state
- **move**: Move task to different location

### Template System Features

#### Single-Block Rule Enforcement
- Templates MUST be created as single blocks only
- Multi-line content joined with newlines within single block
- Validation rejects multi-block templates with clear error
- Template insertion always creates single block

#### Template Creation Process
1. Validate content is single block
2. Create template page with proper properties
3. Add template block with normalized placeholders
4. Return template info with placeholder analysis

#### Template Insertion Process
1. Find template by name
2. Substitute variables in content
3. Insert as single block at target position
4. Return insertion confirmation

### Response Format

```json
{
  "ok": true,
  "data": {
    "operation": "create",
    "type": "page",
    "target": "New Project",
    "action": "page_created",
    "blocksCreated": 3,
    "contentLength": 1250,
    "validation": {
      "success": true,
      "warnings": [],
      "errors": []
    }
  }
}
```

---

## 🗑️ Delete Tool

### Overview

The Delete tool provides safe content removal with comprehensive safety controls and impact analysis.

**Purpose**: Remove content with confirmation requirements, impact analysis, and recovery options.

### Parameters Schema

```typescript
{
  type: "page" | "block" | "template" | "properties" | "relations" | "tasks"
  target: string | string[]

  // Safety controls (required)
  confirmDestroy: boolean      // explicit confirmation required

  // Deletion options
  cascade?: boolean            // delete dependent content
  softDelete?: boolean         // move to trash instead of permanent delete
  simulate?: boolean           // show what would be deleted without doing it

  // Standard controls
  control?: {
    idempotencyKey?: string
    maxOps?: number
  }
}
```

### Supported Deletion Types

#### Page Deletion
- Warns about orphaned backlinks
- Option to cascade delete or just remove references
- Shows child block count before deletion

#### Block Deletion
- Shows child block count before deletion
- Option to preserve or delete child blocks
- Updates parent references automatically

#### Template Deletion
- Shows usage count if template is referenced
- Prevents deletion of widely-used templates without confirmation
- Validates template dependencies

#### Properties Deletion
- Shows current property values before deletion
- Batch deletion support
- Preserves property history

#### Relations Deletion
- Shows impact on graph connectivity
- Option to delete bidirectional links
- Updates relationship metrics

#### Tasks Deletion
- Preserves task history in deletion log
- Shows task state and dependencies before deletion
- Updates task references

### Safety Features

#### Pre-deletion Analysis
- Impact assessment (what else will be affected)
- Dependency warnings (orphaned content)
- Usage statistics (how often referenced)

#### Confirmation Requirements
- `confirmDestroy: true` required for all deletions
- Additional confirmation for high-impact deletions
- Simulation mode to preview deletions

#### Soft Delete Option
- Move to designated trash page instead of permanent deletion
- Preserve content with deletion metadata
- Recovery option for accidental deletions

### Response Format

```json
{
  "ok": true,
  "data": {
    "operation": "delete",
    "type": "page",
    "target": "Old Project",
    "action": "page_deleted",
    "confirmDestroy": true,
    "cascade": false,
    "softDelete": true,
    "impact": {
      "orphanedBacklinks": 3,
      "childBlocks": 15,
      "warnings": ["3 backlinks will be orphaned"]
    }
  }
}
```

---

## 🎛️ Control Parameters

All tools support advanced control parameters for fine-tuned behavior and safety:

### Standard Control Parameters

```typescript
{
  control?: {
    dryRun?: boolean          // Preview operations without executing (Edit tool)
    strict?: boolean          // Enable/disable format validation (Edit tool)
    autofixFormat?: boolean   // Automatically fix common formatting issues (Edit tool)
    idempotencyKey?: string   // Prevent duplicate operations with safe retries
    maxOps?: number           // Limit operation scope for safety (default: 100)
    confirmDestroy?: boolean  // Require explicit confirmation for destructive operations (Delete tool)
  }
}
```

### Parameter Details

- **`dryRun`** (boolean): Preview operations without executing
  - `true`: Return what would happen without making changes
  - `false` (default): Execute the operation
  - Available on: Edit tool

- **`strict`** (boolean): Enable strict validation mode
  - `true` (default): Enforce format validation and requirements
  - `false`: Allow more lenient validation
  - Available on: Edit tool

- **`idempotencyKey`** (string): Prevent duplicate operations
  - Unique identifier for operation deduplication
  - Same key returns cached result if operation already completed
  - Available on: Edit tool, Delete tool

- **`maxOps`** (number): Limit operation scope
  - Default: 100
  - Prevents runaway operations and ensures performance
  - Available on: All tools

- **`autofixFormat`** (boolean): Automatic format correction
  - `true` (default): Automatically fix common formatting issues
  - `false`: Return validation errors instead
  - Available on: Edit tool

- **`confirmDestroy`** (boolean): Require explicit confirmation for destructive operations
  - `true`: Require explicit confirmation before deletion/destructive changes
  - `false` (default): Allow destructive operations without confirmation
  - Available on: Delete tool

---

## Structured Error Handling

All tools return standardized error responses with actionable hints:

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

- **`NOT_FOUND`**: Resource doesn't exist
- **`INVALID_ARGUMENT`**: Parameter validation failed
- **`INVALID_COMBINATION`**: Incompatible type+operation
- **`RATE_LIMITED`**: Too many requests
- **`PERMISSION_DENIED`**: Access forbidden
- **`CONFLICT`**: Operation conflicts with current state
- **`TOO_MUCH_DATA`**: Result set too large
- **`TEMPLATE_INVALID`**: Template format or structure invalid
- **`GRAPH_CONSISTENCY`**: Graph integrity violation

---

## Performance Features

### Intelligent Caching

- **Page listings**: 3 minutes TTL
- **Content**: 5 minutes TTL
- **Blocks**: 3 minutes TTL
- **Graph maps**: 5 minutes TTL

### Connection Management

- **Persistent HTTP connections**
- **Automatic retry with exponential backoff**
- **Request deduplication**
- **Connection pooling**

### Monitoring

- **Real-time performance metrics**
- **Cache hit/miss rates**
- **Operation timing**
- **Error rate tracking**

---

## Best Practices

### For Optimal Performance

1. **Use appropriate tools**: Search for discovery, Get for retrieval, Edit for changes, Delete for removal
2. **Leverage filtering**: Use advanced filters to narrow results instead of client-side filtering
3. **Batch operations**: Use Edit tool with multiple operations when possible
4. **Enable caching**: Use cached results for frequently accessed content
5. **Pagination awareness**: Use cursors for large result sets

### For Reliability

1. **Always use error handling**: Implement proper error handling with error codes
2. **Use dry-run mode**: Test operations before execution
3. **Implement retry logic**: Handle transient failures with exponential backoff
4. **Monitor operation limits**: Respect maxOps limits and adjust as needed
5. **Use idempotency keys**: Prevent duplicate operations with safe retries

### For Content Quality

1. **Enable autofixFormat**: Automatically fix common formatting issues
2. **Use strict mode**: Enforce format validation for consistency
3. **Leverage template system**: Use single-block templates with proper variable substitution
4. **Validate before execution**: Use dry-run to catch issues before making changes
