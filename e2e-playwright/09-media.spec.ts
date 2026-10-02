import { test, expect } from '@playwright/test';
import { getAdminAccessToken } from './helpers/auth';

test.describe('09. Media Surface (Admin Storage)', () => {
  let adminAccessToken: string;
  let mintedKey: string;

  test.beforeAll(async ({ request }) => {
    adminAccessToken = await getAdminAccessToken(request);
  });

  test('POST /api/admin/media/upload-url (Mint signed upload URL)', async ({ request }) => {
    const res = await request.post('admin/media/upload-url', {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      data: {
        prefix: 'public/site',
        contentType: 'image/png',
        size: 5000,
        filename: 'logo.png',
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('key');
    expect(body).toHaveProperty('uploadUrl');
    mintedKey = body.key;
  });

  test('POST /api/admin/media/read-url (Mint signed read URL for media)', async ({ request }) => {
    test.skip(!mintedKey, 'No media key minted');

    const res = await request.post('admin/media/read-url', {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      data: {
        key: mintedKey,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('readUrl');
  });

  test('POST /api/admin/media/confirm (Reject fabricated or un-uploaded key with 404)', async ({ request }) => {
    const res = await request.post('admin/media/confirm', {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      data: {
        key: 'public/site/non-existent-fabricated-file.png',
      },
    });
    expect(res.status()).toBe(404);
  });
});
