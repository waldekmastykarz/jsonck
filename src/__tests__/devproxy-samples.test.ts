import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'node:fs/promises';
import { SchemaCache, resolveSchemaSource } from '../schema.js';
import { parseJson } from '../input.js';
import { validate } from '../validator.js';

const SAMPLES_DIR =
  '/Users/waldek/github/pnp/proxy-samples/samples';

const samplesExist = fs.existsSync(SAMPLES_DIR);

describe.skipIf(!samplesExist)(
  'Dev Proxy samples smoke tests',
  () => {
    it('validates all devproxyrc.json files against their declared schemas', async () => {
      const cache = new SchemaCache();
      const files: string[] = [];

      // Collect all JSON files under .devproxy/ directories
      for await (const entry of glob(
        path.join(SAMPLES_DIR, '*/.devproxy/*.json')
      )) {
        files.push(entry);
      }

      expect(files.length).toBeGreaterThan(0);

      let validated = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        const json = parseJson(content, file) as Record<string, unknown>;

        // Only validate files with a top-level $schema
        if (!json['$schema']) {
          skipped++;
          continue;
        }

        try {
          const schemaSource = resolveSchemaSource(json);
          const schema = await cache.load(schemaSource, 30000);
          const result = validate(json, schema);

          if (!result.valid) {
            errors.push(
              `${file}: ${result.errors.map((e) => `${e.path}: ${e.message}`).join(', ')}`
            );
          }
          validated++;
        } catch (err) {
          errors.push(
            `${file}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }

      // Report stats
      console.log(
        `Dev Proxy samples: ${validated} validated, ${skipped} skipped (no $schema), ${cache.size} unique schemas`
      );

      // All maintained samples should be valid
      expect(errors).toEqual([]);
      // Sanity: we should have validated a meaningful number
      expect(validated).toBeGreaterThan(40);
      // Schema cache should have far fewer entries than files
      expect(cache.size).toBeLessThan(validated);
    }, 60000); // 60s timeout for network fetches
  }
);
