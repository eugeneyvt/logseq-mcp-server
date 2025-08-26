#!/usr/bin/env node

/**
 * Master Test Runner
 * Orchestrates all types of tests: unit, e2e, integration
 */

import { execSync, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function logHeader(title) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`${title}`, colors.bold + colors.cyan);
  log(`${'='.repeat(60)}`, colors.cyan);
}

async function runCommand(command, description, options = {}) {
  log(`\n🔄 ${description}...`, colors.blue);
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      cwd: path.resolve(__dirname, '..'),
      ...options
    });
    log(`✅ ${description} - PASSED`, colors.green);
    if (options.showOutput && output) {
      log(output, colors.reset);
    }
    return { success: true, output };
  } catch (error) {
    log(`❌ ${description} - FAILED`, colors.red);
    log(error.message, colors.red);
    return { success: false, error: error.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'all';
  
  logHeader(`Logseq AI MCP Server Test Suite - ${testType.toUpperCase()}`);
  
  const results = {
    passed: 0,
    failed: 0,
    details: []
  };
  
  // Build check
  if (testType === 'all' || testType === 'build') {
    logHeader('BUILD VERIFICATION');
    const buildResult = await runCommand('npm run build', 'TypeScript Build');
    results.details.push(buildResult);
    if (buildResult.success) results.passed++; else results.failed++;
    
    const typeResult = await runCommand('npm run type-check', 'Type Checking');
    results.details.push(typeResult);
    if (typeResult.success) results.passed++; else results.failed++;
  }
  
  // Unit tests
  if (testType === 'all' || testType === 'unit') {
    logHeader('UNIT TESTS');
    const unitResult = await runCommand('npm test', 'Unit Test Suite');
    results.details.push(unitResult);
    if (unitResult.success) results.passed++; else results.failed++;
  }
  
  // E2E tests
  if (testType === 'all' || testType === 'e2e') {
    logHeader('END-TO-END TESTS');
    
    // Check if E2E files exist
    const e2eComprehensive = path.join(__dirname, 'e2e', 'test-e2e-comprehensive.js');
    const e2eIntegration = path.join(__dirname, 'e2e', 'run-e2e-tests.js');
    
    if (fs.existsSync(e2eComprehensive)) {
      const e2eResult = await runCommand(
        `node "${e2eComprehensive}"`, 
        'Comprehensive E2E Tests',
        { showOutput: true }
      );
      results.details.push(e2eResult);
      if (e2eResult.success) results.passed++; else results.failed++;
    }
    
    if (fs.existsSync(e2eIntegration)) {
      log(`\n📝 Integration test commands generated. See output above for manual execution.`, colors.yellow);
    }
  }
  
  // Lint check
  if (testType === 'all' || testType === 'lint') {
    logHeader('CODE QUALITY');
    const lintResult = await runCommand('npm run lint', 'ESLint Check');
    results.details.push(lintResult);
    if (lintResult.success) results.passed++; else results.failed++;
  }
  
  // Security audit
  if (testType === 'all' || testType === 'security') {
    logHeader('SECURITY AUDIT');
    const auditResult = await runCommand('npm audit --audit-level=high', 'Security Audit');
    results.details.push(auditResult);
    if (auditResult.success) results.passed++; else results.failed++;
  }
  
  // Final summary
  logHeader('TEST RESULTS SUMMARY');
  log(`✅ Passed: ${results.passed}`, colors.green);
  log(`❌ Failed: ${results.failed}`, results.failed > 0 ? colors.red : colors.green);
  log(`📊 Total: ${results.passed + results.failed}`, colors.blue);
  
  if (results.failed > 0) {
    log(`\n🔍 Failed Tests:`, colors.red);
    results.details.filter(r => !r.success).forEach((result, i) => {
      log(`   ${i + 1}. ${result.error}`, colors.red);
    });
  }
  
  log(`\n📚 Manual Tests Available:`, colors.cyan);
  log(`   • tests/manual/quick-test-all-features.md - 57 comprehensive tests`, colors.blue);
  log(`   • tests/docs/TEMPLATE_VALIDATION_TEST.md - Template validation`, colors.blue);
  
  // Exit with error code if any tests failed
  process.exit(results.failed > 0 ? 1 : 0);
}

// Handle different test types
if (import.meta.url === `file://${process.argv[1]}`) {
  const validTypes = ['all', 'unit', 'e2e', 'build', 'lint', 'security'];
  const args = process.argv.slice(2);
  const testType = args[0];
  
  if (testType && !validTypes.includes(testType)) {
    log(`❌ Invalid test type: ${testType}`, colors.red);
    log(`✅ Valid types: ${validTypes.join(', ')}`, colors.blue);
    log(`📝 Usage: node tests/run-all-tests.js [${validTypes.join('|')}]`, colors.cyan);
    process.exit(1);
  }
  
  main().catch(error => {
    log(`💥 Test runner failed: ${error.message}`, colors.red);
    process.exit(1);
  });
}