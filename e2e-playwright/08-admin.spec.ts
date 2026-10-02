import { test, expect } from '@playwright/test';
import { getAdminAccessToken } from './helpers/auth';

test.describe('08. Admin Operational Surfaces', () => {
  let adminAccessToken: string;
  let sampleUserId: string;

  test.beforeAll(async ({ request }) => {
    adminAccessToken = await getAdminAccessToken(request);
  });

  test('GET /api/admin/overview (Dashboard counters)', async ({ request }) => {
    const res = await request.get('admin/overview', {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('userCount');
    expect(body).toHaveProperty('pendingOrders');
    expect(body).toHaveProperty('activeEnrollments');
    expect(typeof body.userCount).toBe('number');
  });

  test('GET /api/admin/users (List users paginated)', async ({ request }) => {
    const res = await request.get('admin/users?page=1&limit=10', {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('items');
    expect(body).toHaveProperty('total');
    expect(Array.isArray(body.items)).toBe(true);
    if (body.items.length > 0) {
      sampleUserId = body.items[0].id;
    }
  });

  test('GET /api/admin/users/:id (User detail)', async ({ request }) => {
    test.skip(!sampleUserId, 'No user available to test detail lookup');

    const res = await request.get(`admin/users/${sampleUserId}`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(sampleUserId);
    expect(body).toHaveProperty('enrollments');
    expect(body).toHaveProperty('orders');
    expect(body).not.toHaveProperty('password_hash');
  });

  test('GET /api/admin/orders (List orders paginated)', async ({ request }) => {
    const res = await request.get('admin/orders?page=1&limit=10', {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('items');
    expect(body).toHaveProperty('total');
    expect(Array.isArray(body.items)).toBe(true);
  });
});
