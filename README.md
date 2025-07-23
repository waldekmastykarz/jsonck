# JSON Validator CLI

A command-line tool to validate JSON files against JSON schemas.

## Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Link globally: `npm link`

## Usage

```bash
json-validator <file> [options]
```

### Arguments

- `<file>` - Path to the JSON file to validate

### Options

- `-s, --schema <url>` - URL of the schema to validate against (overrides $schema in file)
- `-V, --version` - Output the version number
- `-h, --help` - Display help information

### Exit Codes

- `0` - File is valid
- `1` - File is invalid or an error occurred

### Examples

#### Validate a JSON file using its embedded $schema property:
```bash
json-validator data.json
```

#### Validate a JSON file against a specific schema:
```bash
json-validator data.json --schema https://json-schema.org/draft-07/schema
```

#### Check exit code in scripts:
```bash
if json-validator data.json; then
    echo "Valid JSON"
else
    echo "Invalid JSON"
fi
```

### Output

- **Valid file**: Prints "Valid" to stdout and exits with code 0
- **Invalid file**: Prints validation errors to stderr and exits with code 1
- **Missing schema**: Prints error message and exits with code 1

## Development

### Build
```bash
npm run build
```

### Debug
Set the `DEBUG` environment variable to see detailed validation logs:
```bash
DEBUG=json-validator json-validator data.json
```

## Dependencies

- [AJV](https://ajv.js.org/) - JSON Schema validator
- [ajv-formats](https://github.com/ajv-validator/ajv-formats) - Format validation for AJV
- [Commander.js](https://github.com/tj/commander.js) - Command-line interface framework
- [debug](https://github.com/debug-js/debug) - Debug logging
