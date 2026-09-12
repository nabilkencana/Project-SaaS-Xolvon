import { ConfigService } from '@nestjs/config';
import { validateEnvironment } from '../config/env.validation';
import { LocalTestStorageService } from './local-test-storage.service';
import { R2StorageService } from './r2-storage.service';

describe('media storage providers', () => {
  it('creates deterministic local upload and read URLs without exposing credentials', async () => {
    const storage = new LocalTestStorageService();

    const uploadUrl = await storage.createUploadUrl({
      key: 'public/site/asset/file.png',
      contentType: 'image/png',
      contentLength: 12,
    });

    expect(uploadUrl).toBe('http://local-storage.test/upload/public/site/asset/file.png');
    expect(await storage.createReadUrl('public/site/asset/file.png')).toBe(
      'http://local-storage.test/read/public/site/asset/file.png',
    );
  });

  it('uses S3 presigning with the requested object metadata and expiries', async () => {
    const storage = new R2StorageService(
      new ConfigService({
        R2_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
        R2_ACCESS_KEY_ID: 'access-key',
        R2_SECRET_ACCESS_KEY: 'secret-key',
        R2_BUCKET: 'xolvon-storage',
      }),
    );

    const uploadUrl = await storage.createUploadUrl({
      key: 'private/projects/project/file.png',
      contentType: 'image/png',
      contentLength: 12,
    });

    expect(uploadUrl).toContain('X-Amz-Expires=3600');
    expect(uploadUrl).toContain('/private/projects/project/file.png?');
    expect(await storage.createReadUrl('private/projects/project/file.png')).toContain(
      'X-Amz-Expires=300',
    );
  });

  it('conditionally validates R2 configuration and never echoes secret values', () => {
    const base = {
      JWT_SECRET: 'a-sufficiently-long-jwt-secret-32ch',
      FRONTEND_URL: 'https://app.example.com',
      STORAGE_DRIVER: 'r2',
      R2_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
      R2_BUCKET: 'xolvon-storage',
      R2_ACCESS_KEY_ID: 'access-key',
      R2_SECRET_ACCESS_KEY: 'secret-value',
    };

    expect(() => validateEnvironment({ ...base, R2_SECRET_ACCESS_KEY: undefined })).toThrow(
      'R2_SECRET_ACCESS_KEY',
    );
    expect(() => validateEnvironment({ ...base, STORAGE_DRIVER: 'local-test' })).not.toThrow();

    try {
      validateEnvironment({ ...base, R2_SECRET_ACCESS_KEY: undefined });
    } catch (error) {
      expect((error as Error).message).not.toContain('secret-value');
    }
  });
});
