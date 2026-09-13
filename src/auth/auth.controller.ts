import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { SafeUserDto } from './dto/user-response.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { OPENAPI_BEARER_SCHEME } from '../openapi/openapi.config';

const MESSAGE_SCHEMA = {
  type: 'object',
  properties: { message: { type: 'string' } },
  required: ['message'],
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 5 req/min per IP — DL-012 (registration abuse matters too).
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiCreatedResponse({ type: SafeUserDto })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<SafeUserDto> {
    return this.authService.register(dto);
  }

  // 5 req/min per IP — DL-012 brute-force protection.
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiOkResponse({ type: AuthResponseDto })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const forwarded = req.headers['x-forwarded-for'];
    const ipAddress =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : req.ip ?? undefined;

    const userAgent = req.headers['user-agent'] ?? undefined;

    return this.authService.login(dto, ipAddress, userAgent);
  }

  // 5 req/min per IP — BUG-throttle-refresh-logout: refresh previously ran at
  // the global 100/min, giving token-guessing 20x the login budget.
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Exchange a refresh token for a new access token' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { accessToken: { type: 'string' } },
      required: ['accessToken'],
    },
  })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
  ): Promise<{ accessToken: string }> {
    return this.authService.refresh(dto.refreshToken);
  }

  // 5 req/min per IP — BUG-throttle-refresh-logout: logout probes sessions by
  // hashed refresh token; same budget class as refresh.
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Revoke the session behind a refresh token' })
  @ApiOkResponse({ schema: MESSAGE_SCHEMA })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: LogoutDto): Promise<{ message: string }> {
    return this.authService.logout(dto.refreshToken);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'Read the current user from the access token' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        sub: { type: 'string', description: 'User id (UUID v4).' },
        email: { type: 'string', format: 'email' },
        role: { type: 'string', enum: ['user', 'admin'] },
      },
    },
  })
  @Get('me')
  @HttpCode(HttpStatus.OK)
  getProfile(@CurrentUser() user: JwtPayload): JwtPayload {
    return user;
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'Probe whether the token carries admin access' })
  @ApiOkResponse({ schema: MESSAGE_SCHEMA })
  @Get('admin')
  @HttpCode(HttpStatus.OK)
  adminOnly(@CurrentUser() user: JwtPayload): { message: string; user: JwtPayload } {
    return {
      message: 'Admin access granted.',
      user,
    };
  }
}
