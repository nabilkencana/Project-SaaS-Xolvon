import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  it('should hash a password with argon2 and verify correctly', async () => {
    const rawPassword = 'SecurePassword!123';
    const hash = await service.hash(rawPassword);

    expect(hash).toBeDefined();
    expect(hash).toContain('$argon2');

    const isValid = await service.verify(hash, rawPassword);
    expect(isValid).toBe(true);

    const isWrong = await service.verify(hash, 'WrongPassword!456');
    expect(isWrong).toBe(false);
  });
});
