import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'node:crypto';
import { D1Service } from '../database/d1.service';
import { PasswordService } from './password.service';
import type { UserRow } from './interfaces/user.interface';
import type { SessionRow } from './interfaces/session-record.interface';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { SafeUserDto } from './dto/user-response.dto';
import type { AuthResponseDto } from './dto/auth-response.dto';
import { toSafeUser } from './mappers/user.mapper';

@Injectable()
export class AuthService {
  constructor(
    private readonly d1: D1Service,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * Hashes a refresh token with SHA-256 before persisting or querying the `sessions` table.
   * Prevents plaintext refresh token theft if the database is exposed.
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Registers a new user with default role 'user' and status 'active'.
   * Prevents account enumeration by returning a generic conflict message
   * if either email or phone is already taken.
   */
  async register(dto: RegisterDto): Promise<SafeUserDto> {
    // Check if email or phone already exists
    const existing = await this.d1.query<{ id: string }>(
      'SELECT id FROM users WHERE email = ? OR phone = ? LIMIT 1;',
      [dto.email, dto.phone],
    );

    if (existing.results.length > 0) {
      throw new ConflictException(
        'An account with these credentials is already registered.',
      );
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const passwordHash = await this.passwordService.hash(dto.password);

    await this.d1.query(
      `INSERT INTO users (
        id, name, email, phone, password_hash, role, status,
        email_verified, phone_verified, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        dto.name,
        dto.email,
        dto.phone,
        passwordHash,
        'user',
        'active',
        0,
        0,
        now,
        now,
      ],
    );

    return toSafeUser({
      id,
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      password_hash: passwordHash,
      role: 'user',
      status: 'active',
      email_verified: 0,
      phone_verified: 0,
      created_at: now,
      updated_at: now,
    });
  }

  /**
   * Authenticates user credentials, generates a short-lived access token,
   * generates a cryptographically secure refresh token, hashes it with SHA-256,
   * and persists session metadata (IP & user-agent) to the `sessions` table.
   */
  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const userResult = await this.d1.query<UserRow>(
      'SELECT * FROM users WHERE email = ? LIMIT 1;',
      [dto.email],
    );

    if (userResult.results.length === 0) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const user = userResult.results[0];

    if (user.status === 'suspended') {
      throw new UnauthorizedException(
        'Account is suspended. Please contact support.',
      );
    }

    const isPasswordValid = await this.passwordService.verify(
      user.password_hash,
      dto.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Generate short-lived JWT access token (15 minutes)
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '15m',
    });

    // Generate cryptographically random refresh token
    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const hashedRefreshToken = this.hashToken(rawRefreshToken);

    // Session lifetime: 7 days
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const sessionId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await this.d1.query(
      `INSERT INTO sessions (
        id, user_id, refresh_token, expires_at, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        sessionId,
        user.id,
        hashedRefreshToken,
        expiresAt,
        ipAddress ?? null,
        userAgent ?? null,
        createdAt,
      ],
    );

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: toSafeUser(user),
    };
  }

  /**
   * Validates a refresh token against the `sessions` table (matching SHA-256 hash)
   * and ensures the session has not expired and the user account is active.
   */
  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const hashedRefreshToken = this.hashToken(refreshToken);

    const sessionResult = await this.d1.query<SessionRow>(
      'SELECT * FROM sessions WHERE refresh_token = ? LIMIT 1;',
      [hashedRefreshToken],
    );

    if (sessionResult.results.length === 0) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    const session = sessionResult.results[0];

    if (new Date(session.expires_at).getTime() <= Date.now()) {
      // Clean up expired session row
      await this.d1.query('DELETE FROM sessions WHERE id = ?;', [session.id]);
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    // Fetch user to ensure account exists and is active
    const userResult = await this.d1.query<UserRow>(
      'SELECT id, email, role, status FROM users WHERE id = ? LIMIT 1;',
      [session.user_id],
    );

    if (
      userResult.results.length === 0 ||
      userResult.results[0].status === 'suspended'
    ) {
      throw new UnauthorizedException(
        'User account is invalid or suspended.',
      );
    }

    const user = userResult.results[0];
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '15m',
    });

    return { accessToken };
  }

  /**
   * Logs out the user by deleting the session row corresponding to the SHA-256
   * hash of the provided refresh token.
   */
  async logout(refreshToken: string): Promise<{ message: string }> {
    const hashedRefreshToken = this.hashToken(refreshToken);

    await this.d1.query('DELETE FROM sessions WHERE refresh_token = ?;', [
      hashedRefreshToken,
    ]);

    return { message: 'Logged out successfully.' };
  }
}
