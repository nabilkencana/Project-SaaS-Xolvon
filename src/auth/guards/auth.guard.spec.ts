import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockReflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    mockJwtService = {
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'test-jwt-secret';
        return null;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    mockReflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new AuthGuard(mockJwtService, mockConfigService, mockReflector);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createMockContext(
    headers: Record<string, string> = {},
  ): { context: ExecutionContext; request: any } {
    const request = { headers, user: undefined };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    } as unknown as ExecutionContext;

    return { context, request };
  }

  it('should allow access if route is marked as @Public()', async () => {
    mockReflector.getAllAndOverride.mockReturnValueOnce(true);
    const { context } = createMockContext();

    const canActivate = await guard.canActivate(context);
    expect(canActivate).toBe(true);
    expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException if authorization header is missing', async () => {
    mockReflector.getAllAndOverride.mockReturnValueOnce(false);
    const { context } = createMockContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException if authorization header is not Bearer', async () => {
    mockReflector.getAllAndOverride.mockReturnValueOnce(false);
    const { context } = createMockContext({
      authorization: 'Basic dXNlcjpwYXNz',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException if jwtService.verifyAsync throws (invalid/expired)', async () => {
    mockReflector.getAllAndOverride.mockReturnValueOnce(false);
    const { context } = createMockContext({
      authorization: 'Bearer invalid.token.value',
    });

    mockJwtService.verifyAsync.mockRejectedValueOnce(new Error('jwt expired'));

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should attach payload to request.user and return true if token is valid', async () => {
    mockReflector.getAllAndOverride.mockReturnValueOnce(false);
    const { context, request } = createMockContext({
      authorization: 'Bearer valid.jwt.token',
    });

    const mockPayload: JwtPayload = {
      sub: 'user-uuid-1',
      email: 'user@example.com',
      role: 'user',
    };

    mockJwtService.verifyAsync.mockResolvedValueOnce(mockPayload);

    const canActivate = await guard.canActivate(context);
    expect(canActivate).toBe(true);
    expect(request.user).toEqual(mockPayload);
    expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid.jwt.token', {
      secret: 'test-jwt-secret',
    });
  });

  it('should treat an expired token as unauthorized with a stable message', async () => {
    mockReflector.getAllAndOverride.mockReturnValueOnce(false);
    const { context } = createMockContext({
      authorization: 'Bearer expired.jwt.token',
    });

    mockJwtService.verifyAsync.mockRejectedValueOnce(
      new Error('jwt expired'),
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Invalid or expired token.',
    );
  });

  it('should distinguish malformed tokens from missing headers with 401s', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);

    const missingHeader = createMockContext({});
    await expect(guard.canActivate(missingHeader.context)).rejects.toThrow(
      'Missing or invalid authorization token.',
    );

    const malformed = createMockContext({ authorization: 'Bearer' });
    await expect(guard.canActivate(malformed.context)).rejects.toThrow(
      'Missing or invalid authorization token.',
    );

    const emptyBearer = createMockContext({ authorization: 'Bearer ' });
    await expect(guard.canActivate(emptyBearer.context)).rejects.toThrow(
      'Missing or invalid authorization token.',
    );
  });

  it('should read JWT_SECRET on demand for every activation, not cache it', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const { context } = createMockContext({
      authorization: 'Bearer some.token',
    });

    mockJwtService.verifyAsync.mockResolvedValue({
      sub: 'u1',
      email: 'e@x.com',
      role: 'user',
    });

    await guard.canActivate(context);
    await guard.canActivate(context);

    expect(mockConfigService.get).toHaveBeenCalledWith('JWT_SECRET');
    expect(mockConfigService.get).toHaveBeenCalledTimes(2);
  });

  it('should reject when JWT_SECRET is not configured', async () => {
    mockReflector.getAllAndOverride.mockReturnValueOnce(false);
    const { context } = createMockContext({
      authorization: 'Bearer some.token',
    });

    mockConfigService.get = jest.fn(() => undefined) as any;
    guard = new AuthGuard(mockJwtService, mockConfigService, mockReflector);
    mockJwtService.verifyAsync.mockRejectedValueOnce(
      new Error('secret or private key must be provided'),
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
