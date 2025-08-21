# Logseq MCP Server Redesign: 4-Tool Unified Architecture

## Executive Summary

Redesign the Logseq MCP Server from 15+ confusing micro-tools into 4 intuitive action verbs: **Search**, **Get**, **Edit**, **Delete**. This approach dramatically improves LLM tool selection reliability while maintaining full functionality and adding sophisticated features like advanced filtering, pagination, and robust error handling.

## Current Problems

### Tool Selection Confusion

- 15+ tools with overlapping purposes (`apply_template`, `set_page_content`, `append_blocks`, etc.)
- Unclear distinctions between similar operations
- Poor tool descriptions leading to wrong AI choices
- Overloaded functionality in single tools

### Template System Issues

- Multi-block templates instead of Logseq's single-block standard
- Confusion between template pages and callable templates
- Wrong API usage for template insertion
- Replace/append modes don't align with Logseq semantics

### Missing Advanced Features

- No pagination for large result sets
- Limited search filtering capabilities
- No idempotency controls for safe retries
- Inconsistent error handling

## Proposed Solution: 4-Tool Architecture

### Tool 1: Search

**Purpose**: Comprehensive search with advanced filtering, sorting, and pagination

### Tool 2: Get

**Purpose**: Retrieve specific content with full details and context

### Tool 3: Edit

**Purpose**: Create, modify, append, and move content across all types

### Tool 4: Delete

**Purpose**: Remove content with safety controls and confirmation

## Detailed Tool Specifications

### Search Tool

#### Purpose

Advanced search across all Logseq content types with sophisticated filtering and pagination.

#### Parameters Schema

```typescript
{
  // What to search
  target: "blocks" | "pages" | "tasks" | "templates" | "both" // default: "both"
  query?: string // Free-text search, exact phrases with quotes

  // Where to search
  scope?: {
    namespace?: string           // e.g., "projects/ai/"
    page_titles?: string[]       // specific pages to search within
    parent_block_id?: string     // search within specific block tree
    journal?: boolean            // journal pages only
    tag?: string                 // pages with specific tag
  }

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

#### Response Format

```typescript
{
  success: true,
  items: [...],           // search results
  next_cursor?: string,   // for pagination
  total_estimated: number,
  query_info: {
    target: string,
    processed_query: string,
    filters_applied: string[]
  }
}
```

#### Error Handling

- Invalid target/scope combinations
- Malformed filter parameters
- Query syntax errors
- Performance limit warnings
- Cursor expiration notices

### Get Tool

#### Purpose

Retrieve specific content with full details, metadata, and context.

#### Parameters Schema

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

#### Supported Type Operations

**page**: Get page content, properties, backlinks, children

- `target`: page title
- `include.children`: get all blocks
- `include.backlinks`: get pages linking to this page

**block**: Get block details, children, properties, context

- `target`: block UUID
- `include.children`: get child blocks
- `format`: tree vs flat representation

**template**: Get template definition, placeholders, usage examples

- `target`: template name
- Includes placeholder analysis and variable requirements

**properties**: Get page/block properties with metadata

- `target`: page title or block UUID
- Returns all properties with types and modification dates

**relations**: Get page relationships and graph connections

- `target`: page title
- `depth`: how many relationship hops to traverse
- Returns backlinks, outgoing links, related pages

**tasks**: Get task details, state, scheduling information

- `target`: block UUID or page title
- Returns task state, scheduling, dependencies

**system**: Get system information and health status

- No target required
- Returns Logseq version, API status, graph statistics

**graph**: Get graph structure and analytics

- `target`: optional focus page
- Returns graph metrics, clusters, important pages

#### Error Handling

- Target not found with suggestions
- Invalid type for target identifier
- Access permission errors
- Malformed identifiers with format examples

### Edit Tool

#### Purpose

Create, modify, append, move, and transform content across all Logseq types.

#### Parameters Schema

```typescript
{
  type: "page" | "block" | "template" | "properties" | "relations" | "tasks"
  operation: "create" | "update" | "append" | "prepend" | "move"
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

  // Standard controls
  control?: {
    strict?: boolean
    autofixFormat?: boolean
    maxOps?: number
  }
}
```

#### Valid Type + Operation Combinations

##### Page Operations

- **create**: Create new page with initial content
- **update**: Replace entire page content
- **append**: Add content to end of page
- **prepend**: Add content to beginning of page

##### Block Operations

- **create**: Create new block at specified position
- **update**: Update existing block content
- **move**: Move block to new position
- **append**: Add child block
- **prepend**: Add block before others

##### Template Operations

- **create**: Create new single-block template (enforced)
- **update**: Update template definition
- **append**: Insert template into target location

##### Properties Operations

- **create**: Add new property (alias for update)
- **update**: Set/update property value
- **remove**: Remove property (via operation="remove")

##### Relations Operations

- **create**: Create link between pages
- **remove**: Remove link between pages
- **update**: Update link context/metadata

##### Tasks Operations

- **create**: Create new task block
- **update**: Update task content or state
- **move**: Move task to different location

#### Template System Enforcement

**Single-Block Rule**: Templates MUST be created as single blocks only

- Multi-line content joined with newlines within single block
- Validation rejects multi-block templates with clear error
- Template insertion always creates single block

**Template Creation Process**:

1. Validate content is single block
2. Create template page with proper properties
3. Add template block with normalized placeholders
4. Return template info with placeholder analysis

**Template Insertion Process**:

1. Find template by name
2. Substitute variables in content
3. Insert as single block at target position
4. Return insertion confirmation

#### Error Handling

- Invalid type+operation combinations with specific guidance
- Target validation errors with correction hints
- Content format validation for each type
- Template placeholder validation
- Task state validation
- Circular reference detection for relations
- Idempotency key conflicts

### Delete Tool

#### Purpose

Remove content with comprehensive safety controls and impact analysis.

#### Parameters Schema

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

#### Supported Operations

**page**: Delete entire page and optionally its references

- Warns about orphaned backlinks
- Option to cascade delete or just remove references

**block**: Delete specific block(s) and children

- Shows child block count before deletion
- Option to preserve or delete child blocks

**template**: Delete template definition

- Shows usage count if template is referenced
- Prevents deletion of widely-used templates without confirmation

**properties**: Delete specific properties from pages/blocks

- Shows current property values before deletion
- Batch deletion support

**relations**: Delete specific relationships between pages

- Shows impact on graph connectivity
- Option to delete bidirectional links

**tasks**: Delete task blocks

- Preserves task history in deletion log
- Shows task state and dependencies before deletion

#### Safety Features

**Pre-deletion Analysis**:

- Impact assessment (what else will be affected)
- Dependency warnings (orphaned content)
- Usage statistics (how often referenced)

**Confirmation Requirements**:

- `confirmDestroy: true` required for all deletions
- Additional confirmation for high-impact deletions
- Simulation mode to preview deletions

**Soft Delete Option**:

- Move to designated trash page instead of permanent deletion
- Preserve content with deletion metadata
- Recovery option for accidental deletions

#### Error Handling

- Missing confirmation with clear requirements
- Target not found with suggestions
- Cascade dependency analysis and warnings
- Permission errors with troubleshooting steps
- Orphaned content warnings with resolution options

## Cross-Cutting Features

### Structured Error Handling

#### Error Response Format

```typescript
{
  error: {
    code: "ERROR_CODE",
    message: "Human-readable description",
    hint: "Specific guidance for fixing the issue",
    details: {
      // Error-specific additional information
      invalid_fields?: string[],
      suggested_values?: any[],
      documentation_link?: string
    }
  }
}
```

#### Error Codes

- **NOT_FOUND**: Resource doesn't exist
- **INVALID_ARGUMENT**: Parameter validation failed
- **INVALID_COMBINATION**: Incompatible type+operation
- **RATE_LIMITED**: Too many requests
- **PERMISSION_DENIED**: Access forbidden
- **CONFLICT**: Operation conflicts with current state
- **TOO_MUCH_DATA**: Result set too large
- **TEMPLATE_INVALID**: Template format or structure invalid
- **GRAPH_CONSISTENCY**: Graph integrity violation

### Performance & Scalability

#### Pagination Strategy

- **Cursor-based pagination**: Opaque cursors instead of offsets
- **Hard limits**: Maximum 100 items per request
- **Server-side truncation**: Text previews limited to reasonable sizes
- **Cursor stability**: Cursors remain valid for reasonable time period

#### Content Limits

- **Text preview**: 3-5k characters for content previews
- **Child blocks**: Maximum 200 children per node unless depth < 2
- **Search results**: Hard cap at 100 items with cursor for more
- **Batch operations**: Maximum 50 operations per batch request

#### Caching Strategy

- **Graph structure**: Cache page relationships and hierarchy
- **Template definitions**: Cache template content and placeholders
- **Search indexes**: Maintain search indexes for common queries
- **Result caching**: Cache expensive operations with TTL

### Data Consistency

#### Idempotency

- **Idempotency keys**: All mutating operations accept idempotency keys
- **Safe retries**: Duplicate requests with same key return original result
- **Change tracking**: Every mutation returns before/after state hashes
- **Conflict detection**: Detect and resolve concurrent modifications

#### Validation

- **Input validation**: Comprehensive parameter validation for all tools
- **Content validation**: Ensure Logseq-valid Markdown in all content
- **Reference validation**: Check that page/block references are valid
- **Template validation**: Enforce single-block rule and placeholder syntax

#### Audit Trail

- **Change records**: Track all mutations with timestamps and context
- **Session tracking**: Optional session IDs for request correlation
- **Performance metrics**: Track operation latency and success rates
- **Error analytics**: Monitor error patterns for improvement opportunities

### Migration Strategy

#### Backwards Compatibility

- **Parallel deployment**: Ship v2 alongside v1 with feature flag
- **Bridge layer**: Map old micro-tools to new unified tools internally
- **Gradual migration**: Give AI models time to adapt to new tool structure
- **Usage analytics**: Monitor tool selection patterns to validate improvements

#### Migration Timeline

1. **Phase 1**: Implement new 4-tool architecture
2. **Phase 2**: Deploy alongside existing tools with feature flag
3. **Phase 3**: Update tool descriptions and documentation
4. **Phase 4**: Monitor adoption and error rates
5. **Phase 5**: Deprecate old tools and make new tools default
6. **Phase 6**: Remove old tools after full migration

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1-2)

- [ ] Design and implement unified parameter schemas
- [ ] Create type+operation compatibility matrix
- [ ] Implement structured error handling system
- [ ] Build content type validation framework
- [ ] Set up cursor-based pagination infrastructure

### Phase 2: Search Tool Implementation (Week 2-3)

- [ ] Implement advanced filtering engine
- [ ] Add scope-based search targeting
- [ ] Create cursor pagination for search results
- [ ] Implement sorting and ordering options
- [ ] Add comprehensive search error handling

### Phase 3: Get Tool Implementation (Week 3-4)

- [ ] Implement unified content retrieval
- [ ] Add include/exclude options for related content
- [ ] Create format options (tree vs flat)
- [ ] Implement depth control for relationships
- [ ] Add content preview and truncation

### Phase 4: Edit Tool Implementation (Week 4-5)

- [ ] Implement operation routing by type
- [ ] Add position control for move operations
- [ ] Implement template single-block enforcement
- [ ] Add dry-run and idempotency support
- [ ] Create comprehensive validation for all edit operations

### Phase 5: Delete Tool Implementation (Week 5-6)

- [ ] Implement safety controls and confirmation requirements
- [ ] Add cascade deletion with impact analysis
- [ ] Implement soft delete option
- [ ] Add simulation mode for deletion preview
- [ ] Create comprehensive deletion error handling

### Phase 6: Template System Overhaul (Week 6-7)

- [ ] Rewrite template creation for single-block enforcement
- [ ] Implement proper template insertion logic
- [ ] Add template validation and placeholder handling
- [ ] Update template search integration
- [ ] Test template operations thoroughly

### Phase 7: Testing & Quality Assurance (Week 7-8)

- [ ] Create comprehensive test suite for all tools
- [ ] Test all type+operation combinations
- [ ] Validate error handling paths
- [ ] Performance testing with large datasets
- [ ] Load testing for cursor stability

### Phase 8: Documentation & Migration (Week 8-9)

- [ ] Update all tool descriptions and examples
- [ ] Create migration guide for existing users
- [ ] Implement backwards compatibility bridge
- [ ] Monitor usage patterns and error rates
- [ ] Prepare for old tool deprecation

## Success Metrics

### Primary Metrics

- **Tool Selection Accuracy**: Reduction in "wrong tool" usage rate
- **Template Reliability**: Single-block enforcement and proper insertion
- **Error Recovery**: Models successfully correct errors using hints
- **Performance**: Search and pagination response times under limits

### Secondary Metrics

- **User Satisfaction**: Fewer frustrated retry attempts
- **System Stability**: Reduced errors from invalid operations
- **Scale Performance**: Stable operation with large graphs
- **Migration Success**: Smooth transition from old to new tools

### Monitoring Strategy

- **Error Rate Tracking**: Monitor error codes and resolution success
- **Performance Monitoring**: Track response times and throughput
- **Usage Analytics**: Monitor tool selection patterns and preferences
- **Quality Metrics**: Track content validation failures and fixes

## Risk Mitigation

### Technical Risks

- **Performance degradation**: Implement caching and hard limits
- **Data consistency issues**: Add comprehensive validation and conflict detection
- **Backward compatibility problems**: Maintain bridge layer during transition
- **Complex schema confusion**: Simplify based on LLM feedback

### Product Risks

- **User adoption resistance**: Provide clear migration path and documentation
- **Tool selection confusion**: Monitor usage patterns and refine descriptions
- **Template system changes**: Extensive testing and validation
- **Feature regression**: Comprehensive test coverage

### Operational Risks

- **Deployment complexity**: Phased rollout with feature flags
- **Support burden**: Clear error messages and troubleshooting guides
- **Migration timeline**: Buffer time for unexpected issues
- **Rollback capability**: Maintain ability to revert to old system

## Conclusion

This redesign addresses fundamental usability issues with the current Logseq MCP Server while adding sophisticated features that significantly improve the developer and AI experience. The 4-tool architecture provides clear, intuitive actions that LLMs can reliably select, while the enhanced functionality supports complex workflows with proper safety controls.

The template system fixes ensure compatibility with Logseq's standards, and the advanced search and filtering capabilities provide powerful tools for content discovery and management. Combined with robust error handling and performance optimizations, this redesign creates a production-ready system that scales effectively while remaining simple to use.

The phased implementation approach minimizes risk while ensuring thorough testing and smooth migration for existing users. Success metrics and monitoring strategies provide clear feedback on the improvements and guide further refinements.
