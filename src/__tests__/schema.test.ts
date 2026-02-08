import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SchemaCache, resolveSchemaSource } from '../schema.js';

const fixturesDir = path.join(import.meta.dirname, 'fixtures');
const schemaPath = path.join(fixturesDir, 'schema.json');

describe('SchemaCache', () => {
  describe('local files', () => {
    it('loads a local schema file', async () => {
      const cache = new SchemaCache();
      const schema = await cache.load(schemaPath, 5000);
      expect(schema).toHaveProperty('type', 'object');
      expect(schema).toHaveProperty('required');
    });

    it('throws for nonexistent local file', async () => {
      const cache = new SchemaCache();
      await expect(
        cache.load('/nonexistent/schema.json', 5000)
      ).rejects.toThrow('Schema file not found');
    });

    it('throws for non-JSON local file', async () => {
      const badPath = path.join(fixturesDir, 'malformed.json');
      const cache = new SchemaCache();
      await expect(cache.load(badPath, 5000)).rejects.toThrow(
        'not valid JSON'
      );
    });

    it('caches schemas by path', async () => {
      const cache = new SchemaCache();
      const first = await cache.load(schemaPath, 5000);
      const second = await cache.load(schemaPath, 5000);
      expect(first).toBe(second); // same object reference
      expect(cache.size).toBe(1);
    });
  });

  describe('URL schemas', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('downloads and caches a URL schema', async () => {
      const fakeSchema = { type: 'object' };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(fakeSchema), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const cache = new SchemaCache();
      const schema = await cache.load('https://example.com/schema.json', 5000);
      expect(schema).toEqual(fakeSchema);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Second load should use cache, no second fetch
      const cached = await cache.load('https://example.com/schema.json', 5000);
      expect(cached).toBe(schema);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('throws on HTTP error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Not Found', { status: 404 })
      );

      const cache = new SchemaCache();
      await expect(
        cache.load('https://example.com/missing.json', 5000)
      ).rejects.toThrow('HTTP 404');
    });

    it('throws on network failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(
        new TypeError('fetch failed')
      );

      const cache = new SchemaCache();
      await expect(
        cache.load('https://example.com/schema.json', 5000)
      ).rejects.toThrow('fetch failed');
    });
  });
});

describe('resolveSchemaSource', () => {
  it('uses --schema flag when provided', () => {
    const source = resolveSchemaSource({ $schema: 'from-file' }, 'from-flag');
    expect(source).toBe('from-flag');
  });

  it('falls back to $schema property', () => {
    const source = resolveSchemaSource({ $schema: 'from-file' });
    expect(source).toBe('from-file');
  });

  it('throws when no schema available', () => {
    expect(() => resolveSchemaSource({})).toThrow(
      'No $schema property found'
    );
  });

  it('includes hint about --schema flag in error', () => {
    expect(() => resolveSchemaSource({})).toThrow('--schema');
  });
});
