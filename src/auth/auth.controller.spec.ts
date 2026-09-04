import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
            signAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('register should delegate to authService.register', async () => {
    const registerDto = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+628123456789',
      password: 'password123',
    };

    const mockResponse = {
      id: 'uuid-1',
      name: registerDto.name,
      email: registerDto.email,
      phone: registerDto.phone,
      role: 'user' as const,
      status: 'active' as const,
      email_verified: false,
      phone_verified: false,
      created_at: '2026-09-04T00:00:00.000Z',
      updated_at: '2026-09-04T00:00:00.000Z',
    };

    mockAuthService.register.mockResolvedValueOnce(mockResponse);

    const result = await controller.register(registerDto);
    expect(result).toBe(mockResponse);
    expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
  });

  it('login should extract ip and user-agent and delegate to authService.login', async () => {
    const loginDto = {
      email: 'john@example.com',
      password: 'password123',
    };

    const mockReq = {
      ip: '192.168.1.1',
      headers: {
        'user-agent': 'JestTestRunner',
        'x-forwarded-for': '203.0.113.195, 70.41.3.18',
      },
    } as unknown as Request;

    const mockAuthResponse = {
      accessToken: 'access.token',
      refreshToken: 'refresh.token',
      user: {
        id: 'uuid-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+628123456789',
        role: 'user' as const,
        status: 'active' as const,
        email_verified: false,
        phone_verified: false,
        created_at: '2026-09-04T00:00:00.000Z',
        updated_at: '2026-09-04T00:00:00.000Z',
      },
    };

    mockAuthService.login.mockResolvedValueOnce(mockAuthResponse);

    const result = await controller.login(loginDto, mockReq);

    expect(result).toBe(mockAuthResponse);
    expect(mockAuthService.login).toHaveBeenCalledWith(
      loginDto,
      '203.0.113.195', // First forwarded IP
      'JestTestRunner',
    );
  });

  it('refresh should delegate to authService.refresh', async () => {
    mockAuthService.refresh.mockResolvedValueOnce({
      accessToken: 'new.access.token',
    });

    const result = await controller.refresh({
      refreshToken: 'client-refresh-token',
    });

    expect(result).toEqual({ accessToken: 'new.access.token' });
    expect(mockAuthService.refresh).toHaveBeenCalledWith(
      'client-refresh-token',
    );
  });

  it('logout should delegate to authService.logout', async () => {
    mockAuthService.logout.mockResolvedValueOnce({
      message: 'Logged out successfully.',
    });

    const result = await controller.logout({
      refreshToken: 'client-refresh-token',
    });

    expect(result).toEqual({ message: 'Logged out successfully.' });
    expect(mockAuthService.logout).toHaveBeenCalledWith(
      'client-refresh-token',
    );
  });

  it('getProfile should return the current user payload', () => {
    const payload = {
      sub: 'uuid-1',
      email: 'john@example.com',
      role: 'user' as const,
    };

    expect(controller.getProfile(payload)).toBe(payload);
  });

  it('adminOnly should return success message and user payload', () => {
    const payload = {
      sub: 'admin-uuid-1',
      email: 'admin@xolvon.com',
      role: 'admin' as const,
    };

    const result = controller.adminOnly(payload);
    expect(result).toEqual({
      message: 'Admin access granted.',
      user: payload,
    });
  });
});
