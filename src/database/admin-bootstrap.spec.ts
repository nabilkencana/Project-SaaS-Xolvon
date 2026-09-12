import { ConflictException } from '@nestjs/common';
import { bootstrapAdmin } from './admin-bootstrap';
import type { DatabaseService } from './database.service';
import type { PasswordService } from '../auth/password.service';

describe('bootstrapAdmin', () => {
  const passwordService = { hash: jest.fn() } as unknown as jest.Mocked<PasswordService>;
  const db = {
    queryOne: jest.fn(),
    execute: jest.fn(),
  } as unknown as jest.Mocked<DatabaseService>;

  beforeEach(() => {
    jest.clearAllMocks();
    passwordService.hash.mockResolvedValue('$argon2id$hashed');
    db.execute.mockResolvedValue(undefined);
  });

  it('creates an admin with a PasswordService hash', async () => {
    db.queryOne.mockResolvedValue(undefined);

    await expect(
      bootstrapAdmin(db, passwordService, {
        email: ' ADMIN@EXAMPLE.COM ',
        password: 'controlled-password',
      }),
    ).resolves.toBe('created');

    expect(passwordService.hash).toHaveBeenCalledWith('controlled-password');
    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining("VALUES (?, ?, ?, ?, 'admin', 'active'"),
      expect.arrayContaining(['admin@example.com', '$argon2id$hashed']),
    );
  });

  it('is idempotent for an existing admin and does not rehash or overwrite it', async () => {
    db.queryOne.mockResolvedValue({ id: 'admin-1', role: 'admin' });

    await expect(
      bootstrapAdmin(db, passwordService, { email: 'admin@example.com', password: 'new-password' }),
    ).resolves.toBe('already_exists');

    expect(passwordService.hash).not.toHaveBeenCalled();
    expect(db.execute).not.toHaveBeenCalled();
  });

  it('rejects an existing non-admin email without changing its role', async () => {
    db.queryOne.mockResolvedValue({ id: 'user-1', role: 'user' });

    await expect(
      bootstrapAdmin(db, passwordService, { email: 'user@example.com', password: 'password' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(db.execute).not.toHaveBeenCalled();
  });

  it('does not include the password in validation errors', async () => {
    await expect(
      bootstrapAdmin(db, passwordService, { email: '', password: 'secret-not-for-logs' }),
    ).rejects.toThrow('ADMIN_BOOTSTRAP_EMAIL');
    try {
      await bootstrapAdmin(db, passwordService, { email: '', password: 'secret-not-for-logs' });
    } catch (error) {
      expect((error as Error).message).not.toContain('secret-not-for-logs');
    }
  });
});
