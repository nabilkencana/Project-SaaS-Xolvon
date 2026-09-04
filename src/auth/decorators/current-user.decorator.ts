import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Parameter decorator to extract the authenticated user's JWT payload from `request.user`.
 *
 * @example
 * ```ts
 * @Get('profile')
 * getProfile(@CurrentUser() user: JwtPayload) { ... }
 *
 * @Get('user-id')
 * getUserId(@CurrentUser('sub') userId: string) { ... }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
