import { ApiProperty } from '@nestjs/swagger';
import type { UserRole, UserStatus } from '../interfaces/user.interface';

/**
 * Public-facing User DTO.
 * Explicitly excludes `password_hash` to prevent credential exposure.
 */
export class SafeUserDto {
  @ApiProperty({ description: 'User id (UUID v4).' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ format: 'email' })
  email: string;

  @ApiProperty()
  phone: string;

  @ApiProperty({ enum: ['user', 'admin'] satisfies [UserRole, ...UserRole[]] })
  role: UserRole;

  @ApiProperty({ enum: ['active', 'suspended'] satisfies [UserStatus, ...UserStatus[]] })
  status: UserStatus;

  @ApiProperty()
  email_verified: boolean;

  @ApiProperty()
  phone_verified: boolean;

  @ApiProperty({ description: 'ISO 8601 timestamp.' })
  created_at: string;

  @ApiProperty({ description: 'ISO 8601 timestamp.' })
  updated_at: string;
}
