import { APIRequestContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const TOKEN_FILE = path.join(__dirname, '..', '.admin-token.json');

/**
 * Reusable admin token retriever with file-based TTL caching.
 * Protects test execution from hitting auth throttle limits (5 req/min on admin login).
 */
export async function getAdminAccessToken(request: APIRequestContext): Promise<string> {
  if (fs.existsSync(TOKEN_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
      if (data.token && data.expiresAt > Date.now()) {
        return data.token;
      }
    } catch {
      // cache corrupted or unparseable, re-login
    }
  }

  const res = await request.post('auth/admin/login', {
    data: {
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      password: process.env.ADMIN_PASSWORD || 'ChangeMe-Admin-123!',
    },
  });

  if (!res.ok()) {
    throw new Error(`Admin login failed: ${res.status()} ${await res.text()}`);
  }

  const body = await res.json();
  const token = body.accessToken;

  try {
    fs.writeFileSync(
      TOKEN_FILE,
      JSON.stringify({ token, expiresAt: Date.now() + 10 * 60 * 1000 }),
      'utf8',
    );
  } catch {
    // If writing fails, still return token in memory
  }

  return token;
}
