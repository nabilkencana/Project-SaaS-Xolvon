import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'node:crypto';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { D1Service } from '../database/d1.service';
import type { UserRow } from './interfaces/user.interface';
import type { SessionRow } from './interfaces/session-record.interface';

describe('AuthService', () => {
  let service: AuthService;
  let mockD1Service: jest.Mocked<D1Service>;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockPasswordService: jest.Mocked<PasswordService>;

  beforeEach(() => {
    mockD1Service = {
      query: jest.fn(),
    } as unknown as jest.Mocked<D1Service>;

    mockJwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    mockPasswordService = {
      hash: jest.fn(),
      verify: jest.fn(),
    } as unknown as jest.Mocked<PasswordService>;

    service = new AuthService(
      mockD1Service,
      mockJwtService,
      mockPasswordService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const sampleUserRow: UserRow = {
    id: 'user-uuid-1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+628123456789',
    password_hash: '$argon2id$v=19$m=65536,t=3,p=4$fakehash',
    role: 'user',
    status: 'active',
    email_verified: 0,
    phone_verified: 0,
    created_at: '2026-09-04T00:00:00.000Z',
    updated_at: '2026-09-04T00:00:00.000Z',
  };

  // -------------------------------------------------------------------------
  // hashToken helper
  // -------------------------------------------------------------------------
  describe('hashToken', () => {
    it('should correctly hash a token with SHA-256', () => {
      const raw = 'my-raw-refresh-token';
      const expected = crypto.createHash('sha256').update(raw).digest('hex');
      expect(service.hashToken(raw)).toBe(expected);
      expect(service.hashToken(raw)).toHaveLength(64);
    });
  });

  // -------------------------------------------------------------------------
  // register
  // -------------------------------------------------------------------------
  describe('register', () => {
    const registerDto = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+628123456789',
      password: 'password123',
    };

    it('should successfully register a new user with role user and hashed password', async () => {
      // Uniqueness check returns empty
      mockD1Service.query
        .mockResolvedValueOnce({
          results: [],
          meta: {} as any,
        })
        // Insert query returns success
        .mockResolvedValueOnce({
          results: [],
          meta: {} as any,
        });

      mockPasswordService.hash.mockResolvedValueOnce('$argon2id$mockedhash');

      const result = await service.register(registerDto);

      // Verify uniqueness query parameters
      expect(mockD1Service.query).toHaveBeenNthCalledWith(
        1,
        'SELECT id FROM users WHERE email = ? OR phone = ? LIMIT 1;',
        [registerDto.email, registerDto.phone],
      );

      // Verify password was hashed with passwordService (argon2)
      expect(mockPasswordService.hash).toHaveBeenCalledWith(
        registerDto.password,
      );

      // Verify INSERT query was called
      expect(mockD1Service.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([
          registerDto.name,
          registerDto.email,
          registerDto.phone,
          '$argon2id$mockedhash',
          'user',
          'active',
          0,
          0,
        ]),
      );

      // Verify response shape — MUST NOT contain password_hash
      expect(result).toMatchObject({
        name: registerDto.name,
        email: registerDto.email,
        phone: registerDto.phone,
        role: 'user',
        status: 'active',
        email_verified: false,
        phone_verified: false,
      });
      expect(result).not.toHaveProperty('password_hash');
      expect((result as any).password_hash).toBeUndefined();
    });

    it('should throw generic ConflictException if email or phone is already registered (anti-enumeration)', async () => {
      mockD1Service.query.mockResolvedValue({
        results: [{ id: 'existing-id' }],
        meta: {} as any,
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );

      await expect(service.register(registerDto)).rejects.toMatchObject({
        message: 'An account with these credentials is already registered.',
      });

      // Must not proceed to hash or insert
      expect(mockPasswordService.hash).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // login
  // -------------------------------------------------------------------------
  describe('login', () => {
    const loginDto = {
      email: 'john@example.com',
      password: 'password123',
    };

    it('should throw UnauthorizedException if user is not found', async () => {
      mockD1Service.query.mockResolvedValueOnce({
        results: [],
        meta: {} as any,
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user account is suspended', async () => {
      mockD1Service.query.mockResolvedValueOnce({
        results: [{ ...sampleUserRow, status: 'suspended' }],
        meta: {} as any,
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException(
          'Account is suspended. Please contact support.',
        ),
      );
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      mockD1Service.query.mockResolvedValueOnce({
        results: [sampleUserRow],
        meta: {} as any,
      });

      mockPasswordService.verify.mockResolvedValueOnce(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockPasswordService.verify).toHaveBeenCalledWith(
        sampleUserRow.password_hash,
        loginDto.password,
      );
    });

    it('should successfully log in, hash refresh token with SHA-256 before persisting, and return plaintext refresh token to client', async () => {
      mockD1Service.query
        // User lookup
        .mockResolvedValueOnce({
          results: [sampleUserRow],
          meta: {} as any,
        })
        // Session insert
        .mockResolvedValueOnce({
          results: [],
          meta: {} as any,
        });

      mockPasswordService.verify.mockResolvedValueOnce(true);
      mockJwtService.signAsync.mockResolvedValueOnce('mocked.jwt.access-token');

      const result = await service.login(
        loginDto,
        '127.0.0.1',
        'Mozilla/5.0 TestBrowser',
      );

      // Verify access token
      expect(result.accessToken).toBe('mocked.jwt.access-token');

      // Verify plaintext refresh token returned to client
      expect(result.refreshToken).toBeDefined();
      expect(typeof result.refreshToken).toBe('string');
      expect(result.refreshToken).toHaveLength(64); // 32 bytes hex = 64 chars

      // Verify the session insert into D1 used the SHA-256 hash, NOT the raw token
      const expectedHash = crypto
        .createHash('sha256')
        .update(result.refreshToken)
        .digest('hex');

      expect(mockD1Service.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO sessions'),
        expect.arrayContaining([
          expect.any(String), // session id
          sampleUserRow.id,
          expectedHash, // Must be hashed with SHA-256!
          expect.any(String), // expires_at
          '127.0.0.1',
          'Mozilla/5.0 TestBrowser',
        ]),
      );

      // Verify user response excludes password_hash
      expect(result.user).not.toHaveProperty('password_hash');
      expect((result.user as any).password_hash).toBeUndefined();
      expect(result.user.email).toBe(sampleUserRow.email);
    });
  });

  // -------------------------------------------------------------------------
  // refresh
  // -------------------------------------------------------------------------
  describe('refresh', () => {
    const rawRefreshToken = 'raw-test-refresh-token';
    const hashedRefreshToken = crypto
      .createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex');

    const validSessionRow: SessionRow = {
      id: 'session-uuid-1',
      user_id: 'user-uuid-1',
      refresh_token: hashedRefreshToken,
      expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hr in future
      ip_address: '127.0.0.1',
      user_agent: 'TestBrowser',
      created_at: '2026-09-04T00:00:00.000Z',
    };

    it('should query sessions using the SHA-256 hash and return a new access token', async () => {
      mockD1Service.query
        // Session lookup
        .mockResolvedValueOnce({
          results: [validSessionRow],
          meta: {} as any,
        })
        // User lookup
        .mockResolvedValueOnce({
          results: [sampleUserRow],
          meta: {} as any,
        });

      mockJwtService.signAsync.mockResolvedValueOnce('new.jwt.access-token');

      const result = await service.refresh(rawRefreshToken);

      // Verify query used SHA-256 hash, NOT raw token
      expect(mockD1Service.query).toHaveBeenNthCalledWith(
        1,
        'SELECT * FROM sessions WHERE refresh_token = ? LIMIT 1;',
        [hashedRefreshToken],
      );

      expect(result.accessToken).toBe('new.jwt.access-token');
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        {
          sub: sampleUserRow.id,
          email: sampleUserRow.email,
          role: sampleUserRow.role,
        },
        { expiresIn: '15m' },
      );
    });

    it('should throw UnauthorizedException if session is not found', async () => {
      mockD1Service.query.mockResolvedValueOnce({
        results: [],
        meta: {} as any,
      });

      await expect(service.refresh('nonexistent-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException and delete session if expired', async () => {
      const expiredSessionRow: SessionRow = {
        ...validSessionRow,
        expires_at: new Date(Date.now() - 1000).toISOString(), // expired 1s ago
      };

      mockD1Service.query
        .mockResolvedValueOnce({
          results: [expiredSessionRow],
          meta: {} as any,
        })
        .mockResolvedValueOnce({
          results: [],
          meta: {} as any,
        });

      await expect(service.refresh(rawRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );

      // Verify expired session was deleted using hashed token / session id
      expect(mockD1Service.query).toHaveBeenNthCalledWith(
        2,
        'DELETE FROM sessions WHERE id = ?;',
        [expiredSessionRow.id],
      );
    });

    it('should throw UnauthorizedException if user is suspended', async () => {
      mockD1Service.query
        .mockResolvedValueOnce({
          results: [validSessionRow],
          meta: {} as any,
        })
        .mockResolvedValueOnce({
          results: [{ ...sampleUserRow, status: 'suspended' }],
          meta: {} as any,
        });

      await expect(service.refresh(rawRefreshToken)).rejects.toThrow(
        new UnauthorizedException('User account is invalid or suspended.'),
      );
    });
  });

  // -------------------------------------------------------------------------
  // logout
  // -------------------------------------------------------------------------
  describe('logout', () => {
    it('should delete the session matching the SHA-256 hash of the refresh token', async () => {
      const rawToken = 'client-refresh-token';
      const expectedHash = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');

      mockD1Service.query.mockResolvedValueOnce({
        results: [],
        meta: {} as any,
      });

      const result = await service.logout(rawToken);

      expect(mockD1Service.query).toHaveBeenCalledWith(
        'DELETE FROM sessions WHERE refresh_token = ?;',
        [expectedHash],
      );
      expect(result).toEqual({ message: 'Logged out successfully.' });
    });
  });
});
