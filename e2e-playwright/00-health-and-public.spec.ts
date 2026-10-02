import { test, expect } from '@playwright/test';

test.describe('00. Health & Public Surface', () => {
  test('GET /api (Health Check)', async ({ request }) => {
    const res = await request.get('');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain('Hello World!');
  });

  test('GET /api/home (Home Aggregation)', async ({ request }) => {
    const res = await request.get('home');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toBeDefined();
  });

  test('GET /api/search (Search published content)', async ({ request }) => {
    const res = await request.get('search?q=test&page=1&limit=10');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('items');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('query');
  });
});
