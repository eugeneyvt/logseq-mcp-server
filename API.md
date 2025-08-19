# API Reference

This document provides comprehensive documentation for all available MCP tools in the Logseq MCP Server.

## Tool Categories

- [Page Operations](#page-operations)
- [Block Operations](#block-operations)
- [Search & Query Operations](#search--query-operations)

## Page Operations

### `logseq_list_pages`

List all pages in your Logseq graph.

**Parameters:** None

**Returns:** Formatted text with page list

**Example Usage:**

```
"List all my pages"
"Show me all the pages in my graph"
"What pages do I have?"
```

**Response Format:**

```
Found 142 pages:

- Daily Journal
- Project Planning (journal)
- Meeting Notes
- Research Ideas
...
```

---

### `logseq_get_page`

Get detailed information about a specific page.

**Parameters:**

- `name` (string, required): The name of the page to retrieve

**Returns:** Page metadata including ID, properties, and journal status

**Example Usage:**

```
"Get information about my 'Project Planning' page"
"Show me details for the 'Meeting Notes' page"
```

**Response Format:**

```
Page: Project Planning
ID: 123
Journal: false
Properties: {
  "type": "project",
  "status": "active",
  "created": "2024-01-15"
}
```

---

### `logseq_get_page_content`

Get the full content of a page formatted as markdown.

**Parameters:**

- `name` (string, required): The name of the page to get content for

**Returns:** Full page content with proper markdown formatting and indentation

**Example Usage:**

```
"Show me the content of my daily journal"
"What's in my 'Research Ideas' page?"
```

**Response Format:**

```
# Daily Journal

- Morning standup meeting
  - Discussed project timeline
  - Assigned new tasks
- Afternoon focus work
  - Completed feature implementation
  - Updated documentation
```

---

### `logseq_create_page`

Create a new page in your Logseq graph.

**Parameters:**

- `name` (string, required): The name of the page to create
- `content` (string, optional): Initial content for the page
- `properties` (object, optional): Properties to set on the page

**Returns:** Success confirmation with page ID

**Example Usage:**

```
"Create a new page called 'Meeting Notes' with today's agenda"
"Make a page named 'Book Reviews' with a reading list"
```

**Response Format:**

```
Successfully created page "Meeting Notes" with ID 456.
```

**Notes:**

- Will not overwrite existing pages
- Content is added as the first block if provided
- Properties are set as page-level metadata

---

### `logseq_delete_page`

Delete a page from your Logseq graph.

**Parameters:**

- `name` (string, required): The name of the page to delete

**Returns:** Success confirmation

**Example Usage:**

```
"Delete the page 'Old Draft'"
"Remove the 'Temporary Notes' page"
```

**Response Format:**

```
Successfully deleted page "Old Draft".
```

**⚠️ Warning:** This operation is irreversible. The page and all its content will be permanently removed.

## Block Operations

### `logseq_get_block`

Get a specific block by its UUID.

**Parameters:**

- `blockId` (string, required): The UUID of the block to retrieve

**Returns:** Block content and metadata

**Example Usage:**

```
"Get block 550e8400-e29b-41d4-a716-446655440000"
"Show me the block with ID abc123..."
```

---

### `logseq_create_block`

Create a new block under a page or another block.

**Parameters:**

- `parent` (string, required): Parent page name or block UUID
- `content` (string, required): The content of the new block
- `properties` (object, optional): Properties to set on the block
- `sibling` (boolean, optional): Insert as sibling instead of child (default: false)

**Returns:** Created block details

**Example Usage:**

```
"Add a task 'Buy groceries' to my today's journal"
"Create a block under 'Project Planning' with meeting notes"
```

**Response Format:**

```
Successfully created block with ID 789 under "Daily Journal".
```

---

### `logseq_update_block`

Update the content of an existing block.

**Parameters:**

- `blockId` (string, required): The UUID of the block to update
- `content` (string, required): The new content for the block

**Returns:** Success confirmation

**Example Usage:**

```
"Update block abc123 to say 'Meeting postponed to tomorrow'"
"Change the content of that block to include priority tag"
```

---

### `logseq_set_block_property`

Set a property on a specific block.

**Parameters:**

- `blockId` (string, required): The UUID of the block
- `key` (string, required): The property key to set
- `value` (any, required): The value to assign to the property

**Returns:** Success confirmation

**Example Usage:**

```
"Set the priority property of block abc123 to 'high'"
"Add a due-date property to that task block"
```

**Common Properties:**

- `priority`: "high", "medium", "low"
- `due-date`: ISO date string
- `status`: "todo", "doing", "done"
- `tags`: Array of tag strings

---

### `logseq_remove_block_property`

Remove a property from a specific block.

**Parameters:**

- `blockId` (string, required): The UUID of the block
- `key` (string, required): The property key to remove

**Returns:** Success confirmation

---

### `logseq_delete_block`

Delete a block and all its children.

**Parameters:**

- `blockId` (string, required): The UUID of the block to delete

**Returns:** Success confirmation

**⚠️ Warning:** This will delete the block and ALL child blocks recursively.

## Search & Query Operations

### `logseq_search`

Search across all pages and blocks in your graph.

**Parameters:**

- `query` (string, required): The search term or phrase
- `limit` (number, optional): Maximum number of results to return (default: 50)

**Returns:** List of matching pages and blocks with context

**Example Usage:**

```
"Search for all mentions of 'machine learning'"
"Find blocks containing 'project deadline'"
"Look for pages about 'React hooks'"
```

**Response Format:**

```
Found 8 results for "machine learning":

Pages:
- AI Research Notes
- Technology Trends 2024

Blocks:
- [Daily Journal] Machine learning models are improving rapidly...
- [Book Notes] The book covers machine learning fundamentals...
```

---

### `logseq_datascript_query`

Execute advanced DataScript queries for complex graph analysis.

**Parameters:**

- `query` (string, required): DataScript query in EDN format

**Returns:** Query results in structured format

**Example Usage:**

```
"Find all TODO blocks created this week"
"Show me pages that link to 'Project Alpha'"
"Get all blocks with high priority"
```

**Query Examples:**

#### Find all TODO blocks

```clojure
[:find (pull ?block [*])
 :where
 [?block :block/marker "TODO"]]
```

#### Find pages created recently

```clojure
[:find ?page-name ?created
 :where
 [?page :block/name ?page-name]
 [?page :block/created-at ?created]
 [(> ?created 1640995200000)]]
```

#### Find blocks with specific properties

```clojure
[:find (pull ?block [:block/content :block/properties])
 :where
 [?block :block/properties ?props]
 [(get ?props :priority) ?priority]
 [(= ?priority "high")]]
```

---

### `logseq_get_backlinks`

Find all pages and blocks that reference a specific page.

**Parameters:**

- `pageName` (string, required): The name of the target page

**Returns:** List of pages and blocks that link to the target page

**Example Usage:**

```
"Show me what pages link to 'Project Alpha'"
"Find all references to my 'Book Notes' page"
"What links to the 'Daily Standup' template?"
```

**Response Format:**

```
Found 12 references to "Project Alpha":

Pages linking to "Project Alpha":
- Team Meeting Notes
- Q1 Planning
- Resource Allocation

Blocks mentioning "Project Alpha":
- [Daily Journal] Discussed Project Alpha timeline
- [Weekly Review] Project Alpha is ahead of schedule
```

## Error Handling

All tools implement comprehensive error handling:

### Common Error Types

1. **Validation Errors**
   - Invalid page names or block IDs
   - Malformed DataScript queries
   - Missing required parameters

2. **Connection Errors**
   - Logseq not running or HTTP API disabled
   - Network connectivity issues
   - API endpoint unreachable

3. **Authentication Errors**
   - Invalid or expired API token
   - Insufficient permissions

4. **Not Found Errors**
   - Page or block doesn't exist
   - Invalid references

### Error Response Format

```
Error: Page "Non-existent Page" not found.

Please check:
- Page name spelling and capitalization
- Page exists in your Logseq graph
- Logseq is running with HTTP API enabled
```

## Rate Limiting

To prevent API abuse, the server implements rate limiting:

- **Default Limit**: 100 requests per minute per client
- **Configurable**: Via `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW` environment variables
- **Graceful Handling**: Requests are queued when limits are exceeded

## Caching

The server implements intelligent caching for optimal performance:

### Cache Durations

- **Page lists**: 3 minutes
- **Page content**: 5 minutes
- **Block content**: 3 minutes
- **Search results**: 2 minutes (varies by complexity)

### Cache Invalidation

- Automatic invalidation when content is modified
- Manual cache clearing on server restart
- TTL-based expiration for all cached data

## Security Features

### Input Validation

All inputs are validated and sanitized:

- Page names checked for invalid characters
- Block content filtered for potential security issues
- DataScript queries validated for dangerous patterns
- API tokens verified for proper format

### Data Privacy

- All operations are local-only (no external data transmission)
- API tokens automatically redacted from logs
- Error messages sanitized to prevent information disclosure
- No sensitive data stored in cache

## Performance Optimization

### Connection Management

- Persistent HTTP connections with keep-alive
- Automatic connection pooling
- Intelligent retry logic with exponential backoff

### Request Optimization

- Request deduplication for concurrent identical requests
- Batch processing where possible
- Memory-efficient data structures

### Monitoring

Built-in performance monitoring includes:

- Request/response timing
- Cache hit/miss rates
- Error rates and types
- Memory usage and cleanup

## Best Practices

### For Optimal Performance

1. Use specific page names rather than searching when possible
2. Limit search results for large graphs
3. Cache frequently accessed content at the application level
4. Use block IDs for direct block access when available

### For Reliability

1. Implement error handling in your MCP client
2. Use reasonable timeouts for long-running operations
3. Monitor connection status and retry on failures
4. Validate inputs before sending to the server

### For Security

1. Keep API tokens secure and rotate regularly
2. Use rate limiting in shared environments
3. Validate all user inputs before processing
4. Monitor logs for suspicious activity
