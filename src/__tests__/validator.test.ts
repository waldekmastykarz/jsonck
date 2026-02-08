import { describe, it, expect } from 'vitest';
import { validate } from '../validator.js';

const simpleSchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string' },
    age: { type: 'number', minimum: 0 },
  },
  additionalProperties: false,
};

const formatSchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    website: { type: 'string', format: 'uri' },
    created: { type: 'string', format: 'date' },
  },
};

describe('validate', () => {
  it('returns valid for correct data', () => {
    const result = validate({ name: 'Alice' }, simpleSchema);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('returns invalid for missing required property', () => {
    const result = validate({}, simpleSchema);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining('required') })
    );
  });

  it('returns invalid for wrong type', () => {
    const result = validate({ name: 123 }, simpleSchema);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: '/name', message: expect.stringContaining('string') })
    );
  });

  it('returns invalid for additional properties', () => {
    const result = validate({ name: 'Alice', extra: true }, simpleSchema);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining('additional') })
    );
  });

  it('returns invalid for value below minimum', () => {
    const result = validate({ name: 'Alice', age: -1 }, simpleSchema);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: '/age' })
    );
  });

  it('collects all errors (allErrors mode)', () => {
    const result = validate({ name: 123, age: -1, extra: true }, simpleSchema);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('validates string formats via ajv-formats', () => {
    const result = validate(
      { email: 'not-an-email', website: 'not-a-uri', created: 'not-a-date' },
      formatSchema
    );
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(3);
  });

  it('passes valid formats', () => {
    const result = validate(
      { email: 'a@b.com', website: 'https://example.com', created: '2025-01-01' },
      formatSchema
    );
    expect(result.valid).toBe(true);
  });
});
