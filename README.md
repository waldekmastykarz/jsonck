# jsonck

[![npm version](https://img.shields.io/npm/v/jsonck)](https://www.npmjs.com/package/jsonck)
[![license](https://img.shields.io/npm/l/jsonck)](LICENSE)
[![node](https://img.shields.io/node/v/jsonck)](https://nodejs.org)

**One command to validate any JSON file against any JSON Schema.**

Zero config when your files have `$schema`. Pipes, globs, remote schemas, and structured JSON output all work out of the box.

```bash
npx jsonck data.json
# ✓ valid
```

## Why jsonck?

- **Zero config** — reads `$schema` from your JSON files automatically
- **Pipes & globs** — `curl ... | jsonck --schema url` or `jsonck *.json`
- **JSON output** — `--json` gives structured results for scripts, CI, and LLM tool calls
- **Fast** — single Ajv instance with schema caching, no startup overhead
- **Tiny** — 5 modules, 4 runtime dependencies, nothing bloated

## Quick Start

```bash
# No install needed
npx jsonck config.json

# Or install globally
npm install -g jsonck
```

Requires Node.js >= 20.

## Examples

### Validate using embedded `$schema`

```bash
jsonck data.json
```

If the JSON file contains `"$schema": "https://..."`, jsonck downloads and validates against it automatically.

### Specify a schema explicitly

```bash
# Local file
jsonck data.json --schema ./schemas/my-schema.json

# Remote URL
jsonck data.json --schema https://example.com/schema.json
```

The `--schema` flag always overrides any `$schema` in the file.

### Pipe from stdin

```bash
cat data.json | jsonck --schema ./schema.json
curl -s https://api.example.com/data | jsonck --schema ./schema.json
jq '.config' big.json | jsonck - --schema ./config-schema.json
```

### Batch validate

```bash
jsonck *.json --schema ./schema.json
```

### Structured JSON output

Perfect for CI pipelines, scripts, and LLM tool integrations:

```bash
jsonck data.json --schema ./schema.json --json
```

```json
{
  "file": "data.json",
  "valid": false,
  "errors": [
    { "path": "/name", "message": "must be string" },
    { "path": "/age", "message": "must be >= 0" }
  ]
}
```

Multiple files produce a JSON array.

### Use in scripts

```bash
if jsonck data.json --schema ./schema.json; then
  echo "Deploying..."
else
  echo "Fix your config first."
  exit 1
fi
```

## Reference

```
jsonck [files...] [options]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `[files...]` | JSON files to validate. Use `-` for stdin. Omit to auto-read piped input. |

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-s, --schema <path-or-url>` | Schema file path or URL. Overrides `$schema` in files. | — |
| `--json` | Structured JSON output to stdout | `false` |
| `--timeout <ms>` | Timeout for remote schema downloads | `30000` |
| `-V, --version` | Print version | — |
| `-h, --help` | Print help | — |

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All files valid |
| `1` | One or more files invalid |
| `2` | Runtime error (missing file, bad JSON, no schema, network timeout) |

### Output Modes

**Text** (default) — human-readable. Prints `Valid`/`Invalid` to stdout/stderr. Batch mode prefixes each line with the filename.

**JSON** (`--json`) — machine-readable. Single file → JSON object. Multiple files → JSON array. Errors are inline, not on stderr. Recommended for scripts, CI, and LLM tool calls.

### Schema Resolution

1. `--schema` flag (always wins)
2. `$schema` property in the JSON file
3. Error if neither is found

Schemas are cached per invocation — validating 100 files against the same remote schema downloads it once.

## LLM Integration

jsonck is designed to work as a tool in LLM agent workflows. Use `--json` for structured output that's easy to parse:

```bash
jsonck config.json --schema https://example.com/schema.json --json
```

Returns a JSON object with `file`, `valid`, and `errors` fields. Exit code `0` means valid, `1` means invalid, `2` means something broke. No interactive prompts, no color codes in JSON mode — clean machine-readable output.

## Development

```bash
npm run build        # tsc → dist/
npm test             # vitest (build first — CLI tests exec dist/cli.js)
DEBUG=jsonck jsonck data.json  # debug logging
```

## License

[MIT](LICENSE)
