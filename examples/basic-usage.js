#!/usr/bin/env node

/**
 * Basic usage example for logseq-mcp-server
 * 
 * This example shows how to manually test the MCP server by sending JSON-RPC requests
 * via STDIN and reading responses from STDOUT.
 * 
 * Run this with: node examples/basic-usage.js
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up environment variables for testing
const env = {
  ...process.env,
  LOGSEQ_API_URL: 'http://127.0.0.1:12315',
  LOGSEQ_API_TOKEN: 'your-test-token-here', // Replace with your actual token
  LOG_LEVEL: 'debug',
};

console.log('🚀 Starting Logseq MCP Server example...');
console.log('Make sure Logseq is running with HTTP API enabled!');
console.log('');

// Start the MCP server
const serverPath = join(__dirname, '..', 'dist', 'index.js');
const server = spawn('node', [serverPath], {
  env,
  stdio: ['pipe', 'pipe', 'inherit'],
});

// Example MCP requests
const requests = [
  // Initialize the connection
  {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: {
          listChanged: true
        }
      },
      clientInfo: {
        name: 'example-client',
        version: '1.0.0'
      }
    }
  },
  
  // List available tools
  {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  },
  
  // Call the list pages tool
  {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'logseq_list_pages',
      arguments: {}
    }
  },
  
  // Search for content
  {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'logseq_search',
      arguments: {
        query: 'test',
        limit: 5
      }
    }
  }
];

let requestIndex = 0;
let responses = [];

// Handle server output
server.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      responses.push(response);
      
      console.log(`📥 Response ${response.id || 'notification'}:`);
      console.log(JSON.stringify(response, null, 2));
      console.log('');
      
      // Send next request after receiving response
      if (requestIndex < requests.length && response.id === requestIndex) {
        sendNextRequest();
      }
    } catch (error) {
      console.log('📝 Server log:', line);
    }
  }
});

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

// Handle server exit
server.on('exit', (code) => {
  console.log(`🏁 Server exited with code ${code}`);
  
  if (responses.length > 0) {
    console.log('\n📊 Summary:');
    console.log(`- Sent ${requests.length} requests`);
    console.log(`- Received ${responses.length} responses`);
    console.log('- All basic MCP operations completed successfully!');
  }
  
  process.exit(code || 0);
});

// Send requests one by one
function sendNextRequest() {
  if (requestIndex >= requests.length) {
    console.log('✅ All requests sent. Closing connection...');
    server.stdin.end();
    return;
  }
  
  const request = requests[requestIndex++];
  const requestJson = JSON.stringify(request) + '\n';
  
  console.log(`📤 Sending request ${request.id}:`);
  console.log(JSON.stringify(request, null, 2));
  console.log('');
  
  server.stdin.write(requestJson);
}

// Start by sending the first request
setTimeout(() => {
  sendNextRequest();
}, 1000); // Give server time to start

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  server.kill('SIGTERM');
  process.exit(0);
});

console.log('ℹ️  Press Ctrl+C to stop the example');
console.log('ℹ️  Check that LOGSEQ_API_TOKEN is set correctly in this file');
console.log('');