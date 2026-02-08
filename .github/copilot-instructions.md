# Copilot Instructions for jsonck

## Architecture

jsonck is a focused CLI tool (published as `jsonck` on npm) that validates JSON files against JSON schemas. The codebase is intentionally small — five modules under `src/` with clear single responsibilities:

- **cli.ts** — Entry point and Commander.js program definition. Orchestrates the pipeline: resolve inputs → parse JSON → resolve schema → validate → output. Handles exit codes (0=valid, 1=invalid, 2=runtime error).
- **input.ts** — File reading and JSON parsing. Handles stdin (`-` arg or piped input) and local files.
- **schema.ts** — Schema resolution and caching. `SchemaCache` loads local files or remote URLs (with timeout via `AbortSignal.timeout`). `resolveSchemaSource` picks `--schema` flag over `$schema` in the JSON. Flag always wins.
- **validator.ts** — Wraps Ajv 2020-12 with `allErrors: true`. Strips `$schema` from the schema before compilation to avoid meta-schema conflicts. Uses `ajv-formats` for format validation.
- **output.ts** — Two output modes: text (human, to stdout/stderr) and JSON (structured, stdout only). Single file → object, multiple files → array.

Data flows linearly: `input → schema → validator → output`. There are no shared singletons except `SchemaCache` which is created per CLI invocation.

## Build & Test

```bash
npm run build    # tsc → dist/
npm test         # vitest run (requires build first — CLI tests exec dist/cli.js)
npm run test:watch  # vitest in watch mode
```

**Critical**: CLI integration tests (`cli.test.ts`) spawn `node dist/cli.js` as a child process, so you must `npm run build` before running tests. Unit tests for individual modules don't require a build.

## TypeScript Conventions

- ESM throughout (`"type": "module"` in package.json, `"module": "Node16"` in tsconfig)
- All local imports use `.js` extensions (e.g., `import { validate } from './validator.js'`)
- Target ES2022, strict mode enabled
- CJS interop pattern for Ajv: `const Ajv = (Ajv2020 as any).default || Ajv2020` — preserve this when touching validator.ts

## Testing Patterns

Tests live in `src/__tests__/` using **Vitest**. Three test layers:

1. **Unit tests** (`validator.test.ts`, `input.test.ts`, `schema.test.ts`) — Direct function imports, mock `fetch` with `vi.spyOn(globalThis, 'fetch')` for URL schemas
2. **CLI integration tests** (`cli.test.ts`) — Spawn the built CLI with `execFile`, assert on stdout/stderr/exitCode. Two helpers: `run()` for file args, `runWithStdin()` for piped input
3. **Smoke tests** (`devproxy-samples.test.ts`) — Validates real Dev Proxy sample files from a local directory. Auto-skips when the samples directory doesn't exist (`describe.skipIf`)

Test fixtures are in `src/__tests__/fixtures/` (valid.json, invalid.json, malformed.json, no-schema.json, schema.json).

## Error Handling Pattern

All user-facing errors use `Error` with descriptive messages. The CLI catches errors and routes them:
- **Text mode**: errors go to `stderr`
- **JSON mode**: errors become `{ "path": "", "message": "..." }` in the result array, or `{ "error": "..." }` for fatal pre-validation failures

Never use `console.log/error` — use `process.stdout.write` and `process.stderr.write` directly. Debug logging uses the `debug` package with namespace `jsonck` (enabled via `DEBUG=jsonck`).

## CI/CD

- CI runs on PRs to main across Node 20, 22, 24 (`.github/workflows/ci.yml`)
- Publishing triggers on `v*` tags, runs `npm publish --access public` (`.github/workflows/publish.yml`)
- Dependabot checks npm and GitHub Actions dependencies daily
