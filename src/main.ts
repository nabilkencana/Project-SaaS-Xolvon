import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { resolveCorsOrigins } from './config/cors';
import { enableSecurityHeaders } from './security/security-headers';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Global route prefix — all routes served under /api/*
  app.setGlobalPrefix('api');

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
