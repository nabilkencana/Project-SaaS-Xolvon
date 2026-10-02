import { test, expect } from '@playwright/test';
import { getAdminAccessToken } from './helpers/auth';

test.describe('05. Collective Surface', () => {
  const ts = Date.now();
  const testMemberSlug = `playwright-col-${ts}`;
  let adminAccessToken: string;
  let memberId: string;

  test.beforeAll(async ({ request }) => {
    adminAccessToken = await getAdminAccessToken(request);
  });

  test('GET /api/collective (Public collective directory)', async ({ request }) => {
    const res = await request.get('collective');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('items');
    expect(Array.isArray(body.items)).toBe(true);
  });

  test('POST /api/collective (Admin create collective member)', async ({ request }) => {
    const res = await request.post('collective', {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      data: {
        name: `Playwright Member ${ts}`,
        slug: testMemberSlug,
        role: 'Lead QA Engineer',
        skills: ['Playwright', 'Automation', 'QA'],
        bio: 'Automating tests with Playwright.',
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body.slug).toBe(testMemberSlug);
    expect(body.status).toBe('draft');
    memberId = body.id;
  });

  test('PATCH /api/collective/:id (Admin update collective member)', async ({ request }) => {
    const res = await request.patch(`collective/${memberId}`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      data: {
        role: 'Principal QA Engineer',
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.role).toBe('Principal QA Engineer');
  });

  test('POST /api/collective/:id/publish (Admin publish member)', async ({ request }) => {
    const res = await request.post(`collective/${memberId}/publish`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('published');
  });

  test('GET /api/collective/:slug (Public detail of published member)', async ({ request }) => {
    const res = await request.get(`collective/${testMemberSlug}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.slug).toBe(testMemberSlug);
  });

  test('POST /api/collective/:id/unpublish (Admin unpublish member)', async ({ request }) => {
    const res = await request.post(`collective/${memberId}/unpublish`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('draft');
  });
});
