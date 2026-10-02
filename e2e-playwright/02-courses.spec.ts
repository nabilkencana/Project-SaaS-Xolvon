import { test, expect } from '@playwright/test';
import { getAdminAccessToken } from './helpers/auth';

test.describe('02. Courses Surface', () => {
  const ts = Date.now();
  const testCourseSlug = `playwright-course-${ts}`;
  let adminAccessToken: string;
  let courseId: string;

  test.beforeAll(async ({ request }) => {
    adminAccessToken = await getAdminAccessToken(request);
  });

  test('GET /api/courses (Public catalog list)', async ({ request }) => {
    const res = await request.get('courses');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('items');
    expect(body).toHaveProperty('total');
  });

  test('POST /api/courses (Admin create course)', async ({ request }) => {
    const res = await request.post('courses', {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      data: {
        title: `Playwright Test Course ${ts}`,
        slug: testCourseSlug,
        description: 'Comprehensive test course for Playwright automation.',
        price: 250000,
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body.slug).toBe(testCourseSlug);
    expect(body.status).toBe('draft');
    courseId = body.id;
  });

  test('PATCH /api/courses/:id (Admin update course)', async ({ request }) => {
    const res = await request.patch(`courses/${courseId}`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      data: {
        title: `Updated Playwright Course ${ts}`,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.title).toContain('Updated');
  });

  test('POST /api/courses/:id/publish (Admin publish course)', async ({ request }) => {
    const res = await request.post(`courses/${courseId}/publish`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('published');
  });

  test('GET /api/courses/:slug (Public detail of published course)', async ({ request }) => {
    const res = await request.get(`courses/${testCourseSlug}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.slug).toBe(testCourseSlug);
  });

  test('POST /api/courses/:id/unpublish (Admin unpublish course)', async ({ request }) => {
    const res = await request.post(`courses/${courseId}/unpublish`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('draft');
  });
});
