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
