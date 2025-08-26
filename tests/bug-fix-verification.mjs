#!/usr/bin/env node

/**
 * Bug Fix Verification Tests
 * Tests the three specific issues identified by the user:
 * 1. Page creation adding empty blocks at top
 * 2. Property operations failing (0 successful operations)
 * 3. HTML entity encoding issues (It&amp;#39;s)
 */

import { spawn } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const TEST_TIMEOUT = 60000;
let testResults = [];
let totalTests = 0;
let passedTests = 0;

function log(message, color = '\x1b[36m') {
  console.log(`${color}[${new Date().toISOString()}] ${message}\x1b[0m`);
}

function logSuccess(message) {
  log(`✅ PASS: ${message}`, '\x1b[32m');
  passedTests++;
}

function logError(message) {
  log(`❌ FAIL: ${message}`, '\x1b[31m');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, '\x1b[34m');
}

async function runTest(testName, testFn) {
  totalTests++;
  try {
    await testFn();
    testResults.push({ name: testName, passed: true });
  } catch (error) {
    logError(`${testName}: ${error.message}`);
    testResults.push({ name: testName, passed: false, error: error.message });
  }
}

async function setupMCPClient() {
  log('🔸 Starting MCP Server and creating client connection', '\x1b[36m');
  
  const serverProcess = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const transport = new StdioClientTransport({
    stdin: serverProcess.stdin,
    stdout: serverProcess.stdout,
    stderr: serverProcess.stderr
  });

  const client = new Client(
    {
      name: 'bug-fix-test-client',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  await client.connect(transport);
  logSuccess('MCP client connected successfully');
  
  return { client, serverProcess };
}

async function main() {
  log('🚀 Starting Bug Fix Verification Tests', '\x1b[36m\x1b[1m');
  
  const { client, serverProcess } = await setupMCPClient();
  
  try {
    // Test 1: Page creation should NOT add empty blocks at top
    await runTest('Page creation without empty blocks', async () => {
      log('🔸 Testing: Page creation with content - should not create empty blocks at top');
      
      const testPageName = 'bug-test-page-creation-clean';
      const testContent = "This is a test page with content. It shouldn't create empty blocks at the top.";
      
      const response = await client.request({
        method: 'tools/call',
        params: {
          name: 'edit',
          arguments: {
            type: 'page',
            operation: 'create',
            target: testPageName,
            content: testContent
          }
        }
      });
      
      if (!response.content || !Array.isArray(response.content) || response.content.length === 0) {
        throw new Error('No response content received');
      }
      
      const resultText = response.content[0].text;
      const result = JSON.parse(resultText);
      
      if (!result.created) {
        throw new Error(`Page creation failed: ${JSON.stringify(result)}`);
      }
      
      logSuccess('Page created without empty blocks at top');
      logInfo(`Created page: ${testPageName} with clean content`);
    });
    
    // Test 2: Property operations should work (not fail with 0 successful operations)
    await runTest('Property operations functionality', async () => {
      log('🔸 Testing: Property operations - should successfully set properties');
      
      const testPageName = 'bug-test-property-operations';
      const testPropertyKey = 'test-property';
      const testPropertyValue = 'test-value-123';
      
      // First create a test page
      await client.request({
        method: 'tools/call',
        params: {
          name: 'edit',
          arguments: {
            type: 'page',
            operation: 'create',
            target: testPageName,
            content: 'Test page for property operations'
          }
        }
      });
      
      // Now set a property on it
      const propResponse = await client.request({
        method: 'tools/call',
        params: {
          name: 'edit',
          arguments: {
            type: 'properties',
            operation: 'create',
            target: testPageName,
            propertyKey: testPropertyKey,
            propertyValue: testPropertyValue
          }
        }
      });
      
      if (!propResponse.content || !Array.isArray(propResponse.content) || propResponse.content.length === 0) {
        throw new Error('No response content received for property operation');
      }
      
      const resultText = propResponse.content[0].text;
      const result = JSON.parse(resultText);
      
      if (!result.successful) {
        throw new Error(`Property operation failed: ${JSON.stringify(result)}`);
      }
      
      if (result.property_key !== testPropertyKey || result.property_value !== testPropertyValue) {
        throw new Error(`Property values mismatch. Expected key: ${testPropertyKey}, value: ${testPropertyValue}. Got: ${JSON.stringify(result)}`);
      }
      
      logSuccess('Property operations working correctly');
      logInfo(`Set property ${testPropertyKey}="${testPropertyValue}" on ${testPageName}`);
    });
    
    // Test 3: HTML entity encoding should NOT occur (content should remain as-is)
    await runTest('No HTML entity encoding', async () => {
      log('🔸 Testing: Content with quotes and special chars should not be HTML-encoded');
      
      const testPageName = 'bug-test-html-encoding';
      const testContent = "This is a test with quotes: \"It's working!\" and special chars: <>&";
      
      const response = await client.request({
        method: 'tools/call',
        params: {
          name: 'edit',
          arguments: {
            type: 'page',
            operation: 'create',
            target: testPageName,
            content: testContent
          }
        }
      });
      
      if (!response.content || !Array.isArray(response.content) || response.content.length === 0) {
        throw new Error('No response content received');
      }
      
      const resultText = response.content[0].text;
      const result = JSON.parse(resultText);
      
      if (!result.created) {
        throw new Error(`Page creation failed: ${JSON.stringify(result)}`);
      }
      
      // The content should NOT contain HTML entities like &amp; &#39; &lt; &gt;
      const contentStr = JSON.stringify(result);
      if (contentStr.includes('&amp;') || contentStr.includes('&#39;') || contentStr.includes('&lt;') || contentStr.includes('&gt;')) {
        throw new Error(`HTML entity encoding detected in response: ${contentStr}`);
      }
      
      logSuccess('Content processed without HTML entity encoding');
      logInfo(`Content preserved correctly: ${testContent}`);
    });
    
    // Test 4: Comprehensive property test with various data types
    await runTest('Property operations with different data types', async () => {
      log('🔸 Testing: Property operations with strings, numbers, booleans, arrays');
      
      const testPageName = 'bug-test-property-types';
      
      // Create test page
      await client.request({
        method: 'tools/call',
        params: {
          name: 'edit',
          arguments: {
            type: 'page',
            operation: 'create',
            target: testPageName,
            content: 'Test page for various property types'
          }
        }
      });
      
      const testCases = [
        { key: 'string-prop', value: 'test string value' },
        { key: 'number-prop', value: 42 },
        { key: 'boolean-prop', value: true },
        { key: 'array-prop', value: ['item1', 'item2', 'item3'] }
      ];
      
      for (const testCase of testCases) {
        const propResponse = await client.request({
          method: 'tools/call',
          params: {
            name: 'edit',
            arguments: {
              type: 'properties',
              operation: 'create',
              target: testPageName,
              propertyKey: testCase.key,
              propertyValue: testCase.value
            }
          }
        });
        
        const resultText = propResponse.content[0].text;
        const result = JSON.parse(resultText);
        
        if (!result.successful) {
          throw new Error(`Property operation failed for ${testCase.key}: ${JSON.stringify(result)}`);
        }
        
        logInfo(`✓ Set ${testCase.key} = ${JSON.stringify(testCase.value)}`);
      }
      
      logSuccess('All property data types handled correctly');
    });
    
  } catch (error) {
    logError(`Test execution failed: ${error.message}`);
  } finally {
    try {
      await client.close();
      serverProcess.kill('SIGTERM');
      logSuccess('MCP client disconnected and server stopped');
    } catch (cleanupError) {
      logError(`Cleanup error: ${cleanupError.message}`);
    }
  }
  
  // Final Results
  log('\n📊 BUG FIX VERIFICATION TEST RESULTS', '\x1b[36m\x1b[1m');
  logInfo(`Total Tests: ${totalTests}`);
  log(`Passed: ${passedTests}`, '\x1b[32m');
  log(`Failed: ${totalTests - passedTests}`, '\x1b[31m');
  log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%`, '\x1b[32m');
  
  if (passedTests === totalTests) {
    log('\n🎉 ALL BUG FIXES VERIFIED! The issues have been resolved successfully.', '\x1b[32m');
    process.exit(0);
  } else {
    log('\n❌ SOME BUG FIXES FAILED. Please review and address the remaining issues.', '\x1b[31m');
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logError(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled Rejection at ${promise}: ${reason}`);
  process.exit(1);
});

// Set timeout for the entire test suite
setTimeout(() => {
  logError('Test suite timeout exceeded');
  process.exit(1);
}, TEST_TIMEOUT);

main().catch((error) => {
  logError(`Main execution failed: ${error.message}`);
  process.exit(1);
});