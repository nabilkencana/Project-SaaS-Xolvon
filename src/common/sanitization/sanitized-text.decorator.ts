/**
 * Field-level sanitization decorators (plan T7, addendum hardening).
 *
 * Wiring point is the existing global ValidationPipe
 * (`src/main.ts`, `transform: true`): class-transformer runs `@Transform`
 * before class-validator validates, so the stored/echoed value is the
 * sanitized one while `@MaxLength` still bounds the final string. This keeps
 * `whitelist`/`forbidNonWhitelisted` semantics untouched and confines the
 * policy to the DTOs that opt in — plain-text and identity fields are never
 * rewritten.
 */
import { Transform } from 'class-transformer';
import {
  sanitizeText,
  type SanitizeTextOptions,
} from './sanitize-text';

export type { SanitizeTextOptions };

/**
 * Neutralizes markup on a content string field unless `allowHtml: true` is
 * explicitly set. No-ops on non-string values so `@IsString` produces the
 * canonical type error, and on `undefined`/`null` so `@IsOptional` still works.
 *
 * `maxLength` is intentionally NOT enforced by throwing inside the transform
 * (a throwing transform would surface as an unhandled 500); pair this
 * decorator with `@MaxLength`, which produces the 400 through the normal
 * validation pipeline.
 */
export function SanitizedText(options: SanitizeTextOptions = {}): PropertyDecorator {
  return Transform(({ value }) => sanitizeText(value, options));
}
