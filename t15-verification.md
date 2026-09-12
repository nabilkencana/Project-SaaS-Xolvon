# T15 Verification

- `npm run test:esm -- --runInBand`: 34 suites, 302 tests passed.
- `npm run test:e2e -- --runInBand`: 1 suite, 75 tests passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `curl -X POST /api/orders/not-a-uuid/cancel` without a token: `401 Unauthorized`.
- Authenticated `POST /api/orders/0b9e6b5e-1111-4222-8333-444455556666/cancel`: `404 Order tidak ditemukan.`
- Temporary server and token artifacts were removed after curl QA.
