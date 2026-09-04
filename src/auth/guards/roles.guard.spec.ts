import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let mockReflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new RolesGuard(mockReflector);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createMockContext(user?: Partial<JwtPayload>): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow access if no roles are required on the route', () => {
    mockReflector.getAllAndOverride.mockReturnValueOnce(undefined);
    const context = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user role matches the required role', () => {
    mockReflector.getAllAndOverride.mockReturnValueOnce(['admin']);
    const context = createMockContext({
      sub: 'admin-id',
      email: 'admin@xolvon.com',
      role: 'admin',
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user has different role than required', () => {
    mockReflector.getAllAndOverride.mockReturnValueOnce(['admin']);
    const context = createMockContext({
      sub: 'user-id',
      email: 'user@xolvon.com',
      role: 'user',
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if no user is present on the request', () => {
    mockReflector.getAllAndOverride.mockReturnValueOnce(['admin']);
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
