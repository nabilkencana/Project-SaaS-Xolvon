import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Global route prefix — all routes served under /api/*
  app.setGlobalPrefix('api');

  // CORS — allow requests from the frontend origin
  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL'),
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

  await app.listen(configService.get<number>('PORT') ?? 3000);
}
bootstrap();
