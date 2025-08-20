# CLAUDE.md - Logseq AI MCP Server

## Common Commands

```bash
# Development
npm run dev                 # Start development server
npm run build              # Build the project
npm run typecheck          # Run TypeScript type checking
npm run lint               # Run ESLint
npm run test               # Run test suite
npm run test:watch         # Run tests in watch mode

# Package management
npm install                # Install dependencies
npm audit                  # Check for security vulnerabilities
```

## Code Quality & Maintainability Principles

- **ALWAYS** use TypeScript with strict mode enabled
- Prefer explicit types over `any` or `unknown` when possible
- Enforce consistent code style with ESLint + Prettier (or Biome)
- Keep functions small and single-purpose (SRP)
- Use clear naming for handlers, schemas, and RPC methods
- Organize code into modules (`/handlers`, `/schemas`, `/utils`, `/tests`)
- Document public methods and exported types with JSDoc
- Use named functional components only
- Place hooks above JSX
- Split components >200 LOC
- Avoid `useEffect` unless truly needed
- Use `memo`/`useCallback`/`useMemo` only when necessary

## Runtime Safety Requirements

- **YOU MUST** validate all incoming JSON-RPC requests with Zod (or JSON Schema)
- **YOU MUST** validate all outgoing responses before sending back
- Always return proper JSON-RPC error codes (-32600, -32601, -32602, -32603)
- Avoid throwing raw errors — wrap them in structured error helpers
- Sanitize and redact sensitive data in logs

## Testing & CI Standards

- Write unit tests for each handler (Vitest/Jest)
- Add at least one integration test that spins up the server and executes RPC calls
- Use mocked inputs/outputs for edge cases (empty data, invalid payloads, timeouts)
- Run `tsc --noEmit`, lint, and test in CI pipeline
- Ensure 100% type-check clean (no ts-ignore)

## Build & Tooling

- Bundle with tsup or esbuild for small, fast CLI output
- Expose CLI entry via bin in package.json
- Use `#!/usr/bin/env node` in CLI entry point
- Ensure build outputs both CJS and ESM (for compatibility)
- Add `"type": "module"` in package.json if using ESM
- Automate versioning and changelogs with Changesets (optional)

## Git & Workflow

- Use pre-commit hooks (Husky + lint-staged) to run lint/tests only on changed files
- Commit often, use conventional commit messages (e.g. `feat:`, `fix:`, `chore:`)
- Keep dependencies minimal; prefer small, audited libraries
- Pin versions in package.json to avoid accidental breaks

## Logging & Monitoring

- Use a structured logger (e.g. pino) with log levels
- Provide debug logs for RPC input/output in dev mode
- Handle uncaught exceptions and promise rejections gracefully
- Add simple health check endpoint (optional)

## Performance & Resilience

- Add timeouts and retries for external calls
- Use async/await properly; avoid blocking I/O
- Prefer streaming/chunking for large payloads
- Benchmark critical RPC calls if performance matters

## Security Requirements

- **NEVER** trust incoming data — always validate
- Avoid exposing filesystem/network without explicit config
- Store secrets (API keys, tokens) only in env vars
- Don't log sensitive credentials
- Review dependencies with `npm audit`

## Documentation Standards

- Maintain a README with install, usage, and examples
- Add typedoc or markdown docs for RPC schemas
- Provide a minimal example script that calls the MCP server
- Document environment variables and config options

## Logseq AI MCP Server Specific Principles

### General Design Principles

- **IMPORTANT**: Always design for **minimum number of calls** and **maximum precision**
- Prefer **UUID-based operations** for blocks and tasks
- **YOU MUST** enforce `dryRun`, `strict`, `idempotencyKey`, `maxOps`, and `autofixFormat` controls
- Use **batch/atomic** operations and **macros** to collapse multi-step flows into one
- Validate and normalize all content before writing; reject or auto-fix invalid Logseq formatting
- **NEVER** create orphan pages; always suggest placement based on existing graph structure
- Provide clear, consistent error codes (`NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `LIMIT_EXCEEDED`, `BAD_QUERY`, `INTERNAL`) with hints

### Error Handling

When implementing error handling, use these standardized error codes:

- `NOT_FOUND`: Resource doesn't exist
- `VALIDATION_ERROR`: Input validation failed
- `CONFLICT`: Operation conflicts with existing state
- `LIMIT_EXCEEDED`: Operation exceeds configured limits
- `BAD_QUERY`: Query syntax or logic is invalid
- `INTERNAL`: Internal server error

### Code Organization

```
/src
  /handlers     # RPC method handlers
  /schemas      # Zod validation schemas
  /utils        # Utility functions
  /tests        # Test files
  /types        # TypeScript type definitions
```

## Project Structure

- Main entry point: `src/index.ts`
- Configuration: `.env` for environment variables
- Tests: Use Vitest/Jest with `.test.ts` suffix
- Build output: `dist/` directory

## Environment Variables

Document all required environment variables in `.env.example` and ensure they're properly validated at startup.

## IMPORTANT Reminders

- **ALWAYS** run type checking after making code changes
- **NEVER** commit without running the full test suite
- **YOU MUST** validate all inputs and outputs
- Prefer explicit error handling over silent failures
- Keep the codebase modular and testable
