import type { ValidationResult } from './validator.js';

export interface FileResult {
  file: string;
  valid: boolean;
  schema?: string;
  errors: Array<{ path: string; message: string }>;
}

export interface JsonEnvelope {
  results: FileResult[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
  };
  error?: string;
}

export function toFileResult(
  fileName: string,
  result: ValidationResult,
  schema?: string
): FileResult {
  const fileResult: FileResult = {
    file: fileName,
    valid: result.valid,
    errors: result.errors,
  };
  if (schema) {
    fileResult.schema = schema;
  }
  return fileResult;
}

export function formatJsonOutput(
  results: FileResult[],
  fatalError?: string
): string {
  const valid = results.filter((r) => r.valid).length;

  const envelope: JsonEnvelope = {
    results,
    summary: {
      total: results.length,
      valid,
      invalid: results.length - valid,
    },
  };

  if (fatalError) {
    envelope.error = fatalError;
  }

  return JSON.stringify(envelope, null, 2);
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

export function printPlainResult(result: FileResult): void {
  if (result.valid) {
    process.stdout.write(`VALID\t${result.file}\t${result.schema || ''}\n`);
  } else {
    for (const error of result.errors) {
      process.stdout.write(
        `INVALID\t${result.file}\t${result.schema || ''}\t${error.path}\t${error.message}\n`
      );
    }
  }
}

export function printPlainError(file: string, message: string): void {
  process.stdout.write(`ERROR\t${file}\t${message}\n`);
}

export function printProgress(message: string): void {
  if (process.stderr.isTTY) {
    process.stderr.write(`${message}\n`);
  }
}
