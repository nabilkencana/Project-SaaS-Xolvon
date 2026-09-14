import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { resolveCorsOrigins } from './config/cors';
import { resolveTrustProxyHops } from './config/trust-proxy';
import { enableSecurityHeaders } from './security/security-headers';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { createOpenApiDocument } from './openapi/openapi.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);

  // Global route prefix — all routes served under /api/*
  app.setGlobalPrefix('api');

  // Interactive API documentation and the generated OpenAPI JSON contract.
  // Mount explicitly under the API prefix so the public URLs are stable.
  const openApiDocument = createOpenApiDocument(app);
  SwaggerModule.setup('api/docs', app, openApiDocument, {
    jsonDocumentUrl: 'api/docs-json',
  });

  // Client-IP resolution for rate limiting (T6). Assumption: staging and
  // production run behind exactly one trusted edge proxy and set
  // TRUST_PROXY_HOPS=1, so Express derives req.ip (the ThrottlerGuard
  // tracker) from X-Forwarded-For. Locally the variable stays unset, which
  // fails closed to `false`: no header is trusted, so throttling limits
  // cannot be spoofed, and a malformed value aborts bootstrap.
  app.set(
    'trust proxy',
    resolveTrustProxyHops(configService.get<string>('TRUST_PROXY_HOPS')),
  );

  // Security headers (Helmet) — wired BEFORE CORS, validation pipes and the
  // exception filter so every response, including preflight and error
  // bodies, carries the CSP / frameguard / nosniff / Referrer-Policy set.
  // HSTS is emitted only when APP_ENV=production (DL-021). This also removes
  // Express' default X-Powered-By fingerprint.
  enableSecurityHeaders(app, {
    appEnv: configService.get<string>('APP_ENV'),
    cspConnectSrc: configService.get<string>('CSP_CONNECT_SRC'),
    r2Endpoint: configService.get<string>('R2_ENDPOINT'),
  });

  // CORS — explicit environment whitelist; credentials stay enabled, so
  // wildcard origins are rejected at bootstrap by resolveCorsOrigins().
  const corsOrigins = resolveCorsOrigins(
    configService.get<string>('CORS_ALLOWED_ORIGINS'),
    configService.get<string>('FRONTEND_URL'),
  );
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Global validation pipe — auto-validate & transform all incoming DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter — safe error responses, no stack trace leaks
  app.useGlobalFilters(new AllExceptionsFilter());

  // PORT is validated and coerced to a number by the ConfigModule validate()
  // hook, so it is safe to read it directly here.
  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);
}
bootstrap();
