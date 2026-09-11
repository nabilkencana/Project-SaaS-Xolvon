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
});
