import { test, expect } from '@playwright/test';
import { getAdminAccessToken } from './helpers/auth';

test.describe('03. Lessons & Resources Surface', () => {
  const ts = Date.now();
  let adminAccessToken: string;
  let courseId: string;
  let courseSlug: string;
  let lessonId: string;
  let resourceId: string;

  test.beforeAll(async ({ request }) => {
    // 1. Admin login
    adminAccessToken = await getAdminAccessToken(request);

    // 2. Create course
    courseSlug = `playwright-lessons-course-${ts}`;
    const courseRes = await request.post('courses', {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      data: {
        title: `Playwright Lessons Course ${ts}`,
        slug: courseSlug,
        description: 'Course to hold lessons for Playwright testing.',
        price: 150000,
      },
    });
    const courseBody = await courseRes.json();
    courseId = courseBody.id;
  });

  test('POST /api/courses/:courseId/lessons (Admin create lesson)', async ({ request }) => {
    const res = await request.post(`courses/${courseId}/lessons`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      data: {
        title: `Lesson 1 - Playwright ${ts}`,
        content: 'Lesson content here.',
        orderIndex: 1,
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body.title).toContain('Lesson 1');
    lessonId = body.id;
  });

  test('PATCH /api/lessons/:id (Admin update lesson)', async ({ request }) => {
    const res = await request.patch(`lessons/${lessonId}`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      data: {
        title: `Lesson 1 Updated ${ts}`,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.title).toContain('Updated');
  });

  test('PATCH /api/lessons/:id/reorder (Admin reorder lesson)', async ({ request }) => {
    const res = await request.patch(`lessons/${lessonId}/reorder`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      data: {
        orderIndex: 2,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.orderIndex).toBe(2);
  });

  test('POST /api/lessons/:id/publish (Admin publish lesson)', async ({ request }) => {
    const res = await request.post(`lessons/${lessonId}/publish`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('published');
  });

  test('GET /api/courses/:slug/lessons (Public list of lessons)', async ({ request }) => {
    // When course is published
    await request.post(`courses/${courseId}/publish`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });

    const res = await request.get(`courses/${courseSlug}/lessons`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('POST /api/lessons/:id/unpublish (Admin unpublish lesson)', async ({ request }) => {
    const res = await request.post(`lessons/${lessonId}/unpublish`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('draft');
  });

  test('GET /api/lessons/:id/video-url (Anonymous request rejected with 401)', async ({ request }) => {
    const res = await request.get(`lessons/${lessonId}/video-url`);
    expect(res.status()).toBe(401);
  });

  test('POST /api/lessons/:lessonId/resources (Admin create resource)', async ({ request }) => {
    const res = await request.post(`lessons/${lessonId}/resources`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      data: {
        type: 'pdf',
        title: 'Cheatsheet PDF',
        objectKey: 'public/resources/cheatsheet.pdf',
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body.type).toBe('pdf');
    resourceId = body.id;
  });

  test('DELETE /api/resources/:id (Admin delete resource)', async ({ request }) => {
    const res = await request.delete(`resources/${resourceId}`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    expect(res.status()).toBe(200);
  });

  test('DELETE /api/lessons/:id (Admin delete lesson)', async ({ request }) => {
    const res = await request.delete(`lessons/${lessonId}`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    expect(res.status()).toBe(200);
  });
});
