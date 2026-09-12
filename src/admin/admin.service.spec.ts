import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { DatabaseService } from '../database/database.service';
import type { AdminOrderRow, AdminUserRow } from './interfaces/admin.interface';

const SEP = String.fromCharCode(31); // GROUP_CONCAT separator (SQL char(31))

function makeUserRow(overrides: Partial<AdminUserRow> = {}): AdminUserRow {
  return {
    id: 'user-uuid-1',
    name: 'E2E User',
    email: 'e2e.user@example.com',
    phone: '+62812345678',
    role: 'user',
    status: 'active',
    created_at: '2026-09-01T00:00:00.000Z',
    enrollment_count: 2,
    ...overrides,
  };
}

function makeOrderRow(overrides: Partial<AdminOrderRow> = {}): AdminOrderRow {
  return {
    id: 'order-1',
    status: 'paid',
    amount: 250000,
    created_at: '2026-09-02T00:00:00.000Z',
    updated_at: '2026-09-03T00:00:00.000Z',
    user_id: 'user-uuid-1',
    user_name: 'E2E User',
    user_email: 'e2e.user@example.com',
    user_phone: '+62812345678',
    course_titles: `Video SaaS Mastery${SEP}CRM Blueprint`,
    has_active_enrollment: 1,
    granted_by_names: 'Admin One',
    granted_at: '2026-09-03T00:00:00.000Z',
    ...overrides,
  };
}

describe('AdminService', () => {
  let service: AdminService;
  let mockDb: { queryAll: jest.Mock; queryOne: jest.Mock; execute: jest.Mock };

  beforeEach(() => {
    mockDb = {
      queryAll: jest.fn(),
      queryOne: jest.fn(),
      execute: jest.fn(),
    };

    service = new AdminService(mockDb as unknown as DatabaseService);
  });

  // ---------------------------------------------------------------------------
  // listUsers
  // ---------------------------------------------------------------------------
  describe('listUsers', () => {
    it('returns the {items, page, limit, total} envelope with enrollmentCount and never the password hash', async () => {
      mockDb.queryAll.mockResolvedValueOnce([makeUserRow()]);
      mockDb.queryOne.mockResolvedValueOnce({ total: 1 });

      const result = await service.listUsers({ page: 1, limit: 20 });

      expect(result).toMatchObject({ page: 1, limit: 20, total: 1 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        id: 'user-uuid-1',
        name: 'E2E User',
        email: 'e2e.user@example.com',
        phone: '+62812345678',
        role: 'user',
        status: 'active',
        createdAt: '2026-09-01T00:00:00.000Z',
        enrollmentCount: 2,
      });
      expect(JSON.stringify(result)).not.toContain('password_hash');
    });

    it('joins enrollments in a single grouped query (no N+1) and paginates via LIMIT/OFFSET', async () => {
      mockDb.queryAll.mockResolvedValueOnce([]);
      mockDb.queryOne.mockResolvedValueOnce({ total: 0 });

      await service.listUsers({});

      expect(mockDb.queryAll).toHaveBeenCalledTimes(1);
      const [rowsSql, rowsParams] = mockDb.queryAll.mock.calls[0];
      expect(rowsSql).toContain('LEFT JOIN enrollments e ON e.user_id = u.id');
      expect(rowsSql).toContain('GROUP BY u.id');
      expect(rowsSql).toContain('LIMIT ? OFFSET ?');
      expect(rowsParams).toEqual([20, 0]); // default limit 20, page 1 → offset 0
    });

    it('binds ?q= as an escaped contains-LIKE across email and name', async () => {
      mockDb.queryAll.mockResolvedValueOnce([]);
      mockDb.queryOne.mockResolvedValueOnce({ total: 0 });

      await service.listUsers({ q: '50%_off' });

      const [rowsSql, rowsParams] = mockDb.queryAll.mock.calls[0];
      expect(rowsSql).toContain("u.email LIKE ? ESCAPE '\\'");
      expect(rowsSql).toContain("u.name LIKE ? ESCAPE '\\'");
      expect(rowsParams[0]).toBe('%50\\%\\_off%');
      expect(rowsParams[1]).toBe(rowsParams[0]);
    });

    it('clamps page and limit to the DL-011 contract (default 20, max 100)', async () => {
      mockDb.queryAll.mockResolvedValue([]);
      mockDb.queryOne.mockResolvedValue({ total: 0 });

      await service.listUsers({ page: -3, limit: 1000 });
      expect(mockDb.queryAll.mock.calls[0][1]).toEqual([100, 0]);

      await service.listUsers({ page: 2, limit: 50 });
      expect(mockDb.queryAll.mock.calls[1][1]).toEqual([50, 50]);
    });

    it('counts the total from users only, without joining enrollments', async () => {
      mockDb.queryAll.mockResolvedValueOnce([]);
      mockDb.queryOne.mockResolvedValueOnce({ total: 0 });

      await service.listUsers({ q: 'admin' });

      const [countSql, countParams] = mockDb.queryOne.mock.calls[0];
      expect(countSql).toContain('COUNT(*)');
      expect(countSql).toContain('FROM users u');
      expect(countSql).not.toContain('enrollments');
      expect(countParams).toEqual(['%admin%', '%admin%']);
    });
  });

  // ---------------------------------------------------------------------------
  // getUserDetail
  // ---------------------------------------------------------------------------
  describe('getUserDetail', () => {
    it('returns the user with their enrollments (course title/slug) and orders', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeUserRow({ enrollment_count: 0 }));
      mockDb.queryAll
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

      const detail = await service.getUserDetail('user-uuid-1');

      expect(detail).toMatchObject({
        id: 'user-uuid-1',
        name: 'E2E User',
        email: 'e2e.user@example.com',
        phone: '+62812345678',
        role: 'user',
        status: 'active',
        createdAt: '2026-09-01T00:00:00.000Z',
      });
      expect(detail.enrollments).toEqual([
        {
          id: 'enr-1',
          courseId: 'course-1',
          courseTitle: 'Video SaaS Mastery',
          courseSlug: 'video-saas',
          status: 'active',
          grantedAt: '2026-09-03T00:00:00.000Z',
        },
      ]);
      expect(detail.orders).toEqual([
        { id: 'order-1', status: 'paid', amount: 250000, createdAt: '2026-09-02T00:00:00.000Z' },
      ]);
      expect(JSON.stringify(detail)).not.toContain('password_hash');
    });

    it('throws NotFoundException for an unknown id without querying enrollments or orders', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(service.getUserDetail('nope-id')).rejects.toThrow(NotFoundException);
      expect(mockDb.queryAll).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // listOrders
  // ---------------------------------------------------------------------------
  describe('listOrders', () => {
    it('derives activationStatus from enrollments via a LEFT JOIN in a single grouped query (never a stored column)', async () => {
      mockDb.queryAll.mockResolvedValueOnce([
        makeOrderRow({ has_active_enrollment: 1 }),
        makeOrderRow({ id: 'order-2', has_active_enrollment: 0 }),
      ]);
      mockDb.queryOne.mockResolvedValueOnce({ total: 2 });

      const result = await service.listOrders({});

      expect(result.items[0].activationStatus).toBe('active');
      expect(result.items[1].activationStatus).toBe('not_active');

      const [rowsSql] = mockDb.queryAll.mock.calls[0];
      expect(rowsSql).toContain(
        'LEFT JOIN enrollments e ON e.user_id = o.user_id AND e.course_id = oi.course_id',
      );
      expect(rowsSql).toContain("e.status = 'active'");
      expect(rowsSql).toContain('GROUP BY o.id');
      expect(rowsSql).not.toContain('activation_status');
    });

    it('splits course titles from order_items into a deduplicated array', async () => {
      mockDb.queryAll.mockResolvedValueOnce([
        makeOrderRow({
          course_titles: `Video SaaS Mastery${SEP}CRM Blueprint${SEP}Video SaaS Mastery`,
        }),
      ]);
      mockDb.queryOne.mockResolvedValueOnce({ total: 1 });

      const result = await service.listOrders({});

      expect(result.items[0].courseTitles).toEqual(['Video SaaS Mastery', 'CRM Blueprint']);
    });

    it('maps null course lists and multi-admin grantedBy, splitting granted names', async () => {
      mockDb.queryAll.mockResolvedValueOnce([
        makeOrderRow({
          course_titles: null,
          granted_by_names: `Admin One${SEP}Admin Two${SEP}Admin One`,
        }),
      ]);
      mockDb.queryOne.mockResolvedValueOnce({ total: 1 });

      const result = await service.listOrders({});

      expect(result.items[0].courseTitles).toEqual([]);
      expect(result.items[0].grantedBy).toBe('Admin One, Admin Two');
      expect(result.items[0].grantedAt).toBe('2026-09-03T00:00:00.000Z');
    });

    it('binds ?status= and ?q= (escaped contains-LIKE on email) filters', async () => {
      mockDb.queryAll.mockResolvedValueOnce([]);
      mockDb.queryOne.mockResolvedValueOnce({ total: 0 });

      await service.listOrders({ status: 'paid', q: '50%_off' });

      const [rowsSql, rowsParams] = mockDb.queryAll.mock.calls[0];
      expect(rowsSql).toContain('o.status = ?');
      expect(rowsSql).toContain("u.email LIKE ? ESCAPE '\\'");
      expect(rowsParams).toEqual(['paid', '%50\\%\\_off%', 20, 0]);

      const [countSql, countParams] = mockDb.queryOne.mock.calls[0];
      expect(countSql).toContain('o.status = ?');
      expect(countParams).toEqual(['paid', '%50\\%\\_off%']);
    });

    it('paginates with DL-011 clamps (default 20, max 100, 1-based page)', async () => {
      mockDb.queryAll.mockResolvedValue([]);
      mockDb.queryOne.mockResolvedValue({ total: 0 });

      await service.listOrders({ page: 2, limit: 50 });
      expect(mockDb.queryAll.mock.calls[0][1]).toEqual([50, 50]);

      await service.listOrders({ page: 0, limit: 500 });
      expect(mockDb.queryAll.mock.calls[1][1]).toEqual([100, 0]);
    });
  });

  // ---------------------------------------------------------------------------
  // getOverview
  // ---------------------------------------------------------------------------
  describe('getOverview', () => {
    it('returns the three counts from three COUNT queries (HANDBOOK §5.4)', async () => {
      mockDb.queryOne
        .mockResolvedValueOnce({ count: 7 })
        .mockResolvedValueOnce({ count: 3 })
        .mockResolvedValueOnce({ count: 5 });

      await expect(service.getOverview()).resolves.toEqual({
        userCount: 7,
        pendingOrders: 3,
        activeEnrollments: 5,
      });

      const sqls = mockDb.queryOne.mock.calls.map(([sql]) => sql as string);
      expect(sqls).toHaveLength(3);
      expect(sqls[0]).toContain("FROM users WHERE role = 'user'");
      expect(sqls[1]).toContain("FROM orders WHERE status = 'pending'");
      expect(sqls[2]).toContain("FROM enrollments WHERE status = 'active'");
    });

    it('falls back to 0 when a count row is missing', async () => {
      mockDb.queryOne
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ count: 3 })
        .mockResolvedValueOnce(undefined);

      await expect(service.getOverview()).resolves.toEqual({
        userCount: 0,
        pendingOrders: 3,
        activeEnrollments: 0,
      });
    });
  });
});
