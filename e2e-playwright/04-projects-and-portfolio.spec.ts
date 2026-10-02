import { test, expect } from '@playwright/test';
import { getAdminAccessToken } from './helpers/auth';

test.describe('04. Projects & Portfolio Surface', () => {
  const ts = Date.now();
  const testProjectSlug = `playwright-project-${ts}`;
  let adminAccessToken: string;
  let projectId: string;
  let mediaId: string;
  let memberId: string;

  test.beforeAll(async ({ request }) => {
    // 1. Admin login
    adminAccessToken = await getAdminAccessToken(request);

    // 2. Create collective member for project assignment
    const memberRes = await request.post('collective', {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      data: {
        name: `Playwright Member ${ts}`,
        slug: `playwright-member-${ts}`,
        role: 'Software Engineer',
        skills: ['TypeScript', 'NestJS'],
      },
    });
    const memberBody = await memberRes.json();
    memberId = memberBody.id;
  });

  test('GET /api/projects (Public catalog list)', async ({ request }) => {
    const res = await request.get('projects');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('items');
    expect(body).toHaveProperty('total');
  });

  test('POST /api/projects (Admin create project)', async ({ request }) => {
    const res = await request.post('projects', {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      data: {
        title: `Playwright Project ${ts}`,
        slug: testProjectSlug,
        summary: 'Portfolio project for testing.',
        problem: 'Client had fragmented reporting processes.',
        solution: 'Unified dashboard delivering automated metrics in real time.',
        type: 'web-application',
        techStack: 'TypeScript,NestJS,React',
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body.slug).toBe(testProjectSlug);
    expect(body.status).toBe('draft');
    projectId = body.id;
  });

  test('PATCH /api/projects/:id (Admin update project)', async ({ request }) => {
    const res = await request.patch(`projects/${projectId}`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      data: {
        title: `Updated Playwright Project ${ts}`,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.title).toContain('Updated');
  });

  test('POST /api/projects/:id/publish (Admin publish project)', async ({ request }) => {
    const res = await request.post(`projects/${projectId}/publish`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('published');
  });

  test('GET /api/projects/:slug (Public detail of published project)', async ({ request }) => {
    const res = await request.get(`projects/${testProjectSlug}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.slug).toBe(testProjectSlug);
  });

  test('POST /api/projects/:id/media (Admin attach media to project)', async ({ request }) => {
    const res = await request.post(`projects/${projectId}/media`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      data: {
        objectKey: 'public/projects/hero.png',
        mediaType: 'image',
        sortOrder: 1,
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    mediaId = body.id;
  });

  test('DELETE /api/projects/:id/media/:mediaId (Admin remove media from project)', async ({ request }) => {
    const res = await request.delete(`projects/${projectId}/media/${mediaId}`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    expect(res.status()).toBe(200);
  });

  test('POST /api/projects/:id/members (Admin assign member to project)', async ({ request }) => {
    const res = await request.post(`projects/${projectId}/members`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      data: {
        memberId: memberId,
        role: 'Lead Architect',
      },
    });
    expect(res.status()).toBe(201);
  });

  test('DELETE /api/projects/:id/members/:memberId (Admin remove member from project)', async ({ request }) => {
    const res = await request.delete(`projects/${projectId}/members/${memberId}`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    expect(res.status()).toBe(200);
  });

  test('POST /api/projects/:id/unpublish (Admin unpublish project)', async ({ request }) => {
    const res = await request.post(`projects/${projectId}/unpublish`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('draft');
  });
});
