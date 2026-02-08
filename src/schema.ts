import fs from 'node:fs';
import debug from 'debug';

const log = debug('json-validator');

function isUrl(source: string): boolean {
  return source.startsWith('http://') || source.startsWith('https://');
}

export class SchemaCache {
  private cache = new Map<string, object>();

  async load(source: string, timeout: number): Promise<object> {
    const cached = this.cache.get(source);
    if (cached) {
      log(`Schema cache hit: ${source}`);
      return cached;
    }

    const schema = isUrl(source)
      ? await fetchSchema(source, timeout)
      : loadLocalSchema(source);

    this.cache.set(source, schema);
    return schema;
  }

  get size(): number {
    return this.cache.size;
  }
}

async function fetchSchema(url: string, timeout: number): Promise<object> {
  log(`Downloading schema from ${url}`);

  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeout),
  }).catch((err: unknown) => {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new Error(`Schema download timed out after ${timeout}ms: ${url}`);
    }
    throw new Error(
      `Failed to download schema from ${url}: ${err instanceof Error ? err.message : String(err)}`
    );
  });

  if (!response.ok) {
    throw new Error(
      `Failed to download schema from ${url}: HTTP ${response.status}`
    );
  }

  const schema = (await response.json()) as object;
  log(`Schema downloaded successfully: ${url}`);
  return schema;
}

function loadLocalSchema(filePath: string): object {
  log(`Loading local schema: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Schema file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');

  try {
    return JSON.parse(content) as object;
  } catch {
    throw new Error(`Schema file is not valid JSON: ${filePath}`);
  }
}

export function resolveSchemaSource(
  json: Record<string, unknown>,
  schemaFlag?: string
): string {
  const source = schemaFlag || (json['$schema'] as string | undefined);

  if (!source) {
    throw new Error(
      'No $schema property found in file and no --schema flag provided. Use --schema <path-or-url> to specify one.'
    );
  }

  return source;
}
