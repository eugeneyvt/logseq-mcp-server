# Logseq MCP Server Development Roadmap

## 📊 Current API Coverage Analysis

### ✅ **APIs We Currently Cover (17 tools)**

**Page Operations:**

- `logseq_list_pages` - List all pages
- `logseq_get_page` - Get page information
- `logseq_get_page_content` - Get formatted page content
- `logseq_create_page` - Create new pages
- `logseq_delete_page` - Delete pages

**Block Operations:**

- `logseq_get_block` - Get specific blocks by UUID
- `logseq_create_block` - Create new blocks
- `logseq_update_block` - Update block content
- `logseq_delete_block` - Remove blocks
- `logseq_set_block_property` - Set block properties
- `logseq_remove_block_property` - Remove block properties

**Search & Query:**

- `logseq_search` - Full-text search across graph
- `logseq_datascript_query` - Execute DataScript queries
- `logseq_get_backlinks` - Find page references

**Context & State:**

- `logseq_get_current_graph` - Get graph information
- `logseq_get_current_page` - Get currently open page
- `logseq_get_current_block` - Get currently focused block

### 🚧 **Major APIs We're Missing**

Based on the Context7 research, here are the significant Logseq APIs we haven't implemented:

#### **1. Advanced Editor Operations**

- **Block Selection & Cursor Management:**
  - `getSelectedBlocks()` - Get currently selected blocks
  - `getEditingBlockContent()` - Get content of block being edited
  - `insertAtEditingCursor()` - Insert content at cursor position
  - `restoreEditingCursor()` - Restore cursor position
  - `getBlockCursorPosition()` - Get current cursor position
  - `selectBlock()` - Programmatically select blocks
  - `scrollToBlockInPage()` - Scroll to specific blocks

- **Block State Management:**
  - `setBlockCollapsed()` - Collapse/expand blocks
  - `editBlock()` - Enter edit mode for blocks
  - `renameBlock()` - Rename blocks

#### **2. Advanced Page Operations**

- **Namespace & Hierarchy:**
  - `getPagesFromNamespace()` - Get pages from specific namespace
  - `getPagesTreeFromNamespace()` - Get hierarchical page structure
  - **Missing:** Page templates, page aliases, page references

#### **3. Enhanced Search & Query**

- **Advanced Search:**
  - `registerSearchService()` - Register custom search services
  - **Missing:** Search filters, search history, saved searches
  - **Missing:** Advanced DataScript query builders

#### **4. UI & Interaction APIs**

- **UI Management:**
  - `provideUI()` - Inject custom UI components
  - `showMsg()` / `closeMsg()` - Display user messages
  - `setMainUIAttrs()` - Configure UI attributes
  - **Missing:** Custom UI slots, theme management

#### **5. Application State & Configuration**

- **App State:**
  - `getStateFromStore()` / `setStateFromStore()` - Access app state
  - `getUserConfigs()` - Get user preferences
  - `getCurrentGraphConfigs()` - Get graph settings
  - **Missing:** Graph switching, configuration management

#### **6. Git & Version Control**

- **Git Operations:**
  - `execGitCommand()` - Execute Git commands
  - **Missing:** Commit history, branch management, sync status

#### **7. Advanced Block Operations**

- **Block Relationships:**
  - **Missing:** Block references, block links, block embeddings
  - **Missing:** Block templates, block cloning
  - **Missing:** Batch block operations

#### **8. File & Asset Management**

- **File Operations:**
  - **Missing:** File uploads, asset management
  - **Missing:** File attachments, media handling
  - **Missing:** Export/import operations

#### **9. Plugin & External Integration**

- **Plugin System:**
  - `invokeExternalPlugin()` - Call other plugin functions
  - `invokeExternalCommand()` - Execute external commands
  - **Missing:** Plugin discovery, plugin communication

#### **10. Advanced Data Operations**

- **Data Management:**
  - **Missing:** Batch operations, transaction support
  - **Missing:** Data validation, data migration
  - **Missing:** Advanced property management

## 🗺️ **Development Roadmap**

### **Phase 1: Core Editor Operations** 🚀

**Timeline:** Q1 2024 | **Priority:** High | **Status:** Planning
**Goal:** Essential AI interaction capabilities

- [ ] **Block Selection & Cursor Management**
  - [ ] `logseq_get_selected_blocks` - Get currently selected blocks
  - [ ] `logseq_get_editing_block_content` - Get content of block being edited
  - [ ] `logseq_insert_at_cursor` - Insert content at cursor position
  - [ ] `logseq_get_cursor_position` - Get current cursor position
  - [ ] `logseq_select_block` - Programmatically select blocks

- [ ] **Block State Management**
  - [ ] `logseq_set_block_collapsed` - Collapse/expand blocks
  - [ ] `logseq_edit_block` - Enter edit mode for blocks
  - [ ] `logseq_rename_block` - Rename blocks

**Impact:** Enables AI to understand user context and make precise edits

### **Phase 2: Advanced Search & Organization** 🔍

**Timeline:** Q2 2024 | **Priority:** Medium | **Status:** Planning
**Goal:** Better query and organization capabilities

- [ ] **Namespace Operations**
  - [ ] `logseq_get_pages_from_namespace` - Get pages from specific namespace
  - [ ] `logseq_get_pages_tree_from_namespace` - Get hierarchical page structure
  - [ ] `logseq_create_namespace` - Create new namespaces

- [ ] **Enhanced Search**
  - [ ] `logseq_search_with_filters` - Advanced search with filters
  - [ ] `logseq_save_search` - Save frequently used searches
  - [ ] `logseq_search_history` - Access search history

**Impact:** Better content discovery and organization for AI assistants

### **Phase 3: UI & User Experience** 🎨

**Timeline:** Q3 2024 | **Priority:** Medium | **Status:** Planning
**Goal:** Better user interaction and feedback

- [ ] **User Communication**
  - [ ] `logseq_show_message` - Display user messages
  - [ ] `logseq_close_message` - Close displayed messages
  - [ ] `logseq_show_notification` - Show system notifications

- [ ] **UI Management**
  - [ ] `logseq_set_ui_attributes` - Configure UI attributes
  - [ ] `logseq_toggle_sidebar` - Control sidebar visibility
  - [ ] `logseq_set_fullscreen` - Control fullscreen mode

**Impact:** Better user feedback and AI interaction experience

### **Phase 4: Advanced Data & Git Operations** ⚙️

**Timeline:** Q4 2024 | **Priority:** Low | **Status:** Planning
**Goal:** Professional and advanced user features

- [ ] **Git Integration**
  - [ ] `logseq_exec_git_command` - Execute Git commands
  - [ ] `logseq_get_git_status` - Get repository status
  - [ ] `logseq_commit_changes` - Commit changes

- [ ] **Advanced Data Operations**
  - [ ] `logseq_batch_operations` - Batch block/page operations
  - [ ] `logseq_export_data` - Export graph data
  - [ ] `logseq_import_data` - Import external data

**Impact:** Professional workflow integration and data management

## 🛠️ **Implementation Considerations**

### **Technical Challenges**

1. **API Compatibility:** Ensure new tools work with existing MCP infrastructure
2. **Error Handling:** Robust error handling for complex operations
3. **Performance:** Efficient implementation for large graphs
4. **Testing:** Comprehensive test coverage for new functionality

### **User Experience**

1. **Intuitive Naming:** Clear, descriptive tool names for AI assistants
2. **Consistent Interface:** Maintain consistency with existing tools
3. **Documentation:** Comprehensive examples and use cases
4. **Backward Compatibility:** Ensure existing integrations continue working

### **Security & Privacy**

1. **Input Validation:** Validate all user inputs and API parameters
2. **Access Control:** Respect user permissions and graph access
3. **Data Sanitization:** Prevent injection attacks and data corruption
4. **Audit Logging:** Track usage for debugging and security

## 🎯 **Success Metrics & Milestones**

### **Phase 1 Success Criteria**

- [ ] AI can accurately identify and modify user-selected content
- [ ] Block editing operations work seamlessly
- [ ] Cursor management enables precise content insertion
- [ ] Zero breaking changes to existing functionality

### **Phase 2 Success Criteria**

- [ ] Namespace operations improve content organization
- [ ] Advanced search capabilities reduce content discovery time
- [ ] Search filters provide relevant results quickly

### **Phase 3 Success Criteria**

- [ ] User feedback system improves AI interaction quality
- [ ] UI management tools enhance user experience
- [ ] Notifications provide clear status updates

### **Phase 4 Success Criteria**

- [ ] Git integration enables version control workflows
- [ ] Batch operations improve efficiency for power users
- [ ] Export/import capabilities support data portability

## 🚀 **Next Steps & Development Workflow**

### **Immediate Next Steps**

1. **Research Phase 1 APIs** - Deep dive into Logseq editor APIs
2. **Design Tool Interfaces** - Plan MCP tool signatures and parameters
3. **Create Implementation Plan** - Break down development tasks
4. **Set Up Development Environment** - Prepare for new feature development

### **Development Workflow**

1. **Feature Branch** - Create feature branch for each phase
2. **Incremental Development** - Implement one tool at a time
3. **Testing** - Comprehensive testing before merging
4. **Documentation** - Update API docs and examples
5. **Release** - Include in next version release

## 📋 **Roadmap Summary**

| Phase | Timeline | Priority | Status   | Focus Area                     |
| ----- | -------- | -------- | -------- | ------------------------------ |
| 1     | Q1 2024  | High     | Planning | Core Editor Operations         |
| 2     | Q2 2024  | Medium   | Planning | Advanced Search & Organization |
| 3     | Q3 2024  | Medium   | Planning | UI & User Experience           |
| 4     | Q4 2024  | Low      | Planning | Advanced Data & Git Operations |

---

_This roadmap will be updated as development progresses and new requirements are identified._
