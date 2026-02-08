# JSON Validator CLI

Validate JSON files against JSON schemas. Supports local files, URLs, stdin, batch validation, and structured JSON output for scripts and LLMs.

## Installation

```bash
npm install -g json-validator
```

Requires Node.js >= 20.

## Examples

Validate a file using its embedded `$schema`:

```bash
json-validator data.json
```

Validate against a specific schema (local file or URL):

```bash
json-validator data.json --schema ./schemas/my-schema.json
json-validator data.json --schema https://example.com/schema.json
```

Validate JSON from stdin (pipe from jq, curl, etc.):

```bash
cat data.json | json-validator - --schema ./schema.json
jq '.config' big.json | json-validator - --schema ./config-schema.json
curl -s https://api.example.com/data | json-validator --schema ./schema.json
```

Validate multiple files at once:

```bash
json-validator *.json --schema ./schema.json
```

Get structured JSON output (for scripts, CI, LLMs):

```bash
json-validator data.json --schema ./schema.json --json
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

Use exit codes in scripts:

```bash
if json-validator data.json --schema ./schema.json; then
  echo "Valid"
else
  echo "Invalid"
fi
```

## Usage

```
json-validator [files...] [options]
```

### Arguments

- `[files...]` — JSON files to validate. Use `-` for stdin. When no files are given and stdin is piped, reads from stdin automatically.

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-s, --schema <path-or-url>` | Schema file path or URL (overrides `$schema` in files) | — |
| `--json` | Output results as structured JSON to stdout | `false` |
| `--timeout <ms>` | Timeout for schema downloads | `30000` |
| `-V, --version` | Output version number | — |
| `-h, --help` | Display help | — |

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All files are valid |
| `1` | One or more files are invalid |
| `2` | Usage or runtime error (missing file, bad JSON, no schema, timeout) |

### Output Modes

**Text mode** (default): Prints `Valid` or `Invalid` to stdout/stderr. In batch mode, prefixes each line with the filename.

**JSON mode** (`--json`): Writes the full result to stdout. Single file produces a JSON object; multiple files produce a JSON array. Nothing is written to stderr (except fatal crashes). This is the recommended mode for scripts, CI pipelines, and LLM tool calls.

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Debug

```bash
DEBUG=json-validator json-validator data.json
```

## Dependencies

- [Ajv](https://ajv.js.org/) — JSON Schema validator (2020-12)
- [ajv-formats](https://github.com/ajv-validator/ajv-formats) — Format validation
- [Commander.js](https://github.com/tj/commander.js) — CLI framework
- [debug](https://github.com/debug-js/debug) — Debug logging
