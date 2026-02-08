import Ajv2020 from 'ajv/dist/2020.js';
import ajvFormats from 'ajv-formats';
import type { ErrorObject } from 'ajv';

// Handle CJS default export interop
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Ajv = (Ajv2020 as any).default || Ajv2020;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addFormats = (ajvFormats as any).default || ajvFormats;

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validate(json: unknown, schema: object): ValidationResult {
  const ajv = new Ajv({
    allErrors: true,
    verbose: true,
    allowUnionTypes: true,
    strict: false,
  });
  addFormats(ajv);

  // Strip $schema from the schema to avoid meta-schema resolution issues
  // (e.g., a draft-07 $schema ref when using Ajv 2020-12 engine)
  const { $schema, ...schemaWithoutMeta } = schema as Record<string, unknown>;

  const validateFn = ajv.compile(schemaWithoutMeta);
  const valid = validateFn(json);

  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors: ValidationError[] = (validateFn.errors || []).map(
    (err: ErrorObject) => ({
      path: err.instancePath || '/',
      message: err.message || 'unknown error',
    })
  );

  return { valid: false, errors };
}
