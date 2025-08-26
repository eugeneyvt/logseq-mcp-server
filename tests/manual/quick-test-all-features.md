# Comprehensive MCP Server Test Suite

This document provides a complete test sequence to validate all functionality of your Logseq AI MCP Server.

## Test Execution Instructions

Execute these commands in order and verify the expected results for each.

---

## Phase 1: System Health & Setup

### Test 1: System Health Check
```javascript
mcp__logseq__get({
  type: "system",
  target: "health"
})
```
**Expected:** `status: "healthy"`, 4 supported operations, performance metrics

### Test 2: Graph Information
```javascript
mcp__logseq__get({
  type: "system", 
  target: "info"
})
```
**Expected:** Graph statistics (pages, blocks, templates), capabilities info

---

## Phase 2: Content Creation

### Test 3-7: Create Test Pages
```javascript
// Execute each of these
mcp__logseq__edit({
  type: "page",
  operation: "create", 
  target: "e2e-project-management",
  content: "Project management page for E2E testing"
})

mcp__logseq__edit({
  type: "page",
  operation: "create",
  target: "e2e-development-notes", 
  content: "Development notes for comprehensive testing"
})

mcp__logseq__edit({
  type: "page",
  operation: "create",
  target: "e2e-meeting-notes",
  content: "Meeting notes page for testing purposes"
})

mcp__logseq__edit({
  type: "page", 
  operation: "create",
  target: "e2e-personal-journal",
  content: "Personal journal page for E2E validation"
})

mcp__logseq__edit({
  type: "page",
  operation: "create", 
  target: "e2e-templates-collection",
  content: "Templates collection for testing"
})
```
**Expected:** Each returns `successful: true`, correct `page_name`, `created: true`

### Test 8-10: Create Templates (Single-Block Enforcement)
```javascript
mcp__logseq__edit({
  type: "template",
  operation: "create",
  target: "e2e-meeting-template", 
  templateName: "e2e-meeting-template",
  content: "# Meeting: {{meeting-title}}\n\n**Date:** {{date}}\n**Attendees:** {{attendees}}\n\n## Action Items\n- [ ] {{action-1}}\n- [ ] {{action-2}}"
})

mcp__logseq__edit({
  type: "template",
  operation: "create",
  target: "e2e-task-template",
  templateName: "e2e-task-template", 
  content: "Task: {{task-name}} | Priority: {{priority}} | Due: {{due-date}} | Owner: {{owner}}"
})

mcp__logseq__edit({
  type: "template",
  operation: "create",
  target: "e2e-daily-note-template",
  templateName: "e2e-daily-note-template",
  content: "# Daily Note - {{date}}\n\n## Focus: {{focus}}\n## Completed: {{completed}}"
})
```
**Expected:** `single_block_enforced: true`, placeholders extracted (e.g., `["meeting-title", "date", "attendees", "action-1", "action-2"]`)

### Test 11-15: Create Blocks
```javascript
mcp__logseq__edit({
  type: "block",
  operation: "create",
  target: "e2e-project-management", 
  content: "## Project Overview\nThis project focuses on building a comprehensive MCP server for Logseq integration."
})

mcp__logseq__edit({
  type: "block",
  operation: "create",
  target: "e2e-development-notes",
  content: "### Architecture Notes\n- Unified 4-tool design\n- Entity-driven architecture\n- Performance monitoring"
})

mcp__logseq__edit({
  type: "block",
  operation: "create", 
  target: "e2e-meeting-notes",
  content: "### Weekly Team Meeting\n- Discussed API improvements\n- Reviewed testing strategy"
})

mcp__logseq__edit({
  type: "block",
  operation: "create",
  target: "e2e-personal-journal", 
  content: "Today I worked on comprehensive testing for the MCP server. The unified architecture is working well."
})

mcp__logseq__edit({
  type: "block",
  operation: "create",
  target: "e2e-templates-collection",
  content: "### Available Templates\n- Meeting template\n- Task template\n- Daily note template"
})
```
**Expected:** Each returns `created_block` UUID, correct `content`, proper `parent`

### Test 16-20: Create Tasks
```javascript
mcp__logseq__edit({
  type: "tasks",
  operation: "create",
  target: "e2e-project-management",
  content: "Complete comprehensive E2E testing",
  taskState: "TODO"
})

mcp__logseq__edit({
  type: "tasks", 
  operation: "create",
  target: "e2e-development-notes",
  content: "Review and update architecture documentation", 
  taskState: "DOING"
})

mcp__logseq__edit({
  type: "tasks",
  operation: "create",
  target: "e2e-meeting-notes",
  content: "Prepare agenda for next team meeting",
  taskState: "TODO"
})

mcp__logseq__edit({
  type: "tasks",
  operation: "create", 
  target: "e2e-personal-journal",
  content: "Write daily reflection notes",
  taskState: "LATER"
})

mcp__logseq__edit({
  type: "tasks",
  operation: "create",
  target: "e2e-templates-collection", 
  content: "Create additional template variations",
  taskState: "TODO"
})
```
**Expected:** Each returns `task_uuid`, correct `status` and `content`

### Test 21-25: Add Properties
```javascript
mcp__logseq__edit({
  type: "properties",
  operation: "create",
  target: "e2e-project-management",
  propertyKey: "project",
  propertyValue: "logseq-ai-mcp"
})

mcp__logseq__edit({
  type: "properties", 
  operation: "create",
  target: "e2e-project-management",
  propertyKey: "priority",
  propertyValue: "high"
})

mcp__logseq__edit({
  type: "properties",
  operation: "create", 
  target: "e2e-development-notes",
  propertyKey: "tags",
  propertyValue: ["development", "architecture", "testing"]
})

mcp__logseq__edit({
  type: "properties",
  operation: "create",
  target: "e2e-meeting-notes", 
  propertyKey: "meeting-type",
  propertyValue: "weekly-standup"
})

mcp__logseq__edit({
  type: "properties",
  operation: "create",
  target: "e2e-personal-journal",
  propertyKey: "mood",
  propertyValue: "productive"
})
```
**Expected:** Each returns correct `property_key` and `property_value`, resolved target UUID

---

## Phase 3: Content Retrieval & Search

### Test 26: Basic Search
```javascript
mcp__logseq__search({
  query: "e2e-test", 
  target: "both",
  limit: 10,
  sort: "relevance",
  order: "desc"
})
```
**Expected:** Results array with pages/blocks, `total_found > 0`, relevance scores

### Test 27: Advanced Search with Filters
```javascript
mcp__logseq__search({
  target: "both",
  filter: {
    properties_any: { project: "logseq-ai-mcp" },
    tags_any: ["testing", "development"]
  },
  limit: 5
})
```
**Expected:** Filtered results matching property/tag criteria

### Test 28: Task Search
```javascript
mcp__logseq__search({
  target: "tasks",
  filter: {
    todoState: "TODO"
  },
  limit: 10
})
```
**Expected:** Only tasks with TODO status

### Test 29: Namespace Search  
```javascript
mcp__logseq__search({
  target: "pages",
  scope: {
    namespace: "e2e-"
  },
  limit: 10
})
```
**Expected:** Only pages starting with "e2e-" prefix

### Test 30: Template Search
```javascript
mcp__logseq__search({
  target: "templates",
  limit: 5
})
```
**Expected:** Template entities with names and metadata

### Test 31: Search Pagination
```javascript
mcp__logseq__search({
  query: "test",
  target: "both", 
  limit: 3,
  cursor: "0"
})
// Then use the next_cursor from response:
mcp__logseq__search({
  query: "test",
  target: "both",
  limit: 3, 
  cursor: "3"  // Use actual next_cursor value
})
```
**Expected:** Paginated results, `has_more` flag, consistent total counts

---

## Phase 4: Advanced Retrieval

### Test 32: Page with Full Details
```javascript
mcp__logseq__get({
  type: "page",
  target: "e2e-project-management",
  include: {
    content: true,
    properties: true, 
    children: true,
    backlinks: true
  },
  depth: 2
})
```
**Expected:** Complete page data with blocks, properties, structure

### Test 33: Multiple Page Retrieval
```javascript
mcp__logseq__get({
  type: "page",
  target: ["e2e-project-management", "e2e-development-notes", "e2e-meeting-notes"],
  include: {
    content: true,
    properties: true
  }
})
```
**Expected:** Array of page data objects

### Test 34: Block Retrieval
```javascript
// Use actual block UUID from creation tests
mcp__logseq__get({
  type: "block", 
  target: "{{BLOCK_UUID_FROM_TEST_11}}",
  include: {
    content: true,
    properties: true,
    children: true
  }
})
```
**Expected:** Block data with content and metadata

### Test 35: Template Retrieval
```javascript
mcp__logseq__get({
  type: "template",
  target: "e2e-meeting-template",
  include: {
    content: true,
    properties: true
  }
})
```
**Expected:** Template with `is_single_block_template: true`, placeholders list

### Test 36: Properties Retrieval (FIXED)
```javascript
mcp__logseq__get({
  type: "properties",
  target: "e2e-project-management"
})
```
**Expected:** Properties as key-value pairs: `{"project": "logseq-ai-mcp", "priority": "high"}`

### Test 37: Relations Analysis
```javascript
mcp__logseq__get({
  type: "relations", 
  target: "e2e-project-management",
  depth: 2
})
```
**Expected:** Relation analysis with connections and types

---

## Phase 5: Content Modification

### Test 38: Page Update
```javascript
mcp__logseq__edit({
  type: "page",
  operation: "update",
  target: "e2e-project-management", 
  content: "Updated project management page with comprehensive test results"
})
```
**Expected:** `successful: true`, updated content confirmed

### Test 39: Block Update
```javascript
// Use actual block UUID from creation
mcp__logseq__edit({
  type: "block",
  operation: "update", 
  target: "{{BLOCK_UUID_FROM_TEST_11}}",
  content: "## Updated Project Overview\nProject status: E2E testing in progress, all systems functional."
})
```
**Expected:** Block content successfully updated

### Test 40: Task State Transition (FIXED)
```javascript
// Use actual task UUID from creation
mcp__logseq__edit({
  type: "tasks",
  operation: "update",
  target: "{{TASK_UUID_FROM_TEST_16}}", 
  taskState: "DOING"
})
```
**Expected:** Task state changes from TODO to DOING **without requiring content parameter**

### Test 41: Property Update
```javascript
mcp__logseq__edit({
  type: "properties",
  operation: "update",
  target: "e2e-project-management",
  propertyKey: "priority", 
  propertyValue: "critical"
})
```
**Expected:** Property value updated from "high" to "critical"

### Test 42: Relations Creation (FIXED)
```javascript
mcp__logseq__edit({
  type: "relations",
  operation: "create",
  target: ["e2e-project-management", "e2e-development-notes"],
  linkContext: "Related project documentation"
})
```
**Expected:** Relation created between the two pages **using target array format**

### Test 43: Block Append
```javascript
// Use actual block UUID 
mcp__logseq__edit({
  type: "block", 
  operation: "append",
  target: "{{BLOCK_UUID_FROM_TEST_11}}",
  content: "### Additional Notes\n- E2E testing completed successfully\n- All features validated"
})
```
**Expected:** Child block created under the target block

---

## Phase 6: Bulk Operations

### Test 44: Bulk Block Creation
```javascript
mcp__logseq__edit({
  type: "block",
  operation: "create",
  target: ["e2e-project-management", "e2e-development-notes", "e2e-meeting-notes"],
  content: "Bulk-created block for comprehensive testing"
})
```
**Expected:** Array of results, each with `success: true` and `created_block` UUID

### Test 45: Bulk Property Addition
```javascript
// Execute for multiple targets
mcp__logseq__edit({
  type: "properties", 
  operation: "create",
  target: "e2e-development-notes",
  propertyKey: "test-status",
  propertyValue: "validated"
})

mcp__logseq__edit({
  type: "properties",
  operation: "create", 
  target: "e2e-meeting-notes", 
  propertyKey: "test-status",
  propertyValue: "validated"
})
```
**Expected:** Properties added to multiple pages successfully

---

## Phase 7: Error Handling & Edge Cases

### Test 46: Non-existent Page
```javascript
mcp__logseq__get({
  type: "page",
  target: "non-existent-page-12345"
})
```
**Expected:** Error with `NOT_FOUND` or `not_found: true`

### Test 47: Invalid Block UUID
```javascript
mcp__logseq__edit({
  type: "block", 
  operation: "update",
  target: "invalid-uuid-format",
  content: "This should fail"
})
```
**Expected:** Error about invalid UUID format

### Test 48: Delete Safety Check
```javascript
mcp__logseq__delete({
  type: "page",
  target: "e2e-templates-collection",
  confirmDestroy: false
})
```
**Expected:** Error: "Delete confirmation required"

### Test 49: Template Multi-block Prevention
```javascript
mcp__logseq__edit({
  type: "template", 
  operation: "create",
  target: "invalid-multi-block-template",
  templateName: "invalid-multi-block-template",
  content: "Block 1\n\nThis would be Block 2\n\nAnd Block 3"
})
```
**Expected:** Either error preventing multi-block OR `single_block_enforced: true` with content merged

### Test 50: Invalid Search Cursor
```javascript
mcp__logseq__search({
  query: "test",
  target: "both",
  cursor: "invalid-cursor-abc", 
  limit: 5
})
```
**Expected:** Graceful handling, cursor reset to 0 (FIXED)

---

## Phase 8: Deletion & Cleanup

### Test 51: Delete Simulation
```javascript
mcp__logseq__delete({
  type: "page", 
  target: "e2e-personal-journal",
  confirmDestroy: true,
  simulate: true
})
```
**Expected:** Impact analysis without actual deletion, `simulation: true`

### Test 52: Soft Delete
```javascript
mcp__logseq__delete({
  type: "page",
  target: "e2e-templates-collection",
  confirmDestroy: true, 
  softDelete: true
})
```
**Expected:** `soft_deleted: true` in impact, content moved to trash

### Test 53: Block Deletion with Cascade
```javascript
// Use actual block UUID
mcp__logseq__delete({
  type: "block",
  target: "{{BLOCK_UUID_FROM_TEST_43}}", // Child block from append test
  confirmDestroy: true,
  cascade: true
})
```
**Expected:** Block and any children deleted, cascade count in impact

### Test 54: Property Removal
```javascript
mcp__logseq__edit({
  type: "properties", 
  operation: "remove",
  target: "e2e-project-management", 
  propertyKey: "mood"
})
```
**Expected:** Property removed successfully

---

## Phase 9: Final Validation

### Test 55: Final System Health
```javascript
mcp__logseq__get({
  type: "system",
  target: "health"
})
```
**Expected:** System still healthy, all capabilities available

### Test 56: Performance Verification
```javascript
// Large search to test performance
mcp__logseq__search({
  query: "*",
  target: "both", 
  limit: 50
})
```
**Expected:** Results returned in < 2 seconds

### Test 57: Final Cleanup
```javascript
// Clean up remaining test pages
mcp__logseq__delete({
  type: "page",
  target: "e2e-project-management", 
  confirmDestroy: true,
  softDelete: true
})

mcp__logseq__delete({
  type: "page",
  target: "e2e-development-notes",
  confirmDestroy: true,
  softDelete: true
})

mcp__logseq__delete({
  type: "page", 
  target: "e2e-meeting-notes",
  confirmDestroy: true,
  softDelete: true
})

mcp__logseq__delete({
  type: "page",
  target: "e2e-personal-journal",
  confirmDestroy: true, 
  softDelete: true
})
```
**Expected:** All test pages soft-deleted successfully

---

## Success Criteria

✅ **All 57 tests pass without errors**
✅ **Fixed functionality works correctly:**
   - Property retrieval returns proper key-value pairs (not nested objects)
   - Task state transitions work without content parameter
   - Relations creation works with target array format
   - Search pagination handles invalid cursors gracefully
✅ **Performance is acceptable (< 2s per operation)**
✅ **Error handling is robust and informative**
✅ **System remains healthy throughout all operations**

---

## Notes for Execution

1. **Replace UUIDs:** When testing, replace `{{BLOCK_UUID_FROM_TEST_X}}` and `{{TASK_UUID_FROM_TEST_X}}` with actual UUIDs returned from the creation tests.

2. **Sequential Execution:** Run tests in order since later tests depend on content created by earlier tests.

3. **Validation:** For each test, verify both the success response AND the actual state change in your Logseq instance.

4. **Performance Monitoring:** Note the response times - they should generally be under 1-2 seconds.

5. **Error Documentation:** Document any failures with the exact error message and context for debugging.

This comprehensive test suite validates that your Logseq AI MCP Server is fully functional and ready for production use! 🚀