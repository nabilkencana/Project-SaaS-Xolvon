import { test, expect } from '@playwright/test';

test.describe('01. Auth Surface', () => {
  const ts = Date.now();
  const testUser = {
    email: `auth.e2e.${ts}@example.com`,
    phone: `+6282${String(ts).slice(-8)}`,
    password: 'Password123!',
    name: 'Auth E2E User',
  };

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe-Admin-123!';

  let userAccessToken: string;
  let userRefreshToken: string;
  let adminAccessToken: string;

  test('POST /api/auth/register (Register user with optional name)', async ({ request }) => {
    const res = await request.post('auth/register', { data: testUser });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body.email).toBe(testUser.email);
    expect(body.role).toBe('user');
    expect(body).not.toHaveProperty('password_hash');
  });

  test('POST /api/auth/login (Login user)', async ({ request }) => {
    const res = await request.post('auth/login', {
      data: { email: testUser.email, password: testUser.password },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('refreshToken');
    userAccessToken = body.accessToken;
    userRefreshToken = body.refreshToken;
  });

  test('GET /api/auth/me (Get profile of authenticated user)', async ({ request }) => {
    const res = await request.get('auth/me', {
      headers: { Authorization: `Bearer ${userAccessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.email).toBe(testUser.email);
  });

  test('POST /api/auth/refresh (Exchange refresh token for access token)', async ({ request }) => {
    const res = await request.post('auth/refresh', {
      data: { refreshToken: userRefreshToken },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('accessToken');
  });

  test('POST /api/auth/admin/login (Dedicated admin login)', async ({ request }) => {
    const res = await request.post('auth/admin/login', {
      data: { email: adminEmail, password: adminPassword },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('accessToken');
    expect(body.user.role).toBe('admin');
    adminAccessToken = body.accessToken;
  });

  test('POST /api/auth/admin/login (Rejects non-admin with 403)', async ({ request }) => {
    const res = await request.post('auth/admin/login', {
      data: { email: testUser.email, password: testUser.password },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.message).toContain('Hanya admin');
  });

  test('GET /api/auth/admin (Admin access probe)', async ({ request }) => {
    // 1. User is rejected with 403
    const userRes = await request.get('auth/admin', {
      headers: { Authorization: `Bearer ${userAccessToken}` },
    });
    expect(userRes.status()).toBe(403);

    // 2. Admin is allowed with 200
    const adminRes = await request.get('auth/admin', {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    expect(adminRes.status()).toBe(200);
    const body = await adminRes.json();
    expect(body.user.role).toBe('admin');
  });

  test('POST /api/auth/logout (Revoke session)', async ({ request }) => {
    const res = await request.post('auth/logout', {
      data: { refreshToken: userRefreshToken },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.message).toContain('Logged out');
  });
});
