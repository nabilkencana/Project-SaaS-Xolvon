import './e2e-setup';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { PasswordService } from '../src/auth/password.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import type { JwtPayload } from '../src/auth/interfaces/jwt-payload.interface';

describe('Backend API (e2e, deterministic — no Cloudflare access)', () => {
  let app: INestApplication<App>;
  let dbQueryAll: jest.Mock;
  let dbQueryOne: jest.Mock;
  let dbExecute: jest.Mock;
  let fetchSpy: jest.SpyInstance;
  let jwtService: JwtService;

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
      .useValue({
        hash: jest.fn(async () => 'hashed-password'),
        verify: jest.fn(async () => true),
      })
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

      expect(dbExecute).toHaveBeenCalledTimes(1);
      const [updateSql, updateParams] = dbExecute.mock.calls[0];
      expect(updateSql).toContain("UPDATE orders SET status = 'paid'");
      expect(updateParams[0]).toBe('admin-uuid-1');
      expect(updateParams[3]).toBe(orderId);
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
});
