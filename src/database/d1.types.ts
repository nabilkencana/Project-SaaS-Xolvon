/**
 * Metadata returned by D1 for each query execution.
 */
export interface D1Meta {
  readonly changes: number;
  readonly duration: number;
  readonly last_row_id: number | null;
  readonly changed_db: boolean;
  readonly size_after: number;
  readonly rows_read: number;
  readonly rows_written: number;
}

/**
 * The result shape returned to callers of D1Service.query().
 * This is a clean, typed wrapper — callers never see raw Cloudflare API responses.
 */
export interface D1QueryResult<T> {
  readonly results: T[];
  readonly meta: D1Meta;
}

// ---------------------------------------------------------------------------
// Internal types — used only inside D1Service to parse Cloudflare REST API
// responses. Not exported from the module barrel.
// ---------------------------------------------------------------------------

/** A single statement result inside the Cloudflare D1 REST API response. */
export interface CloudflareD1StatementResult<T> {
  results: T[];
  success: boolean;
  meta: D1Meta;
}

/** Top-level Cloudflare v4 API envelope for D1 query endpoint. */
export interface CloudflareD1Response<T> {
  success: boolean;
  result: CloudflareD1StatementResult<T>[];
  errors: { code: number; message: string }[];
  messages: string[];
}
