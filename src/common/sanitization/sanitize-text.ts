/**
 * Bounded plain-text policy (plan T7, addendum hardening).
 *
 * `sanitizeText` is a deterministic, dependency-free normalizer for content
 * fields that are intended to be rendered as HTML by the frontend
 * (description, bio, problem, solution, lesson content, ...). When
 * `allowHtml` is false (the default and the only policy any DTO uses today)
 * everything that even looks like a markup tag is removed, so the backend can
 * never persist raw executable HTML/script content. The broad `<…>` removal
 * provably converges after a single sweep; the fixed-point loop is a
 * defensive re-check, and the pass cap guarantees termination regardless.
 *
 * Plain text — including Unicode — is preserved byte-for-byte. Only invisible
 * control characters (never part of legitimate content) are stripped, and the
 * `maxLength` bound (when given) is enforced by throwing rather than by
 * truncating, so callers decide how to surface the rejection.
 */

/** Raised when a value exceeds the configured hard length bound. */
export class TextTooLongError extends Error {
  constructor(maxLength: number) {
    // Deliberately does not echo the offending value (log-safety, RULES #95).
    super(`teks melebihi batas maksimal ${maxLength} karakter.`);
    this.name = 'TextTooLongError';
  }
}

export interface SanitizeTextOptions {
  /** Hard length bound for the sanitized value. Undefined = no bound check. */
  maxLength?: number;
  /**
   * When true, markup is left intact. No content DTO opts into this; the flag
   * exists so the policy is explicit at every call site.
   */
  allowHtml?: boolean;
}

// C0 controls minus \t \n \r, plus DEL. These never carry legitimate content
// and are common XSS obfuscation vectors.
// eslint-disable-next-line no-control-regex -- control chars are the point: this class removes them.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

// Anything delimited by < ... > on the first closing bracket. Conservative by
// design: legitimate plain text virtually never contains complete tag-shaped
// substrings, and the removal is idempotent and deterministic.
const TAG_SHAPE = /<[^>]*>/g;

// A single sweep provably neutralizes every complete tag; the loop re-checks
// to a fixed point defensively and the cap bounds iterations regardless.
const MAX_TAG_PASSES = 16;

export function sanitizeText(value: string, options?: SanitizeTextOptions): string;
export function sanitizeText(value: unknown, options?: SanitizeTextOptions): unknown;
export function sanitizeText(
  value: unknown,
  options: SanitizeTextOptions = {},
): unknown {
  // Non-strings pass through: type rejection is the job of @IsString in the
  // validation pipeline, not of the transform.
  if (typeof value !== 'string') {
    return value;
  }

  const { maxLength, allowHtml = false } = options;

  let text = value.replace(CONTROL_CHARS, '');

  if (!allowHtml) {
    for (let pass = 0; pass < MAX_TAG_PASSES; pass += 1) {
      const next = text.replace(TAG_SHAPE, '');
      if (next === text) {
        break;
      }
      text = next;
    }
  }

  if (maxLength !== undefined && text.length > maxLength) {
    throw new TextTooLongError(maxLength);
  }

  return text;
}
