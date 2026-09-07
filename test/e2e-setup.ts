/**
 * Test-only environment values, loaded before AppModule is imported so the
 * central ConfigModule validation accepts bootstrap. process.env takes
 * precedence over any local .env file, keeping e2e runs deterministic and
 * free of real credentials.
 */
process.env.CLOUDFLARE_ACCOUNT_ID ||= 'e2e-account-id';
process.env.CLOUDFLARE_D1_DATABASE_ID ||= 'e2e-database-id';
process.env.CLOUDFLARE_API_TOKEN ||= 'e2e-not-a-real-token';
process.env.JWT_SECRET ||= 'e2e-jwt-secret-0123456789abcdef012345';
process.env.FRONTEND_URL ||= 'http://localhost:3001';
process.env.PORT ||= '41234';
