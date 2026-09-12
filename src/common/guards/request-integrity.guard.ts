import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

const MUTATION_METHODS = new Set(['POST', 'PATCH', 'DELETE']);

@Injectable()
export class RequestIntegrityGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!MUTATION_METHODS.has(request.method.toUpperCase())) {
      return true;
    }

    const fetchSite = this.header(request, 'sec-fetch-site');
    if (fetchSite?.toLowerCase() === 'cross-site') {
      throw new ForbiddenException('Request metadata is not allowed.');
    }

    const allowedOrigins = this.allowedOrigins();
    const origin = this.header(request, 'origin');
    if (origin && !allowedOrigins.has(origin)) {
      throw new ForbiddenException('Request metadata is not allowed.');
    }

    const referer = this.header(request, 'referer');
    if (referer) {
      let refererOrigin: string;
      try {
        refererOrigin = new URL(referer).origin;
      } catch {
        throw new ForbiddenException('Request metadata is not allowed.');
      }
      if (!allowedOrigins.has(refererOrigin)) {
        throw new ForbiddenException('Request metadata is not allowed.');
      }
    }

    return true;
  }

  private allowedOrigins(): Set<string> {
    const configured =
      this.configService.get<string>('CORS_ALLOWED_ORIGINS') ??
      this.configService.get<string>('FRONTEND_URL') ??
      '';
    return new Set(
      configured
        .split(',')
        .map((origin) => origin.trim().replace(/\/$/, ''))
        .filter(Boolean),
    );
  }

  private header(request: Request, name: string): string | undefined {
    const value = request.headers[name];
    return Array.isArray(value) ? value[0] : value;
  }
}
