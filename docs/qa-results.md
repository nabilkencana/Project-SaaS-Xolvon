# T20 QA Results

## Status

**BLOCKED**

T20 live deployment verification was not performed. No staging or production
success is claimed, and no credential values, deployment identifiers, domains,
metrics, or external service results were fabricated.

## Prerequisite gate

The required deployment prerequisites are unavailable or unverifiable in this
workspace:

- No separate staging secret store or populated staging target environment was
  found. `.env.staging.example` contains the required variable names but no
  usable target values.
- No separate production secret store or populated production target
  environment was found. `.env.production.example` contains the required
  variable names but no usable target values.
- A local `.env` exists and has populated entries, but its values were not read
  or printed and it does not establish which values belong to staging or
  production. It therefore cannot be treated as valid environment-specific
  deployment credentials.
- No process environment contains non-secret staging/production target or
  domain variables.
- No deployment target/provider configuration was found for the Node/Express
  NestJS service. `package.json` has no staging/production deploy script;
  `wrangler.jsonc` contains only a D1 binding, with no application target,
  environment blocks, R2 binding, or custom-domain configuration. The
  `wrangler` executable is unavailable.
- No real staging or production domain/HTTPS endpoint was provided or found.
- T19 output (`DoneClaim`, `evidence-t19-happy.txt`, and
  `evidence-t19-failure.txt`) explicitly records that production credentials
  and infrastructure were unavailable and that live deployment remained T20.

Because `DB_DRIVER=d1` requires the three Cloudflare values and
`STORAGE_DRIVER=r2` requires the four R2 values, the application cannot be
started against the required staging or production services from this
workspace. A deployment target, authenticated target identity, and real
domains are also required for the staging-to-production and HTTPS checks.

## T20 scenarios

| Scenario | Result | Evidence |
|---|---|---|
| `t20-happy`: staging then production deployment and clean-account purchase/verify/activate/access/revoke/video/upload/login/logout/session-expiry checks | **BLOCKED** | No verifiable environment-specific D1/R2 credentials, deployment target identity, provider executable/configuration, or staging/production HTTPS domains |
| `t20-failure`: record failed checklist items before claiming completion | **BLOCKED** | Same prerequisite gate; no live endpoint was available to exercise |

No live success is claimed. The blocked evidence records are `t20-happy.txt`
and `t20-failure.txt`; both explicitly state that no live endpoint was
available and contain no secrets.

## Local verification only

The following checks are local repository checks and do not substitute for T20
deployment verification:

- `npm run build`
- `npm run lint`
- `npm run test:esm`
- `npm run test:e2e`

Observed on 2026-09-12:

- `npm run build` exited 0.
- `npm run lint` exited 0.
- `npm run test:esm` passed 36 suites and 314 tests.
- `npm run test:e2e` passed 1 suite and 83 tests.
- LSP diagnostics could not run because the TypeScript LSP is not installed;
  installation had previously been declined. Markdown has no configured LSP.

These results cover local code only. They do not change the BLOCKED status of
the live deployment gate.

## Unblock requirements

Provide separate staging and production secret stores containing valid D1,
R2, JWT, and frontend URL values; provide the deployment provider/target, its
authenticated access and executable/configuration; provide pre-migration
backup/rollback and log access; and provide real HTTPS domains for both
environments. The local `.env` must not be assumed to satisfy this gate.
After those prerequisites exist, T20 must deploy staging before production,
run the complete checklist against clean accounts and real services, capture
the resulting `t20-happy` and `t20-failure` evidence, monitor logs, and only
then record a non-blocked result.
