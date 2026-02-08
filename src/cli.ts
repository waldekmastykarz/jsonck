#!/usr/bin/env node

import { Command } from 'commander';
import { createRequire } from 'node:module';
import path from 'node:path';
import debug from 'debug';
import { readStdin, readFile, parseJson, isStdinPiped } from './input.js';
import { SchemaCache, resolveSchemaSource } from './schema.js';
import { validate } from './validator.js';
import {
  toFileResult,
  formatJsonOutput,
  printTextResult,
  printProgress,
  type FileResult,
} from './output.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string };

const log = debug('jsonck');

interface CliOptions {
  schema?: string;
  json: boolean;
  timeout: number;
}

const program = new Command();

program
  .name('jsonck')
  .description('Validate JSON files against JSON schemas')
  .version(packageJson.version)
  .argument('[files...]', 'JSON files to validate (use - for stdin)')
  .option(
    '-s, --schema <path-or-url>',
    'schema file path or URL (overrides $schema in files)'
  )
  .option('--json', 'output results as JSON to stdout', false)
  .option(
    '--timeout <ms>',
    'timeout for schema downloads in milliseconds',
    (v) => parseInt(v, 10),
    30000
  )
  .addHelpText(
    'after',
    `
Examples:
  jsonck config.json                       Validate a file (uses $schema inside it)
  jsonck config.json --schema schema.json  Validate with an explicit local schema
  jsonck config.json --schema https://…    Validate with a remote schema
  jsonck *.json                            Validate multiple files at once
  cat config.json | jsonck                 Validate from piped stdin
  jsonck -                                 Read stdin explicitly
  jsonck config.json --json                Machine-readable JSON output`
  )
  .action(async (files: string[], options: CliOptions) => {
    const cache = new SchemaCache();
    const results: FileResult[] = [];
    let hasRuntimeError = false;

    // Determine inputs
    const inputs: Array<{ name: string; content: string }> = [];

    try {
      if (files.length === 0) {
        if (isStdinPiped()) {
          const content = await readStdin();
          inputs.push({ name: '<stdin>', content });
        } else {
          program.help();
          return;
        }
      } else {
        for (const file of files) {
          if (file === '-') {
            const content = await readStdin();
            inputs.push({ name: '<stdin>', content });
          } else {
            const resolved = path.resolve(file);
            const content = readFile(resolved);
            inputs.push({ name: file, content });
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (options.json) {
        process.stdout.write(
          JSON.stringify({ error: msg }, null, 2) + '\n'
        );
      } else {
        process.stderr.write(`Error: ${msg}\n`);
      }
      process.exit(2);
    }

    const isBatch = inputs.length > 1;

    for (const input of inputs) {
      try {
        const json = parseJson(input.content, input.name);

        const schemaSource = resolveSchemaSource(
          json as Record<string, unknown>,
          options.schema
        );

        if (
          !options.json &&
          schemaSource.startsWith('http') &&
          cache.size === 0
        ) {
          printProgress(`Downloading schema from ${schemaSource}...`);
        }

        const schema = await cache.load(schemaSource, options.timeout);
        const result = validate(json, schema);
        const fileResult = toFileResult(input.name, result);

        results.push(fileResult);

        if (!options.json) {
          printTextResult(fileResult, isBatch);
        }

        log(
          `${input.name}: ${result.valid ? 'valid' : 'invalid'} (${result.errors.length} errors)`
        );
      } catch (err) {
        hasRuntimeError = true;
        const msg = err instanceof Error ? err.message : String(err);
        log(`Runtime error for ${input.name}: ${msg}`);

        if (options.json) {
          results.push({
            file: input.name,
            valid: false,
            errors: [{ path: '', message: msg }],
          });
        } else {
          process.stderr.write(`${isBatch ? input.name + ': ' : ''}Error: ${msg}\n`);
        }
      }
    }

    if (options.json) {
      process.stdout.write(formatJsonOutput(results) + '\n');
    }

    // Exit codes: 0 = all valid, 1 = any invalid, 2 = runtime error
    if (hasRuntimeError) {
      process.exit(2);
    }

    const allValid = results.every((r) => r.valid);
    process.exit(allValid ? 0 : 1);
  });

program.parse();
