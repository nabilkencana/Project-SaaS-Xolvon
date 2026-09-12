import { randomUUID } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { PasswordService } from '../auth/password.service';

export type AdminBootstrapResult = 'created' | 'already_exists';

export interface AdminBootstrapInput {
  email: string;
  password: string;
}

export async function bootstrapAdmin(
  db: DatabaseService,
  passwordService: PasswordService,
  input: AdminBootstrapInput,
): Promise<AdminBootstrapResult> {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.password) {
    throw new Error('ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD are required');
  }

  const existing = await db.queryOne<{ id: string; role: string }>(
    'SELECT id, role FROM users WHERE email = ? LIMIT 1',
    [email],
  );
  if (existing) {
    if (existing.role !== 'admin') {
      throw new ConflictException('Admin bootstrap email is already assigned to a non-admin user');
    }
    return 'already_exists';
  }

  const passwordHash = await passwordService.hash(input.password);
  try {
    await db.execute(
      `INSERT INTO users (
        id, name, email, password_hash, role, status,
        email_verified, phone_verified, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'admin', 'active', 0, 0, ?, ?)`,
      [randomUUID(), 'Admin', email, passwordHash, new Date().toISOString(), new Date().toISOString()],
    );
    return 'created';
  } catch (error) {
    const conflicting = await db.queryOne<{ role: string }>(
      'SELECT role FROM users WHERE email = ? LIMIT 1',
      [email],
    );
    if (conflicting?.role === 'admin') return 'already_exists';
    throw error;
  }
}
