import './e2e-setup';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getOptionsToken } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { PasswordService } from '../src/auth/password.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { resolveTrustProxyHops } from '../src/config/trust-proxy';
import type { JwtPayload } from '../src/auth/interfaces/jwt-payload.interface';

describe('Backend API (e2e, deterministic — no Cloudflare access)', () => {
  let app: INestApplication<App>;
  let dbQueryAll: jest.Mock;
  let dbQueryOne: jest.Mock;
  let dbExecute: jest.Mock;
  let fetchSpy: jest.SpyInstance;
  let jwtService: JwtService;

  // Shared PasswordService mock so individual tests can stub verify() once.
  const passwordMock = {
    hash: jest.fn(async () => 'hashed-password'),
    verify: jest.fn(async () => true),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue({
        queryAll: jest.fn(),
        queryOne: jest.fn(),
        execute: jest.fn(),
      })
      .overrideProvider(PasswordService)
      .useValue(passwordMock)
      .compile();

    app = moduleFixture.createNestApplication();

    // Mirror the production bootstrap in src/main.ts
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();

    jwtService = app.get(JwtService);
    const db = app.get(DatabaseService) as unknown as {
      queryAll: jest.Mock;
      queryOne: jest.Mock;
      execute: jest.Mock;
    };
    dbQueryAll = db.queryAll;
    dbQueryOne = db.queryOne;
    dbExecute = db.execute;
    dbQueryAll.mockReset();
    dbQueryOne.mockReset();
    dbExecute.mockReset();

    fetchSpy = jest.spyOn(globalThis, 'fetch');
  });

  afterAll(async () => {
    // Proof that the whole suite never contacted Cloudflare.
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    await app.close();
  });

  beforeEach(() => {
    dbQueryAll.mockReset();
    dbQueryOne.mockReset();
    dbExecute.mockReset();
  });

  /** Asserts the whole data layer stayed untouched during the current test. */
  function expectDbUnused(): void {
    expect(dbQueryAll).not.toHaveBeenCalled();
    expect(dbQueryOne).not.toHaveBeenCalled();
    expect(dbExecute).not.toHaveBeenCalled();
  }

  async function signToken(
    payload: Partial<JwtPayload> & { sub: string; email: string; role: string },
  ): Promise<string> {
    return jwtService.signAsync(payload);
  }

  describe('GET /api (health)', () => {
    it('returns the health response', async () => {
      const res = await request(app.getHttpServer()).get('/api').expect(200);
      expect(res.text).toBe('Hello World!');
    });
  });

  describe('request integrity for browser mutations', () => {
    it('t3-allowed-origin: allows configured browser metadata to reach auth', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Origin', 'http://localhost:3001')
        .send({ courseIds: ['0b9e6b5e-1111-4222-8333-444455556666'] })
        .expect(401);

      expect(res.body.message).toBe('Missing or invalid authorization token.');
    });

    it('t3-disallowed-origin: rejects a browser mutation before authentication', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Origin', 'https://evil.example')
        .send({ courseIds: ['0b9e6b5e-1111-4222-8333-444455556666'] })
        .expect(403);

      expect(res.body.message).toBe('Request metadata is not allowed.');
      expectDbUnused();
    });

    it.each([
      ['PATCH', '/api/orders/0b9e6b5e-1111-4222-8333-444455556666/verify'],
      ['DELETE', '/api/lessons/7c9e6679-7425-40de-944b-e07fc1f90ae7'],
    ])('t3-disallowed-origin-%s: rejects mutation metadata before routing', async (method, path) => {
      const res = await request(app.getHttpServer())
        [method.toLowerCase() as 'patch' | 'delete'](path)
        .set('Origin', 'https://evil.example')
        .expect(403);

      expect(res.body.message).toBe('Request metadata is not allowed.');
      expectDbUnused();
    });

    it('t3-service-client: allows absent browser metadata for bearer service clients', async () => {
      await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', 'Bearer service-client-token')
        .send({ courseIds: ['0b9e6b5e-1111-4222-8333-444455556666'] })
        .expect(401);
    });

    it('t3-fetch-metadata: rejects cross-site mutations', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Sec-Fetch-Site', 'cross-site')
        .send({ courseIds: ['0b9e6b5e-1111-4222-8333-444455556666'] })
        .expect(403);

      expect(res.body.message).toBe('Request metadata is not allowed.');
      expectDbUnused();
    });

    it('t3-get-unaffected: leaves GET requests unaffected by disallowed metadata', async () => {
      await request(app.getHttpServer())
        .get('/api')
        .set('Origin', 'https://evil.example')
        .expect(200);
    });
  });

  describe('POST /api/auth/register', () => {
    const validPayload = {
      name: 'E2E User',
      email: 'e2e.user@example.com',
      phone: '+62812345678',
      password: 'SuperSecret123',
    };

    it('creates a user and never returns the password hash', async () => {
      dbQueryOne.mockResolvedValueOnce(undefined); // uniqueness check

      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(validPayload)
        .expect(201);

      expect(res.body).toMatchObject({
        name: 'E2E User',
        email: 'e2e.user@example.com',
        role: 'user',
        status: 'active',
        email_verified: false,
        phone_verified: false,
      });
      expect(res.body.id).toBeDefined();
      expect(res.body).not.toHaveProperty('password_hash');
      expect(JSON.stringify(res.body)).not.toContain('hashed-password');

      expect(dbQueryOne).toHaveBeenCalledTimes(1);
      expect(dbExecute).toHaveBeenCalledTimes(1);
      const [checkSql, checkParams] = dbQueryOne.mock.calls[0];
      expect(checkSql).toContain('SELECT id FROM users');
      expect(checkParams).toEqual([
        'e2e.user@example.com',
        '+62812345678',
      ]);
      const [insertSql] = dbExecute.mock.calls[0];
      expect(insertSql).toContain('INSERT INTO users');
      expect(insertSql).not.toContain('SuperSecret123');
    });

    it('rejects invalid payloads with 400 and structured messages', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: 'x' })
        .expect(400);

      expect(Array.isArray(res.body.message)).toBe(true);
      expect(res.body.message).toEqual(
        expect.arrayContaining([
          'Name is required.',
          'A valid email address is required.',
        ]),
      );
      expectDbUnused();
    });

    it('rejects unknown (non-whitelisted) properties with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ ...validPayload, isAdmin: true })
        .expect(400);
      expect(JSON.stringify(res.body)).toContain('isAdmin');
    });

    it('returns a generic 409 conflict without enumeration details', async () => {
      dbQueryOne.mockResolvedValueOnce({ id: 'existing-1' });

      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(validPayload)
        .expect(409);

      expect(res.body.message).toBe(
        'An account with these credentials is already registered.',
      );
    });
  });

  describe('POST /api/auth/login', () => {
    const loginPayload = {
      email: 'e2e.user@example.com',
      password: 'SuperSecret123',
    };

    const userRow = {
      id: 'user-uuid-1',
      name: 'E2E User',
      email: 'e2e.user@example.com',
      phone: '+62812345678',
      password_hash: 'hashed-password',
      role: 'user',
      status: 'active',
      email_verified: 0,
      phone_verified: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('returns access and refresh tokens plus a sanitized user', async () => {
      dbQueryOne.mockResolvedValueOnce(userRow); // find user by email

      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(loginPayload)
        .expect(200);

      expect(typeof res.body.accessToken).toBe('string');
      expect(res.body.refreshToken).toMatch(/^[0-9a-f]{64}$/);
      expect(res.body.user).toMatchObject({ id: 'user-uuid-1' });
      expect(JSON.stringify(res.body)).not.toContain('hashed-password');

      expect(dbExecute).toHaveBeenCalledTimes(1);
      const [sessionSql] = dbExecute.mock.calls[0];
      expect(sessionSql).toContain('INSERT INTO sessions');
    });

    it('returns 401 for an unknown email without revealing which field failed', async () => {
      dbQueryOne.mockResolvedValueOnce(undefined);

      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'ghost@example.com', password: 'whatever1' })
        .expect(401);

      expect(res.body.message).toBe('Invalid email or password.');
    });

    it('returns a response body identical to the unknown-email failure for a wrong password (anti-enumeration)', async () => {
      dbQueryOne.mockResolvedValueOnce(userRow);
      passwordMock.verify.mockResolvedValueOnce(false);

      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'e2e.user@example.com', password: 'WrongPassword1' })
        .expect(401);

      dbQueryOne.mockResolvedValueOnce(undefined);
      const unknownEmailRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'ghost@example.com', password: 'whatever1' })
        .expect(401);

      expect(res.body.message).toBe('Invalid email or password.');
      expect(res.body).toEqual(
        expect.objectContaining({
          statusCode: unknownEmailRes.body.statusCode,
          message: unknownEmailRes.body.message,
          error: unknownEmailRes.body.error,
        }),
      );
      expect(unknownEmailRes.body.message).toBe(res.body.message);
    });
  });

  describe('GET /api/auth/me (protected)', () => {
    const payload: JwtPayload = {
      sub: 'user-uuid-1',
      email: 'e2e.user@example.com',
      role: 'user',
    };

    it('rejects missing tokens with 401', async () => {
      await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });

    it('rejects invalid tokens with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not.a.jwt')
        .expect(401);
    });

    it('returns the authenticated payload for a valid token', async () => {
      const token = await signToken(payload);

      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        sub: 'user-uuid-1',
        email: 'e2e.user@example.com',
        role: 'user',
      });
    });
  });

  describe('authorization boundaries', () => {
    it('forbids non-admin users from admin-only endpoints with 403', async () => {
      const token = await signToken({
        sub: 'user-uuid-1',
        email: 'e2e.user@example.com',
        role: 'user',
      });

      await request(app.getHttpServer())
        .get('/api/auth/admin')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('allows admin users into admin-only endpoints', async () => {
      const token = await signToken({
        sub: 'admin-uuid-1',
        email: 'admin@example.com',
        role: 'admin',
      });

      const res = await request(app.getHttpServer())
        .get('/api/auth/admin')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.message).toBe('Admin access granted.');
    });

    it('requires authentication for enrollments and returns mocked data when authorized', async () => {
      await request(app.getHttpServer())
        .get('/api/enrollments/me')
        .expect(401);

      const token = await signToken({
        sub: 'user-uuid-1',
        email: 'e2e.user@example.com',
        role: 'user',
      });
      dbQueryAll.mockResolvedValueOnce([
        {
          id: 'enr-1',
          user_id: 'user-uuid-1',
          course_id: 'course-1',
          status: 'active',
          granted_at: new Date().toISOString(),
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/enrollments/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toMatchObject({ id: 'enr-1' });
    });

    it('requires authentication for order checkout with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/orders')
        .send({ courseIds: ['0b9e6b5e-1111-4222-8333-444455556666'] })
        .expect(401);
      expectDbUnused();
    });
  });

  describe('GET /api/home (public aggregation)', () => {
    it('returns the four sections without auth, mapped to card DTOs', async () => {
      dbQueryAll
        .mockResolvedValueOnce([
          {
            id: 'course-h-1',
            title: 'Course H',
            slug: 'course-h',
            description: 'Outcome H',
            price: 150000,
            thumbnail_url: 'https://cdn.example.com/course-h.jpg',
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'project-h-1',
            title: 'Project H',
            slug: 'project-h',
            summary: 'Summary H',
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'item-h-1',
            title: 'Item H',
            slug: 'item-h',
            description: 'Description H',
            external_url: 'https://example.com/item-h',
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'member-h-1',
            name: 'Member H',
            slug: 'member-h',
            photo: null,
            role: 'Engineer',
            skills: '["typescript"]',
            social_links: '["https://github.com/xolvon"]',
          },
        ]);

      // No Authorization header — the endpoint must be public.
      const res = await request(app.getHttpServer()).get('/api/home').expect(200);

      expect(res.body).toEqual({
        courses: [
          {
            id: 'course-h-1',
            title: 'Course H',
            slug: 'course-h',
            description: 'Outcome H',
            price: 150000,
            thumbnailUrl: 'https://cdn.example.com/course-h.jpg',
          },
        ],
        projects: [
          { id: 'project-h-1', title: 'Project H', slug: 'project-h', summary: 'Summary H' },
        ],
        marketplace: [
          {
            id: 'item-h-1',
            title: 'Item H',
            slug: 'item-h',
            description: 'Description H',
            externalUrl: 'https://example.com/item-h',
          },
        ],
        collective: [
          {
            id: 'member-h-1',
            name: 'Member H',
            slug: 'member-h',
            photo: null,
            role: 'Engineer',
            skills: ['typescript'],
            socialLinks: ['https://github.com/xolvon'],
          },
        ],
      });
    });

    it('runs exactly one published-only query per section (no N+1, no writes)', async () => {
      dbQueryAll
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await request(app.getHttpServer()).get('/api/home').expect(200);

      expect(dbQueryAll).toHaveBeenCalledTimes(4);
      expect(dbQueryOne).not.toHaveBeenCalled();
      expect(dbExecute).not.toHaveBeenCalled();

      // Every section query filters to published content only, so a draft row
      // in the database can never appear in the response.
      for (const [sql, params] of dbQueryAll.mock.calls) {
        expect(sql).toContain("status = 'published'");
        expect(sql).toContain('LIMIT ?');
        expect(params).toHaveLength(1);
      }
    });
  });

  describe('GET /api/search (public cross-entity search)', () => {
    it('returns published course, project, and marketplace results with pagination', async () => {
      dbQueryOne.mockResolvedValueOnce({ total: 3 });
      dbQueryAll.mockResolvedValueOnce([
        {
          entity_type: 'course',
          id: 'course-search-1',
          title: 'Published Course',
          slug: 'published-course',
          description: 'Public course',
          status: 'published',
          created_at: '2026-09-12T00:00:03.000Z',
        },
        {
          entity_type: 'project',
          id: 'project-search-1',
          title: 'Published Project',
          slug: 'published-project',
          description: 'Public project',
          status: 'published',
          created_at: '2026-09-12T00:00:02.000Z',
        },
        {
          entity_type: 'marketplace',
          id: 'item-search-1',
          title: 'Published Item',
          slug: 'published-item',
          description: 'Public item',
          status: 'published',
          created_at: '2026-09-12T00:00:01.000Z',
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/search?q=public&page=1&limit=3')
        .expect(200);

      expect(res.body).toMatchObject({ query: 'public', page: 1, limit: 3, total: 3 });
      expect(res.body.items).toEqual([
        expect.objectContaining({ type: 'course', status: 'published' }),
        expect.objectContaining({ type: 'project', status: 'published' }),
        expect.objectContaining({ type: 'marketplace', status: 'published' }),
      ]);
      expect(dbQueryAll.mock.calls[0][0]).toContain("status = 'published'");
      expect(dbQueryAll.mock.calls[0][0]).toContain('MATCH ?');
    });

    it('excludes draft, private, and revoked content and rejects invalid pagination', async () => {
      dbQueryOne.mockResolvedValueOnce({ total: 0 });
      dbQueryAll.mockResolvedValueOnce([]);

      const empty = await request(app.getHttpServer())
        .get('/api/search?q=draft%20private%20revoked&page=2&limit=2')
        .expect(200);
      expect(empty.body.items).toEqual([]);
      expect(dbQueryAll.mock.calls[0][0]).not.toContain('revoked');

      await request(app.getHttpServer()).get('/api/search?page=0&limit=101').expect(400);
      expect(dbQueryOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('collective — member profiles and privacy (SCHEMA.md §54-57)', () => {
    /**
     * Security fixture: contact fields are intentionally present in the row
     * even though migration 0004 has no such columns — the response MUST
     * strip them (SCHEMA.md §57). Do not remove email/phone from this row.
     */
    const memberRowWithContacts = {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Collective Member',
      slug: 'collective-member',
      photo: 'https://cdn.example.com/member.jpg',
      role: 'Fullstack Engineer',
      skills: 'TypeScript, NestJS',
      bio: 'Builds the platform.',
      social_links:
        '[{"platform":"GitHub","url":"https://github.com/member"}]',
      status: 'published',
      display_order: 1,
      created_at: '2026-09-12T00:00:00.000Z',
      email: 'private.member@example.com',
      phone: '+628999888777',
    };

    it('GET /api/collective returns published members with parsed skills/socialLinks and never leaks email/phone', async () => {
      dbQueryAll.mockResolvedValueOnce([memberRowWithContacts]); // page rows
      dbQueryOne.mockResolvedValueOnce({ total: 1 }); // count

      const res = await request(app.getHttpServer())
        .get('/api/collective')
        .expect(200);

      expect(res.body).toMatchObject({
        page: 1,
        limit: 20,
        total: 1,
      });
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Collective Member',
        slug: 'collective-member',
        role: 'Fullstack Engineer',
        skills: ['TypeScript', 'NestJS'],
        socialLinks: [
          { platform: 'GitHub', url: 'https://github.com/member' },
        ],
        status: 'published',
      });

      // Privacy proof: response body is free of personal contact fields.
      expect(res.body.items[0]).not.toHaveProperty('email');
      expect(res.body.items[0]).not.toHaveProperty('phone');
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain('private.member@example.com');
      expect(serialized).not.toContain('+628999888777');
    });

    it('GET /api/collective/:slug returns the member with relatedProjects and never leaks email/phone', async () => {
      dbQueryOne.mockResolvedValueOnce(memberRowWithContacts); // member by slug
      dbQueryAll.mockResolvedValueOnce([
        {
          id: '22222222-2222-4222-8222-222222222222',
          title: 'Xolvon Platform',
          slug: 'xolvon-platform',
          type: 'SaaS',
          summary: 'The platform itself.',
          status: 'published',
        },
      ]); // related projects via project_members

      const res = await request(app.getHttpServer())
        .get('/api/collective/collective-member')
        .expect(200);

      expect(res.body).toMatchObject({
        slug: 'collective-member',
        name: 'Collective Member',
      });
      expect(res.body.relatedProjects).toEqual([
        {
          id: '22222222-2222-4222-8222-222222222222',
          title: 'Xolvon Platform',
          slug: 'xolvon-platform',
          type: 'SaaS',
          summary: 'The platform itself.',
          status: 'published',
        },
      ]);

      // Privacy proof on the detail surface too.
      expect(res.body).not.toHaveProperty('email');
      expect(res.body).not.toHaveProperty('phone');
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain('private.member@example.com');
      expect(serialized).not.toContain('+628999888777');
    });

    it('GET /api/collective/:slug returns 404 for an unknown slug', async () => {
      dbQueryOne.mockResolvedValueOnce(undefined);

      await request(app.getHttpServer())
        .get('/api/collective/ghost')
        .expect(404);
    });

    it('admin mutations require authentication and admin role', async () => {
      await request(app.getHttpServer())
        .post('/api/collective')
        .send({ name: 'X', slug: 'x', role: 'FE', skills: ['React'] })
        .expect(401);

      const userToken = await signToken({
        sub: 'user-uuid-1',
        email: 'e2e.user@example.com',
        role: 'user',
      });
      await request(app.getHttpServer())
        .post('/api/collective')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'X', slug: 'x', role: 'FE', skills: ['React'] })
        .expect(403);
      expectDbUnused();
    });

    it('POST /api/collective creates a draft member and writes an audit row (admin)', async () => {
      dbQueryOne.mockResolvedValueOnce(undefined); // slug uniqueness
      dbQueryOne.mockResolvedValueOnce({
        ...memberRowWithContacts,
        id: '33333333-3333-4333-8333-333333333333',
        slug: 'new-member',
        status: 'draft',
      }); // re-read after insert

      const adminToken = await signToken({
        sub: 'admin-uuid-1',
        email: 'admin@example.com',
        role: 'admin',
      });

      const res = await request(app.getHttpServer())
        .post('/api/collective')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Member',
          slug: 'new-member',
          role: 'Data Engineer',
          skills: ['SQL', 'Python'],
          socialLinks: [
            { platform: 'LinkedIn', url: 'https://linkedin.com/in/new' },
          ],
        })
        .expect(201);

      expect(res.body).toMatchObject({
        slug: 'new-member',
        status: 'draft',
      });
      expect(res.body).not.toHaveProperty('email');
      expect(res.body).not.toHaveProperty('phone');

      const insertCalls = dbExecute.mock.calls;
      expect(insertCalls).toHaveLength(2);
      expect(insertCalls[0][0]).toContain('INSERT INTO collective_members');
      expect(insertCalls[1][0]).toContain('INSERT INTO admin_audit_logs');
    });
  });

  describe('order verification (status pending → paid only)', () => {
    const adminToken = () =>
      signToken({
        sub: 'admin-uuid-1',
        email: 'admin@example.com',
        role: 'admin',
      });

    const orderId = '0b9e6b5e-1111-4222-8333-444455556666';

    const pendingOrderRow = {
      id: orderId,
      user_id: 'user-uuid-1',
      status: 'pending',
      amount: 150000,
      notes: '',
      verified_by: null,
      verified_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('transitions a pending order to paid with verified_by and verified_at', async () => {
      dbQueryOne.mockResolvedValueOnce(pendingOrderRow);
      dbQueryAll.mockResolvedValueOnce([
        {
          id: 'it-1',
          order_id: orderId,
          course_id: 'course-1',
          price: 150000,
          created_at: new Date().toISOString(),
        },
      ]);

      const res = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/verify`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .expect(200);

      expect(res.body).toMatchObject({ id: orderId, status: 'paid' });
      expect(res.body.verifiedAt).toBeDefined();
      expect(res.body).not.toHaveProperty('verified_by');

      expect(dbExecute).toHaveBeenCalledTimes(2);
      const [updateSql, updateParams] = dbExecute.mock.calls[0];
      expect(updateSql).toContain("UPDATE orders SET status = 'paid'");
      expect(updateParams[0]).toBe('admin-uuid-1');
      expect(updateParams[3]).toBe(orderId);
      expect(dbExecute.mock.calls[1][0]).toContain('INSERT INTO admin_audit_logs');
    });

    it('cancels a pending order and writes an audit row', async () => {
      dbQueryOne.mockResolvedValueOnce(pendingOrderRow);
      dbQueryAll.mockResolvedValueOnce([
        {
          id: 'it-1',
          order_id: orderId,
          course_id: 'course-1',
          price: 150000,
          created_at: new Date().toISOString(),
        },
      ]);

      const res = await request(app.getHttpServer())
        .post(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .expect(200);

      expect(res.body).toMatchObject({ id: orderId, status: 'cancelled' });
      expect(dbExecute).toHaveBeenCalledTimes(2);
      expect(dbExecute.mock.calls[0][0]).toContain(
        "UPDATE orders SET status = 'cancelled'",
      );
      expect(dbExecute.mock.calls[1][0]).toContain('INSERT INTO admin_audit_logs');
    });

    it('rejects cancellation of a paid order without writing', async () => {
      dbQueryOne.mockResolvedValueOnce({ ...pendingOrderRow, status: 'paid' });

      const res = await request(app.getHttpServer())
        .post(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .expect(400);

      expect(res.body.message).toBe(
        'Hanya order berstatus pending yang dapat dibatalkan.',
      );
      expect(dbExecute).not.toHaveBeenCalled();
    });

    it('rejects verification of an already paid order with 400', async () => {
      dbQueryOne.mockResolvedValueOnce({
        ...pendingOrderRow,
        status: 'paid',
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/verify`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .expect(400);

      expect(res.body.message).toBe(
        'Order sudah diverifikasi dan berstatus paid.',
      );
      expect(dbExecute).not.toHaveBeenCalled();
    });

    it('rejects payment proof submission for a paid order with 400 (state validation)', async () => {
      dbQueryOne.mockResolvedValueOnce({
        ...pendingOrderRow,
        status: 'paid',
      });

      const res = await request(app.getHttpServer())
        .post(`/api/orders/${orderId}/payment-proof`)
        .set('Authorization', `Bearer ${await signToken({
          sub: 'user-uuid-1',
          email: 'e2e.user@example.com',
          role: 'user',
        })}`)
        .send({ objectKey: 'payment-proofs/some-key.jpg' })
        .expect(400);

      expect(res.body.message).toBe(
        'Bukti pembayaran hanya dapat diunggah untuk order yang berstatus pending.',
      );
      expect(dbExecute).not.toHaveBeenCalled();
    });
  });

  describe('marketplace showcase (public catalog + admin CRUD)', () => {
    const adminToken = () =>
      signToken({
        sub: 'admin-uuid-1',
        email: 'admin@example.com',
        role: 'admin',
      });

    const userToken = () =>
      signToken({
        sub: 'user-uuid-1',
        email: 'e2e.user@example.com',
        role: 'user',
      });

    const itemId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
    const draftRow = {
      id: itemId,
      title: 'Draft SaaS',
      slug: 'draft-saas',
      description: 'Not ready',
      capabilities: null,
      external_url: 'https://draft.example.com',
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('GET /api/marketplace returns published-only items with parsed capabilities (SCHEMA §59)', async () => {
      dbQueryAll.mockResolvedValueOnce([
        {
          ...draftRow,
          id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          slug: 'invoice-saas',
          title: 'Invoice SaaS',
          description: 'Billing for freelancers',
          capabilities: 'Invoicing,Taxes,Reports',
          status: 'published',
        },
        {
          ...draftRow,
          id: '9b2f8f9e-2c30-4c1a-8b3c-9c1f2f3f4f5f',
          slug: 'crm-saas',
          title: 'CRM SaaS',
          capabilities: null,
          status: 'published',
        },
      ]);
      dbQueryOne.mockResolvedValueOnce({ total: 2 });

      const res = await request(app.getHttpServer())
        .get('/api/marketplace')
        .expect(200);

      expect(res.body).toMatchObject({ page: 1, limit: 20, total: 2 });
      expect(res.body.items).toHaveLength(2);
      expect(res.body.items[0]).toEqual({
        id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        title: 'Invoice SaaS',
        slug: 'invoice-saas',
        description: 'Billing for freelancers',
        capabilities: ['Invoicing', 'Taxes', 'Reports'],
        externalUrl: 'https://draft.example.com',
        status: 'published',
      });
      expect(res.body.items[1].capabilities).toEqual([]);

      const [listSql] = dbQueryAll.mock.calls[0];
      expect(listSql).toContain("status = 'published'");
    });

    it('GET /api/marketplace/:slug returns the detail with media sorted by sort_order', async () => {
      dbQueryOne.mockResolvedValueOnce({
        ...draftRow,
        slug: 'invoice-saas',
        status: 'published',
      });
      dbQueryAll.mockResolvedValueOnce([
        {
          id: 'media-1',
          marketplace_id: itemId,
          object_key: 'marketplace/shot.png',
          media_type: 'image',
          sort_order: 1,
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/marketplace/invoice-saas')
        .expect(200);

      expect(res.body).toMatchObject({
        slug: 'invoice-saas',
        status: 'published',
        externalUrl: 'https://draft.example.com',
      });
      expect(res.body.media).toEqual([
        {
          id: 'media-1',
          objectKey: 'marketplace/shot.png',
          mediaType: 'image',
          sortOrder: 1,
        },
      ]);
    });

    it('GET /api/marketplace/:slug returns 404 for a draft item', async () => {
      dbQueryOne.mockResolvedValueOnce(draftRow);

      const res = await request(app.getHttpServer())
        .get('/api/marketplace/draft-saas')
        .expect(404);

      expect(res.body.message).toBe('Item marketplace tidak ditemukan.');
    });

    it('rejects create from a non-admin with 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/marketplace')
        .set('Authorization', `Bearer ${await userToken()}`)
        .send({
          title: 'Some SaaS',
          slug: 'some-saas',
          externalUrl: 'https://some.example.com',
        })
        .expect(403);

      expect(res.body.message).toBe(
        'You do not have permission to access this resource.',
      );
      expectDbUnused();
    });

    it('rejects create without authentication with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/marketplace')
        .send({
          title: 'Some SaaS',
          slug: 'some-saas',
          externalUrl: 'https://some.example.com',
        })
        .expect(401);
      expectDbUnused();
    });

    it('rejects an http external_url with 400 (redirection security)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/marketplace')
        .set('Authorization', `Bearer ${await adminToken()}`)
        .send({
          title: 'Some SaaS',
          slug: 'some-saas',
          externalUrl: 'http://some.example.com',
        })
        .expect(400);

      expect(res.body.message).toBe(
        'external_url harus menggunakan protokol https.',
      );
      expect(dbExecute).not.toHaveBeenCalled();
    });

    it('creates a draft listing as admin and audits the create action', async () => {
      dbQueryOne.mockResolvedValueOnce(undefined); // slug available

      const res = await request(app.getHttpServer())
        .post('/api/marketplace')
        .set('Authorization', `Bearer ${await adminToken()}`)
        .send({
          title: 'Invoice SaaS',
          slug: 'invoice-saas',
          description: 'Billing for freelancers',
          externalUrl: 'https://invoice.example.com',
          capabilities: ['Invoicing', 'Taxes'],
        })
        .expect(201);

      expect(res.body).toMatchObject({
        title: 'Invoice SaaS',
        slug: 'invoice-saas',
        externalUrl: 'https://invoice.example.com',
        capabilities: ['Invoicing', 'Taxes'],
        status: 'draft',
      });

      const [itemSql, itemParams] = dbExecute.mock.calls[0];
      expect(itemSql).toContain('INSERT INTO marketplace_items');
      expect(itemParams).toContain('Invoicing,Taxes');

      const [auditSql] = dbExecute.mock.calls[1];
      expect(auditSql).toContain('INSERT INTO admin_audit_logs');
    });

    it('publishes a draft listing and audits the publish action', async () => {
      dbQueryOne.mockResolvedValueOnce(draftRow);

      const res = await request(app.getHttpServer())
        .post(`/api/marketplace/${itemId}/publish`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .expect(200);

      expect(res.body).toMatchObject({ id: itemId, status: 'published' });

      const [updateSql] = dbExecute.mock.calls[0];
      expect(updateSql).toContain("UPDATE marketplace_items SET status = 'published'");
      const [auditSql] = dbExecute.mock.calls[1];
      expect(auditSql).toContain('INSERT INTO admin_audit_logs');
    });
  });

  describe('courses — public catalog, detail, and admin mutations (SCHEMA.md §14-17)', () => {
    const adminToken = () =>
      signToken({
        sub: 'admin-uuid-1',
        email: 'admin@example.com',
        role: 'admin',
      });

    const userToken = () =>
      signToken({
        sub: 'user-uuid-1',
        email: 'e2e.user@example.com',
        role: 'user',
      });

    const courseId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
    const draftCourseRow = {
      id: courseId,
      title: 'Draft Course',
      slug: 'draft-course',
      description: 'Not ready yet',
      price: 100000,
      thumbnail_url: null,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('GET /api/courses returns published-only cards with the DL-011 pagination contract', async () => {
      dbQueryAll.mockResolvedValueOnce([
        {
          ...draftCourseRow,
          id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          slug: 'video-saas',
          title: 'Video SaaS Mastery',
          description: 'Build video products end to end',
          price: 250000,
          status: 'published',
        },
      ]);
      dbQueryOne.mockResolvedValueOnce({ total: 1 });

      const res = await request(app.getHttpServer())
        .get('/api/courses')
        .expect(200);

      expect(res.body).toMatchObject({ page: 1, limit: 20, total: 1, query: null });
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toEqual({
        id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        title: 'Video SaaS Mastery',
        slug: 'video-saas',
        description: 'Build video products end to end',
        price: 250000,
        thumbnailUrl: null,
        status: 'published',
      });

      const [listSql] = dbQueryAll.mock.calls[0];
      expect(listSql).toContain("status = 'published'");
    });

    it('GET /api/courses/:slug returns the detail with lessons ordered by order_index and no private fields', async () => {
      dbQueryOne.mockResolvedValueOnce({
        ...draftCourseRow,
        slug: 'video-saas',
        title: 'Video SaaS Mastery',
        description: 'Build video products end to end',
        price: 250000,
        status: 'published',
      });
      dbQueryAll.mockResolvedValueOnce([
        {
          id: 'lesson-1',
          course_id: courseId,
          title: 'Intro',
          order_index: 1,
          status: 'published',
        },
        {
          id: 'lesson-2',
          course_id: courseId,
          title: 'Setup',
          order_index: 2,
          status: 'published',
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/courses/video-saas')
        .expect(200);

      expect(res.body).toMatchObject({
        slug: 'video-saas',
        price: 250000,
        status: 'published',
      });
      expect(res.body.lessons).toEqual([
        { id: 'lesson-1', title: 'Intro', orderIndex: 1, status: 'published' },
        { id: 'lesson-2', title: 'Setup', orderIndex: 2, status: 'published' },
      ]);

      const bodyText = JSON.stringify(res.body);
      expect(bodyText).not.toContain('video_object_key');
      expect(bodyText).not.toContain('videoObjectKey');

      const [lessonsSql] = dbQueryAll.mock.calls[0];
      expect(lessonsSql).toContain('ORDER BY order_index ASC');
      expect(lessonsSql).not.toContain('video_object_key');
    });

    it('GET /api/courses/:slug returns 404 for a draft course', async () => {
      dbQueryOne.mockResolvedValueOnce(draftCourseRow);

      const res = await request(app.getHttpServer())
        .get('/api/courses/draft-course')
        .expect(404);

      expect(res.body.message).toBe('Course tidak ditemukan.');
    });

    it('rejects create from a non-admin with 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/courses')
        .set('Authorization', `Bearer ${await userToken()}`)
        .send({
          title: 'Some Course',
          slug: 'some-course',
          description: 'Desc',
          price: 50000,
        })
        .expect(403);

      expect(res.body.message).toBe(
        'You do not have permission to access this resource.',
      );
      expectDbUnused();
    });

    it('rejects create without authentication with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/courses')
        .send({
          title: 'Some Course',
          slug: 'some-course',
          description: 'Desc',
          price: 50000,
        })
        .expect(401);
      expectDbUnused();
    });

    it('rejects mass-assignment fields with 400 (forbidNonWhitelisted)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/courses')
        .set('Authorization', `Bearer ${await adminToken()}`)
        .send({
          title: 'Sneaky Course',
          slug: 'sneaky-course',
          description: 'Desc',
          price: 50000,
          status: 'published',
          isAdmin: true,
        })
        .expect(400);

      expect(dbExecute).not.toHaveBeenCalled();
      expectDbUnused();
    });

    it('creates a draft course as admin and audits the create action', async () => {
      dbQueryOne.mockResolvedValueOnce(undefined); // slug available

      const res = await request(app.getHttpServer())
        .post('/api/courses')
        .set('Authorization', `Bearer ${await adminToken()}`)
        .send({
          title: 'Video SaaS Mastery',
          slug: 'video-saas',
          description: 'Build video products end to end',
          price: 250000,
          thumbnailUrl: 'https://cdn.example.com/cover.png',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        title: 'Video SaaS Mastery',
        slug: 'video-saas',
        price: 250000,
        thumbnailUrl: 'https://cdn.example.com/cover.png',
        status: 'draft',
      });

      const [courseSql] = dbExecute.mock.calls[0];
      expect(courseSql).toContain('INSERT INTO courses');
      expect(courseSql).toContain("'draft'");

      const [auditSql] = dbExecute.mock.calls[1];
      expect(auditSql).toContain('INSERT INTO admin_audit_logs');
    });

    it('publishes a draft course and audits the publish action', async () => {
      dbQueryOne.mockResolvedValueOnce(draftCourseRow);

      const res = await request(app.getHttpServer())
        .post(`/api/courses/${courseId}/publish`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .expect(200);

      expect(res.body).toMatchObject({ id: courseId, status: 'published' });

      const [updateSql] = dbExecute.mock.calls[0];
      expect(updateSql).toContain("UPDATE courses SET status = 'published'");
      const [auditSql] = dbExecute.mock.calls[1];
      expect(auditSql).toContain('INSERT INTO admin_audit_logs');
    });
  });

  describe('projects — portfolio, media, and members (SCHEMA.md §43-53)', () => {
    const adminToken = () =>
      signToken({
        sub: 'admin-uuid-1',
        email: 'admin@example.com',
        role: 'admin',
      });

    const userToken = () =>
      signToken({
        sub: 'user-uuid-1',
        email: 'e2e.user@example.com',
        role: 'user',
      });

    const projectId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
    const memberId = '11111111-1111-4111-8111-111111111111';

    const draftProjectRow = {
      id: projectId,
      title: 'Draft Project',
      slug: 'draft-project',
      type: null,
      summary: null,
      problem: null,
      solution: null,
      tech_stack: null,
      result: null,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('GET /api/projects returns published-only cards with the DL-011 pagination contract', async () => {
      dbQueryAll.mockResolvedValueOnce([
        {
          id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          title: 'Xolvon Dashboard',
          slug: 'xolvon-dashboard',
          type: 'web-app',
          summary: 'Internal analytics dashboard.',
          status: 'published',
        },
      ]);
      dbQueryOne.mockResolvedValueOnce({ total: 1 });

      const res = await request(app.getHttpServer())
        .get('/api/projects')
        .expect(200);

      expect(res.body).toMatchObject({ page: 1, limit: 20, total: 1 });
      expect(res.body.items).toEqual([
        {
          id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          title: 'Xolvon Dashboard',
          slug: 'xolvon-dashboard',
          type: 'web-app',
          summary: 'Internal analytics dashboard.',
          status: 'published',
        },
      ]);

      const [listSql] = dbQueryAll.mock.calls[0];
      expect(listSql).toContain("status = 'published'");
    });

    it('GET /api/projects/:slug returns the detail with members[].role and media without object keys', async () => {
      dbQueryOne.mockResolvedValueOnce({
        ...draftProjectRow,
        slug: 'xolvon-dashboard',
        title: 'Xolvon Dashboard',
        type: 'web-app',
        summary: 'Internal analytics dashboard.',
        problem: 'Data scattered across tools.',
        solution: 'Single source of truth dashboard.',
        tech_stack: 'Next.js, TypeScript',
        result: 'Reduced reporting time.',
        status: 'published',
      });
      dbQueryAll
        .mockResolvedValueOnce([
          {
            id: '8c9e6679-7425-40de-944b-e07fc1f90ae7',
            project_id: projectId,
            object_key: 'projects/shot-1.png',
            media_type: 'image',
            sort_order: 1,
          },
        ])
        .mockResolvedValueOnce([
          { member_id: memberId, name: 'Nabil', role: 'BE' },
        ]);

      const res = await request(app.getHttpServer())
        .get('/api/projects/xolvon-dashboard')
        .expect(200);

      expect(res.body).toMatchObject({
        slug: 'xolvon-dashboard',
        problem: 'Data scattered across tools.',
        solution: 'Single source of truth dashboard.',
        techStack: ['Next.js', 'TypeScript'],
        result: 'Reduced reporting time.',
        status: 'published',
      });
      expect(res.body.media).toEqual([
        { id: '8c9e6679-7425-40de-944b-e07fc1f90ae7', mediaType: 'image', sortOrder: 1 },
      ]);
      expect(res.body.members).toEqual([
        { memberId, name: 'Nabil', role: 'BE' },
      ]);

      // Private storage keys never leave the public API.
      const bodyText = JSON.stringify(res.body);
      expect(bodyText).not.toContain('projects/shot-1.png');
      expect(bodyText).not.toContain('objectKey');

      const [mediaSql] = dbQueryAll.mock.calls[0];
      expect(mediaSql).toContain('ORDER BY sort_order ASC');
      const [membersSql] = dbQueryAll.mock.calls[1];
      expect(membersSql).toContain('JOIN collective_members');
    });

    it('GET /api/projects/:slug returns 404 for a draft project', async () => {
      dbQueryOne.mockResolvedValueOnce(draftProjectRow);

      const res = await request(app.getHttpServer())
        .get('/api/projects/draft-project')
        .expect(404);

      expect(res.body.message).toBe('Project not found.');
    });

    it('rejects create from a non-admin with 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${await userToken()}`)
        .send({
          title: 'Some Project',
          slug: 'some-project',
        })
        .expect(403);

      expect(res.body.message).toBe(
        'You do not have permission to access this resource.',
      );
      expectDbUnused();
    });

    it('rejects create without authentication with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/projects')
        .send({
          title: 'Some Project',
          slug: 'some-project',
        })
        .expect(401);
      expectDbUnused();
    });

    it('creates a draft project as admin and audits the create action', async () => {
      dbQueryOne.mockResolvedValueOnce(undefined); // slug available

      const res = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${await adminToken()}`)
        .send({
          title: 'Xolvon Dashboard',
          slug: 'xolvon-dashboard',
          type: 'web-app',
          summary: 'Internal analytics dashboard.',
          problem: 'Data scattered across tools.',
          solution: 'Single source of truth dashboard.',
          techStack: 'Next.js, TypeScript',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        title: 'Xolvon Dashboard',
        slug: 'xolvon-dashboard',
        techStack: ['Next.js', 'TypeScript'],
        status: 'draft',
      });

      const [projectSql] = dbExecute.mock.calls[0];
      expect(projectSql).toContain('INSERT INTO projects');
      expect(projectSql).toContain("'draft'");

      const [auditSql] = dbExecute.mock.calls[1];
      expect(auditSql).toContain('INSERT INTO admin_audit_logs');
    });

    it('publishes a draft project and audits the publish action', async () => {
      dbQueryOne.mockResolvedValueOnce({
        ...draftProjectRow,
        type: 'web-app',
        summary: 'Internal analytics dashboard.',
        problem: 'Data scattered across tools.',
        solution: 'Single source of truth dashboard.',
      });

      const res = await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/publish`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .expect(200);

      expect(res.body).toMatchObject({ id: projectId, status: 'published' });

      const [updateSql] = dbExecute.mock.calls[0];
      expect(updateSql).toContain("UPDATE projects SET status = 'published'");
      const [auditSql] = dbExecute.mock.calls[1];
      expect(auditSql).toContain('INSERT INTO admin_audit_logs');
    });

    it('attaches media as admin and audits the create action', async () => {
      dbQueryOne.mockResolvedValueOnce({ id: projectId }); // project exists

      const res = await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/media`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .send({
          objectKey: 'projects/shot-1.png',
          mediaType: 'image',
          sortOrder: 1,
        })
        .expect(201);

      expect(res.body).toMatchObject({
        projectId,
        objectKey: 'projects/shot-1.png',
        mediaType: 'image',
        sortOrder: 1,
      });

      const [mediaSql] = dbExecute.mock.calls[0];
      expect(mediaSql).toContain('INSERT INTO project_media');
      const [auditSql] = dbExecute.mock.calls[1];
      expect(auditSql).toContain('INSERT INTO admin_audit_logs');
    });

    it('assigns a collective member with an explicit role as admin and audits the action', async () => {
      dbQueryOne
        .mockResolvedValueOnce({ id: projectId }) // project exists
        .mockResolvedValueOnce({ id: memberId }); // member exists

      const res = await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .send({ memberId, role: 'BE' })
        .expect(201);

      expect(res.body).toEqual({ projectId, memberId, role: 'BE' });

      const [memberSql] = dbExecute.mock.calls[0];
      expect(memberSql).toContain('INSERT INTO project_members');
      expect(memberSql).toContain('ON CONFLICT(project_id, member_id)');
      const [auditSql] = dbExecute.mock.calls[1];
      expect(auditSql).toContain('INSERT INTO admin_audit_logs');
    });

    it('rejects media attach from a non-admin with 403', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/media`)
        .set('Authorization', `Bearer ${await userToken()}`)
        .send({ objectKey: 'projects/shot.png', mediaType: 'image' })
        .expect(403);

      expect(res.body.message).toBe(
        'You do not have permission to access this resource.',
      );
      expectDbUnused();
    });
  });

  describe('lessons + course resources (SCHEMA.md §18-26, §167-168)', () => {
    const adminToken = () =>
      signToken({
        sub: 'admin-uuid-1',
        email: 'admin@example.com',
        role: 'admin',
      });

    const userToken = () =>
      signToken({
        sub: 'user-uuid-1',
        email: 'e2e.user@example.com',
        role: 'user',
      });

    const courseId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
    const lessonId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
    const resourceId = '9b2f8f9e-2c30-4c1a-8b3c-9c1f2f3f4f5f';

    it('GET /api/courses/:slug/lessons returns published-only summaries ordered by order_index without private fields', async () => {
      dbQueryOne.mockResolvedValueOnce({ id: courseId, status: 'published' });
      dbQueryAll.mockResolvedValueOnce([
        {
          id: lessonId,
          title: 'Zebra (order 2)',
          order_index: 2,
          status: 'published',
        },
        {
          id: resourceId,
          title: 'Alpha (order 1)',
          order_index: 1,
          status: 'published',
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/courses/video-saas/lessons')
        .expect(200);

      expect(res.body).toEqual([
        { id: lessonId, title: 'Zebra (order 2)', orderIndex: 2, status: 'published' },
        { id: resourceId, title: 'Alpha (order 1)', orderIndex: 1, status: 'published' },
      ]);

      const [courseSql] = dbQueryOne.mock.calls[0];
      expect(courseSql).toContain('FROM courses WHERE slug = ?');

      const [lessonsSql, lessonsParams] = dbQueryAll.mock.calls[0];
      expect(lessonsSql).toContain("status = 'published'");
      expect(lessonsSql).toContain('ORDER BY order_index ASC');
      expect(lessonsSql).not.toContain('content');
      expect(lessonsSql).not.toContain('video_object_key');
      expect(lessonsParams).toEqual([courseId]);

      const bodyText = JSON.stringify(res.body);
      expect(bodyText).not.toContain('videoObjectKey');
      expect(bodyText).not.toContain('content');
    });

    it('GET /api/courses/:slug/lessons returns 404 for a draft course', async () => {
      dbQueryOne.mockResolvedValueOnce({ id: courseId, status: 'draft' });

      const res = await request(app.getHttpServer())
        .get('/api/courses/draft-course/lessons')
        .expect(404);

      expect(res.body.message).toBe('Course tidak ditemukan.');
      expect(dbQueryAll).not.toHaveBeenCalled();
    });

    it('POST /api/courses/:courseId/lessons requires auth (401) and admin role (403)', async () => {
      await request(app.getHttpServer())
        .post(`/api/courses/${courseId}/lessons`)
        .send({ title: 'Intro', orderIndex: 1 })
        .expect(401);
      expectDbUnused();

      await request(app.getHttpServer())
        .post(`/api/courses/${courseId}/lessons`)
        .set('Authorization', `Bearer ${await userToken()}`)
        .send({ title: 'Intro', orderIndex: 1 })
        .expect(403);
      expectDbUnused();
    });

    it('POST /api/courses/:courseId/lessons creates a draft lesson and audits create (admin)', async () => {
      dbQueryOne.mockResolvedValueOnce({ id: courseId, status: 'draft' });

      const res = await request(app.getHttpServer())
        .post(`/api/courses/${courseId}/lessons`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .send({
          title: 'Intro',
          content: 'Hello world',
          orderIndex: 1,
        })
        .expect(201);

      expect(res.body).toMatchObject({
        courseId,
        title: 'Intro',
        content: 'Hello world',
        orderIndex: 1,
        status: 'draft',
      });
      expect(res.body.id).toBeDefined();

      const [lessonSql] = dbExecute.mock.calls[0];
      expect(lessonSql).toContain('INSERT INTO lessons');
      expect(lessonSql).toContain("'draft'");
      const [auditSql] = dbExecute.mock.calls[1];
      expect(auditSql).toContain('INSERT INTO admin_audit_logs');
    });

    it('POST /api/courses/:courseId/lessons returns 404 when the course is missing', async () => {
      dbQueryOne.mockResolvedValueOnce(undefined);

      const res = await request(app.getHttpServer())
        .post(`/api/courses/${courseId}/lessons`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .send({ title: 'Intro', orderIndex: 1 })
        .expect(404);

      expect(res.body.message).toBe('Course tidak ditemukan.');
      expect(dbExecute).not.toHaveBeenCalled();
    });

    it('PATCH /api/lessons/:id applies provided fields and audits update', async () => {
      dbQueryOne.mockResolvedValueOnce({
        id: lessonId,
        course_id: courseId,
        title: 'Intro',
        content: 'Old body',
        video_object_key: null,
        order_index: 1,
        status: 'draft',
        created_at: new Date().toISOString(),
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/lessons/${lessonId}`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .send({ title: 'Renamed', orderIndex: 5 })
        .expect(200);

      expect(res.body).toMatchObject({ title: 'Renamed', orderIndex: 5 });

      const [updateSql] = dbExecute.mock.calls[0];
      expect(updateSql).toContain('UPDATE lessons SET');
      expect(updateSql).toContain('title = ?');
      expect(updateSql).toContain('order_index = ?');
      const [auditSql] = dbExecute.mock.calls[1];
      expect(auditSql).toContain('INSERT INTO admin_audit_logs');
    });

    it('PATCH /api/lessons/:id/reorder writes order_index and audits update', async () => {
      dbQueryOne.mockResolvedValueOnce({
        id: lessonId,
        course_id: courseId,
        title: 'Intro',
        content: null,
        video_object_key: null,
        order_index: 1,
        status: 'published',
        created_at: new Date().toISOString(),
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/lessons/${lessonId}/reorder`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .send({ orderIndex: 3 })
        .expect(200);

      expect(res.body).toMatchObject({ orderIndex: 3 });

      const [updateSql, updateParams] = dbExecute.mock.calls[0];
      expect(updateSql).toContain('UPDATE lessons SET order_index = ? WHERE id = ?');
      expect(updateParams).toEqual([3, lessonId]);
      const [auditSql] = dbExecute.mock.calls[1];
      expect(auditSql).toContain('INSERT INTO admin_audit_logs');
    });

    it('POST /api/lessons/:id/publish and unpublish transition status with audit', async () => {
      dbQueryOne.mockResolvedValueOnce({
        id: lessonId,
        course_id: courseId,
        title: 'Intro',
        content: null,
        video_object_key: null,
        order_index: 1,
        status: 'draft',
        created_at: new Date().toISOString(),
      });

      const res = await request(app.getHttpServer())
        .post(`/api/lessons/${lessonId}/publish`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .expect(200);

      expect(res.body).toMatchObject({ status: 'published' });
      const [publishSql] = dbExecute.mock.calls[0];
      expect(publishSql).toContain("UPDATE lessons SET status = 'published'");
      const [publishAuditSql] = dbExecute.mock.calls[1];
      expect(publishAuditSql).toContain('INSERT INTO admin_audit_logs');

      dbQueryOne.mockReset();
      dbQueryOne.mockResolvedValueOnce({
        id: lessonId,
        course_id: courseId,
        title: 'Intro',
        content: null,
        video_object_key: null,
        order_index: 1,
        status: 'published',
        created_at: new Date().toISOString(),
      });
      dbExecute.mockReset();

      await request(app.getHttpServer())
        .post(`/api/lessons/${lessonId}/unpublish`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .expect(200);

      const [unpublishSql] = dbExecute.mock.calls[0];
      expect(unpublishSql).toContain("UPDATE lessons SET status = 'draft'");
      const [unpublishAuditSql] = dbExecute.mock.calls[1];
      expect(unpublishAuditSql).toContain('INSERT INTO admin_audit_logs');
    });

    it('DELETE /api/lessons/:id removes resources first, then the lesson, and audits delete', async () => {
      dbQueryOne.mockResolvedValueOnce({
        id: lessonId,
        course_id: courseId,
        title: 'Intro',
        content: null,
        video_object_key: null,
        order_index: 1,
        status: 'draft',
        created_at: new Date().toISOString(),
      });

      const res = await request(app.getHttpServer())
        .delete(`/api/lessons/${lessonId}`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .expect(200);

      expect(res.body).toMatchObject({ id: lessonId });

      expect(dbExecute).toHaveBeenCalledTimes(3);
      const [resourcesSql] = dbExecute.mock.calls[0];
      expect(resourcesSql).toContain('DELETE FROM course_resources WHERE lesson_id = ?');
      const [lessonSql] = dbExecute.mock.calls[1];
      expect(lessonSql).toContain('DELETE FROM lessons WHERE id = ?');
      const [auditSql] = dbExecute.mock.calls[2];
      expect(auditSql).toContain('INSERT INTO admin_audit_logs');
    });

    it('POST /api/lessons/:lessonId/resources rejects type=quiz with 400 (SCHEMA.md §25 allowlist)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/lessons/${lessonId}/resources`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .send({ type: 'quiz', objectKey: 'lessons/x/quiz.pdf', title: 'Quiz' })
        .expect(400);

      expect(JSON.stringify(res.body.message)).toContain('pdf, resource, assignment');
      expectDbUnused();
    });

    it('POST /api/lessons/:lessonId/resources creates a resource and audits create; DELETE audits delete; unknown id → 404', async () => {
      dbQueryOne.mockResolvedValueOnce({ id: lessonId, course_id: courseId });

      const res = await request(app.getHttpServer())
        .post(`/api/lessons/${lessonId}/resources`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .send({
          type: 'pdf',
          objectKey: 'lessons/lesson-1/slides.pdf',
          title: 'Slides',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        lessonId,
        courseId,
        type: 'pdf',
        objectKey: 'lessons/lesson-1/slides.pdf',
        title: 'Slides',
      });

      const [resourceSql] = dbExecute.mock.calls[0];
      expect(resourceSql).toContain('INSERT INTO course_resources');
      const [auditSql] = dbExecute.mock.calls[1];
      expect(auditSql).toContain('INSERT INTO admin_audit_logs');

      dbQueryOne.mockReset();
      dbExecute.mockReset();
      dbQueryOne.mockResolvedValueOnce({
        id: resourceId,
        lesson_id: lessonId,
        course_id: courseId,
        type: 'pdf',
        object_key: 'lessons/lesson-1/slides.pdf',
        title: 'Slides',
        metadata: null,
        created_at: new Date().toISOString(),
      });

      await request(app.getHttpServer())
        .delete(`/api/resources/${resourceId}`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .expect(200);

      const [deleteSql] = dbExecute.mock.calls[0];
      expect(deleteSql).toContain('DELETE FROM course_resources WHERE id = ?');
      const [deleteAuditSql] = dbExecute.mock.calls[1];
      expect(deleteAuditSql).toContain('INSERT INTO admin_audit_logs');

      dbQueryOne.mockReset();
      dbExecute.mockReset();
      dbQueryOne.mockResolvedValueOnce(undefined);

      await request(app.getHttpServer())
        .delete(`/api/resources/${resourceId}`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .expect(404);
      expect(dbExecute).not.toHaveBeenCalled();
    });
  });

  describe('admin — operational reads, admin-only (SCHEMA.md §81-83, PRD §43-45)', () => {
    const userId = '0b9e6b5e-1111-4222-8333-444455556666';

    const adminJwt = () =>
      signToken({ sub: 'admin-uuid-1', email: 'admin@example.com', role: 'admin' });
    const userJwt = () =>
      signToken({ sub: 'user-uuid-1', email: 'e2e.user@example.com', role: 'user' });

    const userRow = {
      id: userId,
      name: 'E2E User',
      email: 'e2e.user@example.com',
      phone: '+62812345678',
      role: 'user',
      status: 'active',
      created_at: '2026-09-01T00:00:00.000Z',
      enrollment_count: 2,
    };

    const orderRow = {
      id: 'order-1',
      status: 'paid',
      amount: 250000,
      created_at: '2026-09-02T00:00:00.000Z',
      updated_at: '2026-09-03T00:00:00.000Z',
      user_id: userId,
      user_name: 'E2E User',
      user_email: 'e2e.user@example.com',
      user_phone: '+62812345678',
      course_titles: 'Video SaaS Mastery\u001fCRM Blueprint',
      has_active_enrollment: 1,
      granted_by_names: 'Admin One',
      granted_at: '2026-09-03T00:00:00.000Z',
    };

    describe('security matrix — every /api/admin/* route', () => {
      it('returns 401 for anonymous requests on all admin routes and never touches the DB', async () => {
        await request(app.getHttpServer()).get('/api/admin/users').expect(401);
        await request(app.getHttpServer()).get(`/api/admin/users/${userId}`).expect(401);
        await request(app.getHttpServer()).get('/api/admin/orders').expect(401);
        await request(app.getHttpServer()).get('/api/admin/overview').expect(401);
        expectDbUnused();
      });

      it('returns 403 for a non-admin user on all admin routes and never touches the DB', async () => {
        const token = await userJwt();

        await request(app.getHttpServer())
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${token}`)
          .expect(403);
        await request(app.getHttpServer())
          .get(`/api/admin/users/${userId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(403);
        await request(app.getHttpServer())
          .get('/api/admin/orders')
          .set('Authorization', `Bearer ${token}`)
          .expect(403);
        await request(app.getHttpServer())
          .get('/api/admin/overview')
          .set('Authorization', `Bearer ${token}`)
          .expect(403);
        expectDbUnused();
      });
    });

    it('GET /api/admin/users returns the paginated envelope with enrollmentCount and never the password hash', async () => {
      dbQueryAll.mockResolvedValueOnce([userRow]);
      dbQueryOne.mockResolvedValueOnce({ total: 1 });

      const res = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${await adminJwt()}`)
        .expect(200);

      expect(res.body).toMatchObject({ page: 1, limit: 20, total: 1 });
      expect(res.body.items[0]).toEqual({
        id: userId,
        name: 'E2E User',
        email: 'e2e.user@example.com',
        phone: '+62812345678',
        role: 'user',
        status: 'active',
        createdAt: '2026-09-01T00:00:00.000Z',
        enrollmentCount: 2,
      });
      expect(JSON.stringify(res.body)).not.toContain('password_hash');

      const [rowsSql] = dbQueryAll.mock.calls[0];
      expect(rowsSql).toContain('LEFT JOIN enrollments e ON e.user_id = u.id');
      expect(rowsSql).toContain('GROUP BY u.id');
    });

    it('GET /api/admin/users binds ?q= as a contains-LIKE parameter on email and name', async () => {
      dbQueryAll.mockResolvedValueOnce([]);
      dbQueryOne.mockResolvedValueOnce({ total: 0 });

      await request(app.getHttpServer())
        .get('/api/admin/users?q=video')
        .set('Authorization', `Bearer ${await adminJwt()}`)
        .expect(200);

      const [rowsSql, rowsParams] = dbQueryAll.mock.calls[0];
      expect(rowsSql).toContain("u.email LIKE ? ESCAPE '\\'");
      expect(rowsSql).toContain("u.name LIKE ? ESCAPE '\\'");
      expect(rowsParams[0]).toBe('%video%');
      expect(rowsParams[1]).toBe('%video%');
    });

    it('GET /api/admin/users/:id returns user detail with enrollments and orders; unknown id → 404', async () => {
      dbQueryOne.mockResolvedValueOnce(userRow);
      dbQueryAll
        .mockResolvedValueOnce([
          {
            id: 'enr-1',
            course_id: 'course-1',
            status: 'active',
            granted_at: '2026-09-03T00:00:00.000Z',
            course_title: 'Video SaaS Mastery',
            course_slug: 'video-saas',
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'order-1',
            status: 'paid',
            amount: 250000,
            created_at: '2026-09-02T00:00:00.000Z',
          },
        ]);

      const res = await request(app.getHttpServer())
        .get(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${await adminJwt()}`)
        .expect(200);

      expect(res.body.enrollments[0]).toMatchObject({
        courseId: 'course-1',
        courseTitle: 'Video SaaS Mastery',
        courseSlug: 'video-saas',
        status: 'active',
      });
      expect(res.body.orders[0]).toEqual({
        id: 'order-1',
        status: 'paid',
        amount: 250000,
        createdAt: '2026-09-02T00:00:00.000Z',
      });
      expect(JSON.stringify(res.body)).not.toContain('password_hash');

      dbQueryOne.mockReset();
      dbQueryAll.mockReset();
      dbQueryOne.mockResolvedValueOnce(undefined);

      await request(app.getHttpServer())
        .get(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${await adminJwt()}`)
        .expect(404);
    });

    it('GET /api/admin/orders returns PRD §45 columns with activationStatus derived from enrollments', async () => {
      dbQueryAll.mockResolvedValueOnce([orderRow]);
      dbQueryOne.mockResolvedValueOnce({ total: 1 });

      const res = await request(app.getHttpServer())
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${await adminJwt()}`)
        .expect(200);

      expect(res.body).toMatchObject({ page: 1, limit: 20, total: 1 });
      expect(res.body.items[0]).toEqual({
        id: 'order-1',
        user: {
          id: userId,
          name: 'E2E User',
          email: 'e2e.user@example.com',
          phone: '+62812345678',
        },
        courseTitles: ['Video SaaS Mastery', 'CRM Blueprint'],
        amount: 250000,
        status: 'paid',
        createdAt: '2026-09-02T00:00:00.000Z',
        updatedAt: '2026-09-03T00:00:00.000Z',
        activationStatus: 'active',
        grantedBy: 'Admin One',
        grantedAt: '2026-09-03T00:00:00.000Z',
      });

      const [rowsSql] = dbQueryAll.mock.calls[0];
      expect(rowsSql).toContain(
        'LEFT JOIN enrollments e ON e.user_id = o.user_id AND e.course_id = oi.course_id',
      );
      expect(rowsSql).toContain('GROUP BY o.id');
      expect(rowsSql).not.toContain('activation_status');
    });

    it('GET /api/admin/orders binds ?status= and ?q= filters as parameters', async () => {
      dbQueryAll.mockResolvedValueOnce([]);
      dbQueryOne.mockResolvedValueOnce({ total: 0 });

      await request(app.getHttpServer())
        .get('/api/admin/orders?status=pending&q=user@example.com')
        .set('Authorization', `Bearer ${await adminJwt()}`)
        .expect(200);

      const [rowsSql, rowsParams] = dbQueryAll.mock.calls[0];
      expect(rowsSql).toContain('o.status = ?');
      expect(rowsSql).toContain("u.email LIKE ? ESCAPE '\\'");
      expect(rowsParams).toEqual(['pending', '%user@example.com%', 20, 0]);
    });

    it('GET /api/admin/orders rejects an invalid ?status= with 400 before touching the DB', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/orders?status=bogus')
        .set('Authorization', `Bearer ${await adminJwt()}`)
        .expect(400);
      expect(JSON.stringify(res.body.message)).toContain('pending');
      expectDbUnused();
    });

    it('GET /api/admin/overview returns the three counts from three COUNT queries', async () => {
      dbQueryOne
        .mockResolvedValueOnce({ count: 7 })
        .mockResolvedValueOnce({ count: 3 })
        .mockResolvedValueOnce({ count: 5 });

      const res = await request(app.getHttpServer())
        .get('/api/admin/overview')
        .set('Authorization', `Bearer ${await adminJwt()}`)
        .expect(200);

      expect(res.body).toEqual({ userCount: 7, pendingOrders: 3, activeEnrollments: 5 });

      const sqls = dbQueryOne.mock.calls.map(([sql]) => sql as string);
      expect(sqls[0]).toContain("FROM users WHERE role = 'user'");
      expect(sqls[1]).toContain("FROM orders WHERE status = 'pending'");
      expect(sqls[2]).toContain("FROM enrollments WHERE status = 'active'");
    });
  });

  describe('rate limiting (throttler guard via real pipeline)', () => {
    let throttleApp: INestApplication<App>;
    const tightLimit = 3;
    const badLogin = { email: 'ghost@example.com', password: 'whatever1' };

    beforeAll(async () => {
      // Separate app instance: in-memory throttler storage is per-app, so the
      // counters here are deterministic and isolated from the suites above.
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(DatabaseService)
        .useValue({
          queryAll: jest.fn(),
          queryOne: jest.fn(),
          execute: jest.fn(),
        })
        .overrideProvider(PasswordService)
        .useValue({
          hash: jest.fn(async () => 'hashed-password'),
          verify: jest.fn(async () => false),
        })
        // Tight module-level override: 3 req/min for routes WITHOUT a
        // route-level @Throttle. Routes WITH @Throttle (login, register)
        // keep their decorator limits — route metadata overrides module
        // options by design in @nestjs/throttler.
        .overrideProvider(getOptionsToken())
        .useValue([{ name: 'default', ttl: 60000, limit: tightLimit }])
        .compile();

      throttleApp = moduleFixture.createNestApplication();
      throttleApp.setGlobalPrefix('api');
      throttleApp.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      throttleApp.useGlobalFilters(new AllExceptionsFilter());
      await throttleApp.init();
    });

    afterAll(async () => {
      await throttleApp.close();
    });

    it('allows the 5/min login route limit: 5 rapid failed logins get 401, the 6th gets 429', async () => {
      const server = throttleApp.getHttpServer();
      for (let i = 0; i < 5; i++) {
        await request(server).post('/api/auth/login').send(badLogin).expect(401);
      }

      const res = await request(server)
        .post('/api/auth/login')
        .send(badLogin)
        .expect(429);

      expect(res.body.statusCode).toBe(429);
      expect(res.body.message).toBe('ThrottlerException: Too Many Requests');
      expect(JSON.stringify(res.body)).not.toContain('SQLITE');
      expect(JSON.stringify(res.body)).not.toContain('SELECT');
    });

    it('applies the tight module override (limit 3) to routes without @Throttle: 3 rapid refreshes get 401, the 4th gets 429', async () => {
      const server = throttleApp.getHttpServer();
      for (let i = 0; i < tightLimit; i++) {
        await request(server)
          .post('/api/auth/refresh')
          .send({ refreshToken: 'not-a-valid-token' })
          .expect(401);
      }

      const res = await request(server)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'not-a-valid-token' })
        .expect(429);

      expect(res.body.statusCode).toBe(429);
      expect(res.body.message).toBe('ThrottlerException: Too Many Requests');
    });
  });

  describe('T18 security regression gate', () => {
    const adminToken = () =>
      signToken({ sub: 'admin-uuid-1', email: 'admin@example.com', role: 'admin' });
    const userToken = (sub = 'user-uuid-1') =>
      signToken({ sub, email: `${sub}@example.com`, role: 'user' });
    const lessonId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
    const courseId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

    it('denies every admin surface with 401 anonymously and 403 for a normal user', async () => {
      const routes = [
        ['get', '/api/admin/users'],
        ['get', '/api/admin/orders'],
        ['get', '/api/admin/overview'],
        ['post', '/api/admin/media/upload-url'],
        ['post', '/api/admin/media/confirm'],
        ['post', '/api/admin/media/read-url'],
        ['post', '/api/courses'],
        ['post', `/api/courses/${courseId}/lessons`],
        ['patch', `/api/lessons/${lessonId}`],
        ['post', `/api/lessons/${lessonId}/publish`],
        ['patch', `/api/enrollments/${lessonId}/revoke`],
        ['patch', `/api/orders/${courseId}/verify`],
        ['post', `/api/orders/${courseId}/activate`],
        ['post', `/api/orders/${courseId}/cancel`],
      ] as const;

      for (const [method, path] of routes) {
        await request(app.getHttpServer())[method](path).expect(401);
      }

      const token = await userToken();
      for (const [method, path] of routes) {
        await request(app.getHttpServer())
          [method](path)
          .set('Authorization', `Bearer ${token}`)
          .expect(403);
      }
      expectDbUnused();
    });

    it('denies signed lesson URLs without, revoked, and expired enrollment', async () => {
      const token = await userToken();
      dbQueryOne.mockResolvedValueOnce({
        id: lessonId,
        course_id: courseId,
        video_object_key: 'private/courses/course/video.mp4',
      });
      dbQueryOne.mockResolvedValueOnce(undefined);
      await request(app.getHttpServer())
        .get(`/api/lessons/${lessonId}/video-url`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      dbQueryOne.mockReset();
      dbQueryOne.mockResolvedValueOnce({
        id: lessonId,
        course_id: courseId,
        video_object_key: 'private/courses/course/video.mp4',
      });
      dbQueryOne.mockResolvedValueOnce(undefined);
      await request(app.getHttpServer())
        .get(`/api/lessons/${lessonId}/video-url`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      dbQueryOne.mockReset();
      dbQueryOne.mockResolvedValueOnce({
        id: lessonId,
        course_id: courseId,
        video_object_key: 'private/courses/course/video.mp4',
      });
      dbQueryOne.mockResolvedValueOnce(undefined);
      await request(app.getHttpServer())
        .get(`/api/lessons/${lessonId}/video-url`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('denies cross-course lesson IDOR even when the user is enrolled elsewhere', async () => {
      const token = await userToken();
      dbQueryOne.mockResolvedValueOnce({
        id: lessonId,
        course_id: '9b2f8f9e-2c30-4c1a-8b3c-9c1f2f3f4f5f',
        video_object_key: 'private/courses/other/video.mp4',
      });
      dbQueryOne.mockResolvedValueOnce(undefined);

      await request(app.getHttpServer())
        .get(`/api/lessons/${lessonId}/video-url`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('binds user data reads and writes to the JWT subject, not caller-supplied identity', async () => {
      const token = await userToken('user-b');
      dbQueryAll.mockResolvedValueOnce([
        { id: 'enr-b', user_id: 'user-b', course_id: courseId, status: 'active' },
      ]);
      const enrollments = await request(app.getHttpServer())
        .get('/api/enrollments/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(enrollments.body[0].id).toBe('enr-b');
      expect(dbQueryAll.mock.calls[0][1]).toEqual(['user-b']);

      dbQueryAll.mockReset();
      dbQueryAll.mockResolvedValueOnce([]);
      const progress = await request(app.getHttpServer())
        .get('/api/progress')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(progress.body).toEqual([]);
      expect(dbQueryAll.mock.calls[0][1]).toEqual(['user-b']);
    });

    it('rejects invalid upload MIME, size, and prefix before storage access', async () => {
      const token = await adminToken();
      const cases = [
        { prefix: 'private/courses', contentType: 'text/html', size: 10, filename: 'x.html' },
        { prefix: 'private/courses', contentType: 'video/mp4', size: 524288001, filename: 'x.mp4' },
        { prefix: 'private/secrets', contentType: 'video/mp4', size: 10, filename: 'x.mp4' },
      ];

      for (const payload of cases) {
        const response = await request(app.getHttpServer())
          .post('/api/admin/media/upload-url')
          .set('Authorization', `Bearer ${token}`)
          .send(payload)
          .expect(400);
        expect(JSON.stringify(response.body)).not.toContain('R2');
      }
      expectDbUnused();
    });

    it('returns safe errors without secrets or stack traces for unknown failures', async () => {
      dbQueryAll.mockRejectedValueOnce(
        new Error('sqlite secret=top-secret connection stack should stay server-side'),
      );

      const response = await request(app.getHttpServer()).get('/api/enrollments/me').set(
        'Authorization',
        `Bearer ${await userToken()}`,
      );

      expect(response.status).toBe(500);
      expect(response.body.message).toBe(
        'An unexpected error occurred. Please try again later.',
      );
      expect(JSON.stringify(response.body)).not.toContain('top-secret');
      expect(JSON.stringify(response.body)).not.toContain('at ');
    });
  });

  describe('T6 named throttle groups (per-surface 429 limits)', () => {
    let groupApp: NestExpressApplication;
    const lessonId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

    // Dedicated app instance: the in-memory throttler storage is per-app, so
    // the bursts below cannot exhaust (or be exhausted by) the shared `app`
    // counters used by the rest of this suite.
    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(DatabaseService)
        // Persistent benign fixtures: every public read succeeds with an
        // empty published set, so any 429 can only come from the throttler.
        .useValue({
          queryAll: jest.fn(async () => []),
          queryOne: jest.fn(async () => ({ total: 0 })),
          execute: jest.fn(async () => undefined),
        })
        .overrideProvider(PasswordService)
        .useValue({
          hash: jest.fn(async () => 'hashed-password'),
          verify: jest.fn(async () => false),
        })
        .compile();

      groupApp = moduleFixture.createNestApplication<NestExpressApplication>();
      groupApp.setGlobalPrefix('api');
      groupApp.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      groupApp.useGlobalFilters(new AllExceptionsFilter());
      // Mirror the proxied deployment (D1/Cloudflare): client-IP resolution
      // for throttling comes from req.ip, which Express derives from
      // X-Forwarded-For only when trust proxy is configured.
      groupApp.set('trust proxy', resolveTrustProxyHops('1'));
      await groupApp.init();
    });

    afterAll(async () => {
      await groupApp.close();
    });

    /**
     * Sends `count` requests from one (spoofable) client IP and returns every
     * status code. TEST-NET ranges (RFC 5737) keep buckets collision-free.
     */
    async function burst(
      method: 'get' | 'post',
      path: string,
      count: number,
      clientIp: string,
      body?: object,
    ): Promise<number[]> {
      const server = groupApp.getHttpServer();
      const statuses: number[] = [];
      for (let i = 0; i < count; i++) {
        const req = request(server)[method](path).set('X-Forwarded-For', clientIp);
        if (body) req.send(body);
        const res = await req;
        statuses.push(res.status);
      }
      return statuses;
    }

    it('caps public search at 30/min per IP: 30 pass, the 31st is a 429 with the search-group budget', async () => {
      const ip = '203.0.113.11';
      const ok = await burst('get', '/api/search?q=x', 30, ip);
      expect(ok).toEqual(expect.arrayContaining([200]));
      expect(ok.every((s) => s === 200)).toBe(true);

      const server = groupApp.getHttpServer();
      const probe = await request(server)
        .get('/api/search?q=x')
        .set('X-Forwarded-For', ip)
        .expect(429);
      expect(probe.body.statusCode).toBe(429);
      expect(probe.body.message).toBe('ThrottlerException: Too Many Requests');
      expect(probe.headers['retry-after-search']).toBeDefined();
    });

    it('exposes the search-group 30/min and default 100/min headers side by side below the limit', async () => {
      const res = await request(groupApp.getHttpServer())
        .get('/api/search?q=isolated')
        .set('X-Forwarded-For', '203.0.113.111')
        .expect(200);
      expect(res.headers['x-ratelimit-limit']).toBe('100');
      expect(res.headers['x-ratelimit-limit-search']).toBe('30');
    });

    it('caps every public catalog list at 30/min per IP (courses burst proves enforcement; sibling lists prove the wiring)', async () => {
      const ip = '203.0.113.12';
      const ok = await burst('get', '/api/courses', 30, ip);
      expect(ok.every((s) => s === 200)).toBe(true);
      const burst1 = await burst('get', '/api/courses', 1, ip);
      expect(burst1).toEqual([429]);

      // Same named group, per-route counters: each list advertises the 30/min
      // catalog budget while its default tracker stays at 100/min.
      for (const path of ['/api/projects', '/api/marketplace', '/api/collective', '/api/home']) {
        const res = await request(groupApp.getHttpServer())
          .get(path)
          .set('X-Forwarded-For', `203.0.113.9${path.length}`)
          .expect(200);
        expect(res.headers['x-ratelimit-limit-catalog']).toBe('30');
      }
    });

    it('caps signed video URLs at 10/min per IP', async () => {
      const ip = '203.0.113.13';
      const statuses = await burst('get', `/api/lessons/${lessonId}/video-url`, 10, ip);
      // Requests 1..10 pass the throttler (401 from AuthGuard), proving the
      // tighter budget applies before auth instead of replacing it.
      expect(statuses).toEqual(Array(10).fill(401));
      const probe = await request(groupApp.getHttpServer())
        .get(`/api/lessons/${lessonId}/video-url`)
        .set('X-Forwarded-For', ip);
      expect(probe.status).toBe(429);
      expect(probe.headers['retry-after-signed']).toBeDefined();
    });

    it('caps admin media URL generation at 10/min per IP (upload-url and read-url share the signed budget shape)', async () => {
      for (const [path, ip] of [
        ['/api/admin/media/upload-url', '203.0.113.14'],
        ['/api/admin/media/read-url', '203.0.113.15'],
      ] as const) {
        const statuses = await burst('post', path, 10, ip, { key: 'x' });
        expect(statuses).toEqual(Array(10).fill(401));
        const probe = await request(groupApp.getHttpServer())
          .post(path)
          .set('X-Forwarded-For', ip)
          .send({ key: 'x' });
        expect(probe.status).toBe(429);
        expect(probe.headers['retry-after-signed']).toBeDefined();
      }
    });

    it('caps order creation at 10/min per IP while the auth 5/min override stays stricter on login', async () => {
      const ip = '203.0.113.16';
      const checkout = { courseIds: ['0b9e6b5e-1111-4222-8333-444455556666'] };
      const statuses = await burst('post', '/api/orders', 10, ip, checkout);
      expect(statuses).toEqual(Array(10).fill(401));
      const probe = await request(groupApp.getHttpServer())
        .post('/api/orders')
        .set('X-Forwarded-For', ip)
        .send(checkout);
      expect(probe.status).toBe(429);
      expect(probe.headers['retry-after-order']).toBeDefined();

      // Sibling order routes are NOT part of the order group: verify keeps
      // the historical 100/min default.
      const sibling = await request(groupApp.getHttpServer())
        .patch(`/api/orders/0b9e6b5e-1111-4222-8333-444455556666/verify`)
        .set('X-Forwarded-For', '203.0.113.17');
      expect(sibling.status).toBe(401);
      expect(sibling.headers['x-ratelimit-limit-order']).toBe('100');
    });

    it('never throttles GET /api health even far beyond every declared limit (105 consecutive 200s)', async () => {
      const statuses = await burst('get', '/api', 105, '203.0.113.18');
      expect(statuses).toEqual(Array(105).fill(200));
    });

    it('preserves the DL-012 auth 5/min login override alongside the new groups (401×5 then 429)', async () => {
      const ip = '203.0.113.19';
      const badLogin = { email: 'ghost@example.com', password: 'whatever1' };
      const first = await request(groupApp.getHttpServer())
        .post('/api/auth/login')
        .set('X-Forwarded-For', ip)
        .send(badLogin)
        .expect(401);
      expect(first.headers['x-ratelimit-limit']).toBe('5');
      const more = await burst('post', '/api/auth/login', 4, ip, badLogin);
      expect(more).toEqual(Array(4).fill(401));
      const probe = await request(groupApp.getHttpServer())
        .post('/api/auth/login')
        .set('X-Forwarded-For', ip)
        .send(badLogin);
      expect(probe.status).toBe(429);
    });

    it('isolates counters per client IP under trust proxy (exhausted IP is 429, fresh IP passes)', async () => {
      const exhausted = await burst('get', '/api/search?q=isolation', 30, '203.0.113.20');
      expect(exhausted.every((s) => s === 200)).toBe(true);
      const stillBlocked = await request(groupApp.getHttpServer())
        .get('/api/search?q=isolation')
        .set('X-Forwarded-For', '203.0.113.20');
      expect(stillBlocked.status).toBe(429);
      const freshIp = await request(groupApp.getHttpServer())
        .get('/api/search?q=isolation')
        .set('X-Forwarded-For', '203.0.113.21')
        .expect(200);
      expect(freshIp.headers['x-ratelimit-remaining-search']).toBe('29');
    });
  });
});
