#!/usr/bin/env node

// Simple test script to simulate what Claude Desktop does
import { spawn } from 'child_process';

const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Send a tools/list request like Claude Desktop would
const request = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list'
};

console.log('Sending request:', JSON.stringify(request));
server.stdin.write(JSON.stringify(request) + '\n');

server.stdout.on('data', (data) => {
  console.log('Server response:', data.toString());
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});

// Keep the test running for a few seconds
setTimeout(() => {
  console.log('Closing server...');
  server.kill();
}, 5000);