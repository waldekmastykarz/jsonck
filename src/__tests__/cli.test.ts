import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const exec = promisify(execFile);
const CLI = path.resolve(import.meta.dirname, '../../dist/cli.js');
const FIXTURES = path.resolve(import.meta.dirname, 'fixtures');
const SCHEMA = path.join(FIXTURES, 'schema.json');
const VALID = path.join(FIXTURES, 'valid.json');
const INVALID = path.join(FIXTURES, 'invalid.json');
const NO_SCHEMA = path.join(FIXTURES, 'no-schema.json');
const MALFORMED = path.join(FIXTURES, 'malformed.json');

async function run(
  args: string[],
  options?: { input?: string }
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const result = await exec('node', [CLI, ...args], {
      timeout: 15000,
      ...(options?.input ? {} : {}),
    });
    return { stdout: result.stdout, stderr: result.stderr, exitCode: 0 };
  } catch (err: unknown) {
    const e = err as {
      stdout?: string;
      stderr?: string;
      code?: number;
    };
    return {
      stdout: e.stdout || '',
      stderr: e.stderr || '',
      exitCode: e.code || 1,
    };
  }
}

async function runWithStdin(
  args: string[],
  input: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = require('node:child_process').execFile(
      'node',
      [CLI, ...args],
      { timeout: 15000 },
      (err: unknown, stdout: string, stderr: string) => {
        const e = err as { code?: number } | null;
        resolve({
          stdout: stdout || '',
          stderr: stderr || '',
          exitCode: e ? e.code || 1 : 0,
        });
      }
    );
    proc.stdin.write(input);
    proc.stdin.end();
  });
}

describe('CLI integration', () => {
  describe('file validation', () => {
    it('validates a valid file with local schema', async () => {
      const { stdout, exitCode } = await run([
        VALID,
        '--schema',
        SCHEMA,
      ]);
      expect(exitCode).toBe(0);
      expect(stdout.trim()).toBe('Valid');
    });

    it('rejects an invalid file with local schema', async () => {
      const { stderr, exitCode } = await run([
        INVALID,
        '--schema',
        SCHEMA,
      ]);
      expect(exitCode).toBe(1);
      expect(stderr).toContain('Invalid');
    });

    it('exits 2 for nonexistent file', async () => {
      const { stderr, exitCode } = await run([
        '/nonexistent/file.json',
        '--schema',
        SCHEMA,
      ]);
      expect(exitCode).toBe(2);
      expect(stderr).toContain('not found');
    });

    it('exits 2 for malformed JSON', async () => {
      const { stderr, exitCode } = await run([
        MALFORMED,
        '--schema',
        SCHEMA,
      ]);
      expect(exitCode).toBe(2);
      expect(stderr).toContain('invalid syntax');
    });

    it('exits 2 when no schema available', async () => {
      const { stderr, exitCode } = await run([NO_SCHEMA]);
      expect(exitCode).toBe(2);
      expect(stderr).toContain('No $schema');
      expect(stderr).toContain('--schema');
    });
  });

  describe('--json output', () => {
    it('outputs structured JSON for valid file', async () => {
      const { stdout, exitCode } = await run([
        VALID,
        '--schema',
        SCHEMA,
        '--json',
      ]);
      expect(exitCode).toBe(0);
      const envelope = JSON.parse(stdout);
      expect(envelope.results).toHaveLength(1);
      expect(envelope.summary).toEqual({ total: 1, valid: 1, invalid: 0 });
      const result = envelope.results[0];
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.file).toContain('valid.json');
      expect(result.schema).toContain('schema.json');
    });

    it('outputs structured JSON for invalid file', async () => {
      const { stdout, exitCode } = await run([
        INVALID,
        '--schema',
        SCHEMA,
        '--json',
      ]);
      expect(exitCode).toBe(1);
      const envelope = JSON.parse(stdout);
      expect(envelope.results).toHaveLength(1);
      expect(envelope.summary.invalid).toBe(1);
      const result = envelope.results[0];
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toHaveProperty('path');
      expect(result.errors[0]).toHaveProperty('message');
      expect(result.schema).toContain('schema.json');
    });

    it('outputs JSON envelope for batch validation', async () => {
      const { stdout, exitCode } = await run([
        VALID,
        INVALID,
        '--schema',
        SCHEMA,
        '--json',
      ]);
      expect(exitCode).toBe(1); // at least one invalid
      const envelope = JSON.parse(stdout);
      expect(envelope.results).toHaveLength(2);
      expect(envelope.summary).toEqual({ total: 2, valid: 1, invalid: 1 });
      expect(envelope.results[0].valid).toBe(true);
      expect(envelope.results[1].valid).toBe(false);
    });
  });

  describe('stdin', () => {
    it('validates JSON from stdin with -', async () => {
      const json = JSON.stringify({ name: 'test', version: '1.0.0' });
      const { stdout, exitCode } = await runWithStdin(
        ['-', '--schema', SCHEMA],
        json
      );
      expect(exitCode).toBe(0);
      expect(stdout.trim()).toBe('Valid');
    });

    it('rejects invalid JSON from stdin', async () => {
      const json = JSON.stringify({ name: 123 });
      const { stderr, exitCode } = await runWithStdin(
        ['-', '--schema', SCHEMA],
        json
      );
      expect(exitCode).toBe(1);
      expect(stderr).toContain('Invalid');
    });

    it('outputs JSON for stdin with --json', async () => {
      const json = JSON.stringify({ name: 'test', version: '1.0.0' });
      const { stdout, exitCode } = await runWithStdin(
        ['-', '--schema', SCHEMA, '--json'],
        json
      );
      expect(exitCode).toBe(0);
      const envelope = JSON.parse(stdout);
      const result = envelope.results[0];
      expect(result.valid).toBe(true);
      expect(result.file).toBe('<stdin>');
    });

    it('handles malformed stdin JSON', async () => {
      const { stderr, exitCode } = await runWithStdin(
        ['-', '--schema', SCHEMA],
        '{ broken json'
      );
      expect(exitCode).toBe(2);
      expect(stderr).toContain('invalid syntax');
    });
  });

  describe('batch validation', () => {
    it('validates multiple files', async () => {
      const { stdout, stderr, exitCode } = await run([
        VALID,
        INVALID,
        '--schema',
        SCHEMA,
      ]);
      expect(exitCode).toBe(1);
      expect(stdout).toContain('Valid');
      expect(stderr).toContain('Invalid');
    });
  });

  describe('--quiet flag', () => {
    it('suppresses output for valid file', async () => {
      const { stdout, stderr, exitCode } = await run([
        VALID,
        '--schema',
        SCHEMA,
        '--quiet',
      ]);
      expect(exitCode).toBe(0);
      expect(stdout).toBe('');
      expect(stderr).toBe('');
    });

    it('suppresses output for invalid file', async () => {
      const { stdout, stderr, exitCode } = await run([
        INVALID,
        '--schema',
        SCHEMA,
        '--quiet',
      ]);
      expect(exitCode).toBe(1);
      expect(stdout).toBe('');
      expect(stderr).toBe('');
    });

    it('suppresses output on runtime error', async () => {
      const { stdout, stderr, exitCode } = await run([
        '/nonexistent/file.json',
        '--schema',
        SCHEMA,
        '--quiet',
      ]);
      expect(exitCode).toBe(2);
      expect(stdout).toBe('');
      expect(stderr).toBe('');
    });
  });

  describe('--plain output', () => {
    it('outputs VALID for valid file', async () => {
      const { stdout, exitCode } = await run([
        VALID,
        '--schema',
        SCHEMA,
        '--plain',
      ]);
      expect(exitCode).toBe(0);
      expect(stdout).toMatch(/^VALID\t/);
      expect(stdout).toContain('valid.json');
    });

    it('outputs INVALID for invalid file', async () => {
      const { stdout, exitCode } = await run([
        INVALID,
        '--schema',
        SCHEMA,
        '--plain',
      ]);
      expect(exitCode).toBe(1);
      expect(stdout).toMatch(/INVALID\t/);
      expect(stdout).toContain('invalid.json');
    });

    it('outputs ERROR for runtime error', async () => {
      const { stdout, exitCode } = await run([
        NO_SCHEMA,
        '--plain',
      ]);
      expect(exitCode).toBe(2);
      expect(stdout).toMatch(/ERROR\t/);
    });

    it('includes schema source in output', async () => {
      const { stdout } = await run([
        VALID,
        '--schema',
        SCHEMA,
        '--plain',
      ]);
      expect(stdout).toContain('schema.json');
    });
  });
});
