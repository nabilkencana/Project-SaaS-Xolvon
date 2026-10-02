import { test, expect } from '@playwright/test';
import { getAdminAccessToken } from './helpers/auth';

test.describe('06. Marketplace Surface', () => {
  const ts = Date.now();
  const testMarketplaceSlug = `playwright-mp-${ts}`;
  let adminAccessToken: string;
  let marketplaceId: string;
  let mediaId: string;

  test.beforeAll(async ({ request }) => {
    adminAccessToken = await getAdminAccessToken(request);
  });

  test('GET /api/marketplace (Public marketplace list)', async ({ request }) => {
    const res = await request.get('marketplace');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('items');
    expect(body).toHaveProperty('total');
  });

  test('POST /api/marketplace (Admin create marketplace item)', async ({ request }) => {
    const res = await request.post('marketplace', {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      data: {
        title: `Playwright Product ${ts}`,
        slug: testMarketplaceSlug,
        description: 'Automated test product for marketplace.',
        externalUrl: 'https://example.com/saas-tool',
        capabilities: ['Feature A', 'Feature B'],
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    expect(body.slug).toBe(testMarketplaceSlug);
    expect(body.status).toBe('draft');
    marketplaceId = body.id;
  });

  test('PATCH /api/marketplace/:id (Admin update marketplace item)', async ({ request }) => {
    const res = await request.patch(`marketplace/${marketplaceId}`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      data: {
        title: `Updated Product ${ts}`,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.title).toContain('Updated');
  });

  test('POST /api/marketplace/:id/publish (Admin publish marketplace item)', async ({ request }) => {
    const res = await request.post(`marketplace/${marketplaceId}/publish`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('published');
  });

  test('GET /api/marketplace/:slug (Public detail of published item)', async ({ request }) => {
    const res = await request.get(`marketplace/${testMarketplaceSlug}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.slug).toBe(testMarketplaceSlug);
  });

  test('POST /api/marketplace/:id/media (Admin attach media to marketplace item)', async ({ request }) => {
    const res = await request.post(`marketplace/${marketplaceId}/media`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      data: {
        objectKey: 'public/marketplace/thumb.png',
        mediaType: 'image',
        sortOrder: 1,
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('id');
    mediaId = body.id;
  });

  test('DELETE /api/marketplace/:id/media/:mediaId (Admin remove media from marketplace item)', async ({ request }) => {
    const res = await request.delete(`marketplace/${marketplaceId}/media/${mediaId}`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    expect(res.status()).toBe(200);
  });

  test('POST /api/marketplace/:id/unpublish (Admin unpublish marketplace item)', async ({ request }) => {
    const res = await request.post(`marketplace/${marketplaceId}/unpublish`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('draft');
  });
});
