/**
 * Safe JSON parsing for metadata TEXT fields (plan T7, addendum hardening).
 *
 * Some columns store structured data as TEXT (project `tech_stack` may hold a
 * JSON array or a comma-separated list). Malformed payloads must be rejected
 * at the write boundary with a 400 instead of being stored as junk that read
 * mappers would later have to degrade silently.
 */
import { TextTooLongError } from './sanitize-text';

/** Raised when a metadata string cannot be parsed as JSON. */
export class MalformedJsonError extends Error {
  constructor() {
    // No echo of the raw payload (log-safety).
    super('metadata harus berupa JSON yang valid.');
    this.name = 'MalformedJsonError';
  }
}

export interface ParseSafeJsonOptions {
  /** Optional hard bound checked before parsing. */
  maxLength?: number;
}

/** True when the string is presented as JSON (begins with `[` or `{`). */
export function isJsonLike(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith('[') || trimmed.startsWith('{');
}

/**
 * Parses a JSON metadata string or throws {@link MalformedJsonError}. Only
 * complete documents are accepted — trailing junk (`{}extra`) and empty
 * strings fail, as does anything JSON.parse cannot finish (including
 * RangeError on pathological nesting).
 */
export function parseSafeJson(
  value: unknown,
  options: ParseSafeJsonOptions = {},
): unknown {
  if (typeof value !== 'string') {
    throw new MalformedJsonError();
  }
  if (options.maxLength !== undefined && value.length > options.maxLength) {
    throw new TextTooLongError(options.maxLength);
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    throw new MalformedJsonError();
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new MalformedJsonError();
  }
}
