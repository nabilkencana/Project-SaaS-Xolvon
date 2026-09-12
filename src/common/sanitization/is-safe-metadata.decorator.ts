/**
 * Metadata-JSON validation decorator (plan T7, addendum hardening).
 *
 * Applies the project's dual-format TEXT metadata policy: a value presented
 * as JSON (starting with `[` or `{`) must be a complete, parseable document —
 * malformed payloads are rejected with a 400 instead of being stored as junk.
 * Legacy plain comma-separated values remain valid, matching the read mapper
 * contract (`parseTechStack` in `src/projects/mappers/project.mapper.ts`).
 */
import { registerDecorator, type ValidationOptions, type ValidationArguments } from 'class-validator';
import { isJsonLike, parseSafeJson } from './parse-safe-json';

export interface SafeMetadataOptions {
  /** Optional hard length bound for the raw metadata string. */
  maxLength?: number;
  /** Standard class-validator options (custom message, `each`, ...). */
  validationOptions?: ValidationOptions;
}

/**
 * Property-level metadata policy: "JSON-shaped means JSON-valid".
 * Type errors stay with `@IsString`; length errors stay with `@MaxLength` —
 * this validator only rejects unparseable JSON-shaped strings (and oversized
 * ones when `maxLength` is provided).
 */
export function IsSafeMetadata(options: SafeMetadataOptions = {}): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isSafeMetadata',
      target: object.constructor,
      propertyName: propertyName as string,
      options: options.validationOptions,
      constraints: [options],
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          if (typeof value !== 'string') {
            // Not this validator's problem — @IsString owns type reporting.
            return true;
          }
          const bound = (args.constraints[0] as SafeMetadataOptions).maxLength;
          if (bound !== undefined && value.length > bound) {
            return false;
          }
          if (!isJsonLike(value)) {
            // Plain comma-separated form is explicitly allowed storage.
            return true;
          }
          try {
            parseSafeJson(value);
            return true;
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments): string {
          return `${String(args.property)} mengandung metadata JSON yang tidak valid.`;
        },
      },
    });
  };
}
