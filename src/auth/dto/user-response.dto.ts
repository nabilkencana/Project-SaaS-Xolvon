import type { UserRole, UserStatus } from '../interfaces/user.interface';

/**
 * Public-facing User DTO.
 * Explicitly excludes `password_hash` to prevent credential exposure.
 */
export class SafeUserDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
}
