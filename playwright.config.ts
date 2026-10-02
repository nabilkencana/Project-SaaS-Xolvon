import { defineConfig } from '@playwright/test';

/**
 * Playwright API Automation & Regression Testing Configuration.
 * Optimized for lightweight, fast REST API contract & smoke verification.
 */
export default defineConfig({
  testDir: './e2e-playwright',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  workers: 1, // Sequential execution to prevent database transaction collisions on local SQLite
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.BASE_URL
      ? process.env.BASE_URL.endsWith('/')
        ? process.env.BASE_URL
        : process.env.BASE_URL + '/'
      : 'http://localhost:3000/api/',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  },
  webServer: {
    command: 'node dist/main',
    url: 'http://localhost:3000/api',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
