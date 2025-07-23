#!/usr/bin/env node

import { Command } from 'commander';
import { validateJsonFile } from './validator.js';
import path from 'path';
import fs from 'fs';

// Read version from package.json
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const program = new Command();

program
  .name('json-validator')
  .description('CLI tool to validate JSON files against JSON schemas')
  .version(packageJson.version)
  .argument('<file>', 'JSON file to validate')
  .option('-s, --schema <url>', 'URL of the schema to validate against (overrides $schema in file)')
  .action(async (file: string, options: { schema?: string }) => {
    try {
      // Resolve file path
      const filePath = path.resolve(file);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error(`Error: File '${file}' not found`);
        process.exit(1);
      }

      // Validate the JSON file
      const result = await validateJsonFile(filePath, options.schema);
      
      if (result.isValid) {
        console.log('Valid');
        process.exit(0);
      } else {
        // Output validation errors
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach(error => console.error(error));
        }
        process.exit(1);
      }
    } catch (error) {
      console.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

program.parse();
