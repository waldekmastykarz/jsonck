import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { readFile, parseJson } from '../input.js';

const fixturesDir = path.join(import.meta.dirname, 'fixtures');

describe('readFile', () => {
  it('reads an existing file', () => {
    const content = readFile(path.join(fixturesDir, 'valid.json'));
    expect(content).toContain('test-package');
  });

  it('throws for nonexistent file', () => {
    expect(() => readFile('/nonexistent/file.json')).toThrow('File not found');
  });
});

describe('parseJson', () => {
  it('parses valid JSON', () => {
    const result = parseJson('{"key": "value"}', 'test.json');
    expect(result).toEqual({ key: 'value' });
  });

  it('parses arrays', () => {
    const result = parseJson('[1, 2, 3]', 'test.json');
    expect(result).toEqual([1, 2, 3]);
  });

  it('throws on invalid JSON with source name', () => {
    expect(() => parseJson('{ broken', 'myfile.json')).toThrow('myfile.json');
  });

  it('throws on invalid JSON with syntax message', () => {
    expect(() => parseJson('{ broken', 'test.json')).toThrow('invalid syntax');
  });
});
