export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'suspended';

/**
 * Raw row shape stored in Cloudflare D1 `users` table.
 */
export interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  password_hash: string;
  role: UserRole;
  status: UserStatus;
  email_verified: number; // 0 or 1 in SQLite
  phone_verified: number; // 0 or 1 in SQLite
  created_at: string;
  updated_at: string;
}
