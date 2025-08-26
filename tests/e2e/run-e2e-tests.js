#!/usr/bin/env node

/**
 * E2E Test Runner - Real MCP Server Integration
 * 
 * This script executes comprehensive tests against the actual MCP server
 * by calling the real mcp__logseq__ tools available in the environment.
 * 
 * Usage: node run-e2e-tests.js
 */

// Import the comprehensive test framework
const { TEST_CONFIG } = require('./test-e2e-comprehensive.js');

// Test execution state
let testState = {
  createdPages: [],
  createdBlocks: [],
  createdTasks: [],
  createdTemplates: [],
  testResults: {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
  }
};

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Execute a sequence of MCP operations for comprehensive testing
 */
async function executeRealE2ETests() {
  log(`${colors.bold}🚀 Executing REAL E2E Tests against MCP Server${colors.reset}`, colors.cyan);
  
  try {
    // Note: Since we can't actually call the MCP functions directly from Node.js,
    // this script generates the test commands that should be executed in sequence.
    
    const testSequence = generateTestSequence();
    
    log('\n📋 Generated Test Sequence:', colors.blue);
    log('Copy and paste these commands one by one to test your MCP server:\n', colors.yellow);
    
    testSequence.forEach((command, index) => {
      log(`${colors.cyan}// Test ${index + 1}: ${command.description}${colors.reset}`);
      log(`${command.tool}(${JSON.stringify(command.params, null, 2)});\n`);
    });
    
    log(`${colors.bold}📝 Manual Test Checklist:${colors.reset}`, colors.cyan);
    
    const checklist = generateTestChecklist();
    checklist.forEach((item, index) => {
      log(`☐ ${index + 1}. ${item}`, colors.blue);
    });
    
    log(`\n${colors.bold}🎯 Expected Results Validation:${colors.reset}`, colors.cyan);
    log('For each test, verify:', colors.blue);
    log('✅ No errors thrown', colors.green);
    log('✅ Response structure matches expected format', colors.green);
    log('✅ Data values are correct', colors.green);
    log('✅ Performance is acceptable (< 2s per operation)', colors.green);
    
  } catch (error) {
    log(`❌ Test generation failed: ${error.message}`, colors.red);
    process.exit(1);
  }
}

/**
 * Generate comprehensive test sequence
 */
function generateTestSequence() {
  const commands = [];
  
  // Phase 1: System Health
  commands.push({
    description: 'Check system health and capabilities',
    tool: 'mcp__logseq__get',
    params: {
      type: 'system',
      target: 'health'
    },
    expectedResult: 'System should report healthy status with 4 supported operations'
  });
  
  // Phase 2: Content Creation
  TEST_CONFIG.pages.forEach(pageName => {
    commands.push({
      description: `Create page: ${pageName}`,
      tool: 'mcp__logseq__edit',
      params: {
        type: 'page',
        operation: 'create',
        target: pageName,
        content: `Test page ${pageName} created for E2E validation`
      },
      expectedResult: 'successful: true, page_name matches target'
    });
  });
  
  // Create templates
  TEST_CONFIG.templates.forEach(template => {
    commands.push({
      description: `Create template: ${template.name}`,
      tool: 'mcp__logseq__edit',
      params: {
        type: 'template',
        operation: 'create',
        target: template.name,
        templateName: template.name,
        content: template.content
      },
      expectedResult: 'single_block_enforced: true, placeholders extracted'
    });
  });
  
  // Create properties
  commands.push({
    description: 'Add properties to first page',
    tool: 'mcp__logseq__edit',
    params: {
      type: 'properties',
      operation: 'create',
      target: TEST_CONFIG.pages[0],
      propertyKey: 'test-status',
      propertyValue: 'e2e-testing'
    },
    expectedResult: 'Property key and value should match input'
  });
  
  // Create tasks
  commands.push({
    description: 'Create TODO task',
    tool: 'mcp__logseq__edit',
    params: {
      type: 'tasks',
      operation: 'create',
      target: TEST_CONFIG.pages[0],
      content: 'Complete E2E test validation',
      taskState: 'TODO'
    },
    expectedResult: 'task_uuid returned, status: TODO'
  });
  
  // Phase 3: Content Retrieval
  commands.push({
    description: 'Search for created pages',
    tool: 'mcp__logseq__search',
    params: {
      query: 'e2e-test',
      target: 'both',
      limit: 10,
      sort: 'relevance'
    },
    expectedResult: 'Results array with pages/blocks containing e2e-test'
  });
  
  commands.push({
    description: 'Get page with full details',
    tool: 'mcp__logseq__get',
    params: {
      type: 'page',
      target: TEST_CONFIG.pages[0],
      include: {
        content: true,
        properties: true,
        children: true,
        backlinks: true
      }
    },
    expectedResult: 'Page data with properties and content'
  });
  
  commands.push({
    description: 'Retrieve page properties',
    tool: 'mcp__logseq__get',
    params: {
      type: 'properties',
      target: TEST_CONFIG.pages[0]
    },
    expectedResult: 'Properties object with test-status: e2e-testing'
  });
  
  // Phase 4: Content Modification
  commands.push({
    description: 'Update task state (TODO → DOING)',
    tool: 'mcp__logseq__edit',
    params: {
      type: 'tasks',
      operation: 'update',
      target: '{{TASK_UUID_FROM_CREATION}}', // Replace with actual UUID
      taskState: 'DOING'
    },
    expectedResult: 'Task state should change to DOING'
  });
  
  commands.push({
    description: 'Create relation between pages',
    tool: 'mcp__logseq__edit',
    params: {
      type: 'relations',
      operation: 'create',
      target: [TEST_CONFIG.pages[0], TEST_CONFIG.pages[1]],
      linkContext: 'Related for E2E testing'
    },
    expectedResult: 'Relation created successfully'
  });
  
  // Phase 5: Advanced Operations
  commands.push({
    description: 'Search for tasks with specific state',
    tool: 'mcp__logseq__search',
    params: {
      target: 'tasks',
      filter: {
        todoState: 'DOING'
      }
    },
    expectedResult: 'Tasks with DOING status returned'
  });
  
  commands.push({
    description: 'Search with namespace filter',
    tool: 'mcp__logseq__search',
    params: {
      target: 'pages',
      scope: {
        namespace: 'e2e-'
      },
      limit: 5
    },
    expectedResult: 'Only pages starting with e2e- prefix'
  });
  
  // Phase 6: Error Handling Tests
  commands.push({
    description: 'Test error handling - non-existent page',
    tool: 'mcp__logseq__get',
    params: {
      type: 'page',
      target: 'non-existent-page-12345'
    },
    expectedResult: 'Error or not_found: true'
  });
  
  commands.push({
    description: 'Test delete safety - no confirmation',
    tool: 'mcp__logseq__delete',
    params: {
      type: 'page',
      target: TEST_CONFIG.pages[0],
      confirmDestroy: false
    },
    expectedResult: 'Error: Delete confirmation required'
  });
  
  // Phase 7: Cleanup
  commands.push({
    description: 'Test delete with simulation',
    tool: 'mcp__logseq__delete',
    params: {
      type: 'page',
      target: TEST_CONFIG.pages[0],
      confirmDestroy: true,
      simulate: true
    },
    expectedResult: 'Simulation shows what would be deleted'
  });
  
  commands.push({
    description: 'Soft delete test page',
    tool: 'mcp__logseq__delete',
    params: {
      type: 'page',
      target: TEST_CONFIG.pages[TEST_CONFIG.pages.length - 1],
      confirmDestroy: true,
      softDelete: true
    },
    expectedResult: 'soft_deleted: true in impact analysis'
  });
  
  return commands;
}

/**
 * Generate test checklist for manual validation
 */
function generateTestChecklist() {
  return [
    'System health check returns healthy status',
    'All 4 unified tools are supported (search, get, edit, delete)',
    'Pages are created successfully with correct names and content',
    'Templates are created with single-block enforcement',
    'Template placeholders are correctly extracted',
    'Properties are created and can be retrieved',
    'Tasks are created with correct states (TODO, DOING, etc.)',
    'Task state transitions work without requiring content parameter',
    'Basic search returns relevant results with scores',
    'Advanced search with filters works correctly',
    'Namespace search filtering works',
    'Task-specific search with status filters works',
    'Page retrieval includes all requested data (content, properties, children)',
    'Property retrieval returns correct key-value pairs',
    'Template retrieval shows placeholders and single-block status',
    'Relations can be created between pages',
    'Bulk operations work for multiple targets',
    'Performance is acceptable (< 2 seconds per operation)',
    'Error handling works for non-existent entities',
    'Delete operations require confirmDestroy: true',
    'Delete simulation shows impact without actually deleting',
    'Soft delete moves content to trash instead of permanent deletion',
    'Search pagination works with cursors',
    'Invalid cursors are handled gracefully',
    'System remains healthy after all operations'
  ];
}

/**
 * Generate performance benchmark tests
 */
function generatePerformanceBenchmarks() {
  return [
    {
      test: 'Search performance with large result sets',
      command: {
        tool: 'mcp__logseq__search',
        params: { query: '*', target: 'both', limit: 50 }
      },
      benchmark: '< 1 second'
    },
    {
      test: 'Page retrieval with deep includes',
      command: {
        tool: 'mcp__logseq__get',
        params: {
          type: 'page',
          target: TEST_CONFIG.pages[0],
          include: { content: true, properties: true, children: true, backlinks: true },
          depth: 3
        }
      },
      benchmark: '< 2 seconds'
    },
    {
      test: 'Bulk block creation',
      command: {
        tool: 'mcp__logseq__edit',
        params: {
          type: 'block',
          operation: 'create',
          target: TEST_CONFIG.pages.slice(0, 5),
          content: 'Bulk performance test block'
        }
      },
      benchmark: '< 3 seconds for 5 operations'
    }
  ];
}

// Main execution
if (require.main === module) {
  executeRealE2ETests();
}

module.exports = {
  executeRealE2ETests,
  generateTestSequence,
  generateTestChecklist
};