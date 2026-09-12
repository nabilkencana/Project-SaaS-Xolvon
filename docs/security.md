# Security

Official security documentation for the XOLVON backend. Decisions behind the
controls listed here live in [`decision-log.md`](decision-log.md); endpoint and
auth contracts live in [`api-contract.md`](api-contract.md).

## Security headers

All responses — including CORS preflight replies and error bodies — carry a
strict header set produced by [Helmet](https://helmetjs.github.io/), wired
globally in `src/main.ts` before CORS, the validation pipe, and the exception
filter. The configuration lives in `src/security/security-headers.ts` and is
covered by `src/security/security-headers.spec.ts`.

| Header | Value | Rationale |
| --- | --- | --- |
| `Content-Security-Policy` | `default-src 'none'; script-src 'self'; frame-ancestors 'none'; connect-src/style-src/img-src/font-src 'self' + configured origins` | Deny-by-default policy for any embedded resource. The API serves JSON, so nothing legitimate needs inline scripts or framing; `unsafe-inline` and `unsafe-eval` are never emitted (DL-021). `frame-ancestors 'none'` blocks clickjacking of every response. |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` — **only when `APP_ENV=production`** | One-year HTTPS pinning in production. Local and staging intentionally run over plain HTTP, so the header is absent there to avoid locking browsers out of dev origins. |
| `X-Frame-Options` | `DENY` | Legacy framing protection alongside CSP `frame-ancestors`, for older clients. |
| `X-Content-Type-Options` | `nosniff` | Stops browsers from MIME-sniffing responses into executable/script contexts. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Cross-origin requests only receive the origin as referrer, so tokens or identifiers in URLs never leak to third parties; HTTPS→HTTP downgrades send nothing. |
| `X-Powered-By` | removed | Express' default fingerprint is disabled at the app level and stripped by Helmet, reducing reconnaissance surface. |

### CSP origin sources

The fetch/media source lists (`connect-src`, `style-src`, `img-src`,
`font-src`) are built at bootstrap from environment variables, always prefixed
with `'self'` as the safe default when nothing is configured:

| Variable | Feeds | Notes |
| --- | --- | --- |
| `CSP_CONNECT_SRC` | all four source lists | Comma- or space-separated absolute `http(s)` URLs. Each entry is normalized to its origin; malformed or non-`http(s)` values are dropped and never echoed into the header. |
| `R2_ENDPOINT` | all four source lists | Only the URL origin is used (e.g. `https://<account-hash>.r2.cloudflarestorage.com`); bucket names, paths, and credentials are excluded. |

Approved baseline example (staging/production final origins remain OPEN per
DL-021 until the owner confirms domains):

```text
CSP_CONNECT_SRC=https://app.xolvon.com,https://admin.xolvon.com
```

No secrets, tokens, or credentials appear in any header value.

### Verification

- Unit/config level: `src/security/security-headers.spec.ts` (runs under
  `npm run test:esm`) asserts the full header set on a real Nest testing app
  for both `production` (HSTS present) and non-production (HSTS absent), plus
  origin-parsing edge cases and the no-`unsafe-*` rule.
- Surface level: `curl -s -i` against the local server with and without
  `APP_ENV=production` (evidence in the plan notepad, `.omo/…/evidence/`).

## Input sanitization

Free-text input is normalized by a bounded, deterministic policy before it can
be persisted, implemented in `src/common/sanitization/` and wired per field
through the existing global `ValidationPipe` (`whitelist`/
`forbidNonWhitelisted`/`transform` in `src/main.ts` are unchanged).

**Policy — `sanitizeText(value, { maxLength, allowHtml })`:**

- Content fields intended for rendered HTML (`allowHtml: false`, the default
  and the only mode in use) have every tag-shaped substring (`<…>`) removed
  (a fixed-point sweep re-checks defensively), so payloads such as
  `<scr<script>ipt>` or `<<b>script>` never survive. The backend never
  stores raw executable HTML/script content.
- Invisible control characters (NUL, ESC, and the rest of C0/DEL except
  `\t` `\n` `\r`) are stripped.
- Everything else — including ordinary Unicode (emoji, accented Latin, CJK),
  ampersands, and quotes — is preserved byte-for-byte. No trimming, case
  changes, or truncation: a valid request's visible content is never altered.
- Oversized values are rejected with `400`, not truncated: every sanitized
  field carries an explicit `@MaxLength`, and the helper's `maxLength` option
  throws (never echoes the value) for programmatic callers.

**Policy — JSON metadata (`parseSafeJson` / `@IsSafeMetadata`):**

- Metadata TEXT fields that may carry structured content (project `tech_stack`)
  follow "JSON-shaped means JSON-valid": a value starting with `[` or `{` must
  parse as a complete JSON document or the request is rejected with `400`;
  malformed payloads are never stored for read mappers to silently degrade.
  Legacy comma-separated lists remain valid, matching `parseTechStack` in
  `src/projects/mappers/project.mapper.ts`.

**Sanitized fields (create + update DTOs):** `courses.description`,
`lessons.content`, `projects.summary/problem/solution/result`,
`marketplace.description`, `collective.bio`, `orders.notes` (all via
`@SanitizedText`), plus `projects.techStack` via `@IsSafeMetadata`. Plain-text
and identity fields (titles, slugs, names, roles, object keys, tokens) are
deliberately not rewritten — their length/type bounds stay as before.

**Known limits:** the policy neutralizes markup at the write boundary;
renderers must still apply their own contextual escaping (defense in depth,
on top of the CSP in [Security headers](#security-headers)). String items
inside arrays (`skills`, `capabilities`) keep their existing type/size bounds
and are out of scope for tag stripping.

### Verification

- Unit level: `src/common/sanitization/sanitization.spec.ts` (runs under
  `npm run test:esm`) — 27 tests covering tag removal, reassembly payloads,
  Unicode preservation, control characters, length bounds, idempotence,
  malformed/valid JSON metadata, and the real content DTOs.
- Surface level: the T7 block in `test/app.e2e-spec.ts` asserts that markup is
  gone from the actual DB `INSERT` parameters, oversized content returns 400
  before any write, and malformed `techStack` JSON returns 400; manual
  `curl` evidence lives in the plan notepad,
  `.omo/notepads/xolvon-addendum-hardening-docs/evidence/`.
