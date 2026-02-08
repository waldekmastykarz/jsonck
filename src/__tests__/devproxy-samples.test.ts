import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SchemaCache, resolveSchemaSource } from '../schema.js';
import { parseJson } from '../input.js';
import { validate } from '../validator.js';

const SAMPLES_DIR = path.resolve(
  import.meta.dirname,
  'fixtures/devproxy-samples'
);

describe('Dev Proxy samples', () => {
  it('validates all sample files against their declared schemas', async () => {
    const cache = new SchemaCache();
    const files = fs
      .readdirSync(SAMPLES_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => path.join(SAMPLES_DIR, f));

    expect(files.length).toBeGreaterThan(0);

    const errors: string[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const json = parseJson(content, file) as Record<string, unknown>;

      try {
        const schemaSource = resolveSchemaSource(json);
        const schema = await cache.load(schemaSource, 30000);
        const result = validate(json, schema);

        if (!result.valid) {
          errors.push(
            `${path.basename(file)}: ${result.errors.map((e) => `${e.path}: ${e.message}`).join(', ')}`
          );
        }
      } catch (err) {
        errors.push(
          `${path.basename(file)}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    expect(errors).toEqual([]);
    // One file per unique schema type, plus edge-case variants
    expect(files.length).toBe(9);
    expect(cache.size).toBe(7);
  }, 60000);
});
