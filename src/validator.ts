import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats'
import fs from 'fs';
import debug from 'debug';
import { ErrorObject } from 'ajv';

const log = debug('json-validator');

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}

export async function validateJsonFile(filePath: string, schemaUrl?: string): Promise<ValidationResult> {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const jsonContent = JSON.parse(content);
    
    // Use provided schema URL or extract from file
    const effectiveSchemaUrl = schemaUrl || jsonContent['$schema'];
    
    // Check if schema property exists
    if (!effectiveSchemaUrl) {
      log(`No $schema property found in ${filePath} and no schema URL provided`);
      return {
        isValid: false,
        errors: ['No $schema property found in file and no schema URL provided']
      };
    }

    log(`Downloading schema from ${effectiveSchemaUrl}`);
    // Download schema
    const response = await fetch(effectiveSchemaUrl);
    if (!response.ok) {
      const errorMessage = `Failed to download schema from ${effectiveSchemaUrl}: ${response.status}`;
      log(errorMessage);
      return {
        isValid: false,
        errors: [errorMessage]
      };
    }

    const schema = await response.json() as object;
    log(`Schema downloaded successfully for ${filePath}`);
    
    // Initialize AJV validator
    const ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(ajv);
    
    // Compile the schema
    const validate = ajv.compile(schema);
    
    // Validate the JSON content against the schema
    const isValid = validate(jsonContent);
    
    if (!isValid) {
      const errors = validate.errors?.map((validationError: ErrorObject) => 
        `${validationError.instancePath || 'root'}: ${validationError.message}`
      ) || [];
      
      log(`Validation errors in ${filePath}:`);
      errors.forEach((error: string) => log(`  - ${error}`));
      
      return {
        isValid: false,
        errors
      };
    }

    log(`✓ Valid JSON file: ${filePath}`);
    return { isValid: true };
  }
  catch (err) {
    const errorMessage = `Error validating JSON file ${filePath}: ${err instanceof Error ? err.message : String(err)}`;
    log(errorMessage);
    return {
      isValid: false,
      errors: [errorMessage]
    };
  }
}

export async function isValidJsonFile(filePath: string): Promise<boolean> {
  const result = await validateJsonFile(filePath);
  return result.isValid;
}
