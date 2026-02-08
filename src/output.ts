import type { ValidationResult } from './validator.js';

export interface FileResult {
  file: string;
  valid: boolean;
  errors: Array<{ path: string; message: string }>;
}

export function toFileResult(
  fileName: string,
  result: ValidationResult
): FileResult {
  return {
    file: fileName,
    valid: result.valid,
    errors: result.errors,
  };
}

export function formatJsonOutput(results: FileResult[]): string {
  if (results.length === 1) {
    return JSON.stringify(results[0], null, 2);
  }
  return JSON.stringify(results, null, 2);
}

export function printTextResult(
  result: FileResult,
  isBatch: boolean
): void {
  const prefix = isBatch ? `${result.file}: ` : '';

  if (result.valid) {
    process.stdout.write(`${prefix}Valid\n`);
  } else {
    process.stderr.write(`${prefix}Invalid\n`);
    for (const error of result.errors) {
      process.stderr.write(`  ${error.path}: ${error.message}\n`);
    }
  }
}

export function printProgress(message: string): void {
  if (process.stderr.isTTY) {
    process.stderr.write(`${message}\n`);
  }
}
