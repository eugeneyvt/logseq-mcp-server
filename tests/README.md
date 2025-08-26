# Tests Directory

This directory contains all test files for the Logseq AI MCP Server.

## Structure

```
tests/
├── unit/                    # Unit tests for individual components
│   ├── config.test.ts      # Configuration validation tests
│   ├── errors.test.ts      # Error handling tests
│   ├── logger.test.ts      # Logger functionality tests
│   ├── logseq-client.test.ts # Logseq client tests
│   ├── monitoring.test.ts  # Performance monitoring tests
│   └── security.test.ts    # Security validation tests
├── e2e/                    # End-to-end integration tests
│   ├── test-e2e-comprehensive.js # Complete E2E test framework
│   └── run-e2e-tests.js   # Real MCP server integration tests
├── manual/                 # Manual testing guides
│   └── quick-test-all-features.md # 57 comprehensive manual tests
└── docs/                   # Test documentation
    └── TEMPLATE_VALIDATION_TEST.md # Template validation test docs
```

## Test Types

### Unit Tests (`/unit`)
- Individual component testing
- Mock dependencies
- Fast execution
- Run with `npm test`

### E2E Tests (`/e2e`)
- Full system integration testing
- Real MCP server calls
- Comprehensive functionality validation
- Performance benchmarking

### Manual Tests (`/manual`)
- Human-verified test scenarios
- Complex interaction patterns
- User experience validation

## Running Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests (Node.js framework)
node tests/e2e/test-e2e-comprehensive.js

# Run real MCP integration tests
node tests/e2e/run-e2e-tests.js

# Manual testing guide
# Follow tests/manual/quick-test-all-features.md
```

## Test Coverage

Current test coverage includes:
- ✅ System health and configuration
- ✅ All 4 unified tools (Search, Get, Edit, Delete)
- ✅ Entity operations (pages, blocks, properties, relations, tasks, templates)
- ✅ Error handling and validation
- ✅ Security and input sanitization
- ✅ Performance monitoring
- ✅ Template single-block enforcement
- ✅ Advanced search with pagination
- ✅ Bulk operations and batch processing

## Adding New Tests

### Unit Tests
Add new `.test.ts` files to `/unit` directory following existing patterns.

### E2E Tests
Add test scenarios to `test-e2e-comprehensive.js` or create new test files in `/e2e`.

### Manual Tests
Add test steps to `quick-test-all-features.md` or create new manual test guides in `/manual`.