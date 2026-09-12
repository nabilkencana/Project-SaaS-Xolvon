import { NotFoundException } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import type { EnrollmentRow } from './interfaces/enrollment.interface';

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;
  let mockDb: { queryAll: jest.Mock; queryOne: jest.Mock; execute: jest.Mock };
  let mockAuditService: jest.Mocked<AuditService>;

  beforeEach(() => {
    mockDb = {
      queryAll: jest.fn(),
      queryOne: jest.fn(),
      execute: jest.fn(),
    };

    mockAuditService = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
    service = new EnrollmentsService(
      mockDb as unknown as DatabaseService,
      mockAuditService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // isUserEntitled
  // ---------------------------------------------------------------------------
  describe('isUserEntitled', () => {
    it('should return true when an active unexpired enrollment exists', async () => {
      mockDb.queryOne.mockResolvedValueOnce({ id: 'enrollment-1' });

      const result = await service.isUserEntitled('user-1', 'course-1');

      expect(result).toBe(true);
      expect(mockDb.queryOne).toHaveBeenCalledTimes(1);
      const [sql, params] = mockDb.queryOne.mock.calls[0];
      expect(sql).toContain("status = 'active'");
      expect(sql).toContain('expires_at IS NULL OR expires_at > ?');
      expect(params[0]).toBe('user-1');
      expect(params[1]).toBe('course-1');
    });

    it('should return false when no active enrollment exists', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      const result = await service.isUserEntitled('user-1', 'course-1');

      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // getUserEnrollments
  // ---------------------------------------------------------------------------
  describe('getUserEnrollments', () => {
    it('should return list of mapped enrollments for the user', async () => {
      const sampleRows: EnrollmentRow[] = [
        {
          id: 'en-1',
          user_id: 'user-1',
          course_id: 'c-1',
          order_id: 'ord-1',
          status: 'active',
          granted_at: '2026-09-04T00:00:00.000Z',
          granted_by: 'admin-1',
          revoked_at: null,
          expires_at: null,
          created_at: '2026-09-04T00:00:00.000Z',
          course_title: 'NestJS Masterclass',
          course_slug: 'nestjs-masterclass',
        },
      ];

      mockDb.queryAll.mockResolvedValueOnce(sampleRows);

      const result = await service.getUserEnrollments('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('en-1');
      expect(result[0].courseId).toBe('c-1');
      expect(result[0].status).toBe('active');
      expect(result[0].courseTitle).toBe('NestJS Masterclass');
      expect(mockDb.queryAll).toHaveBeenCalledWith(
        expect.stringContaining('WHERE e.user_id = ?'),
        ['user-1'],
      );
    });
  });

  // ---------------------------------------------------------------------------
  // revokeEnrollment
  // ---------------------------------------------------------------------------
  describe('revokeEnrollment', () => {
    it('should throw NotFoundException if enrollment does not exist', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(
        service.revokeEnrollment('admin-1', 'invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update status to revoked and return updated dto', async () => {
      const sampleRow: EnrollmentRow = {
        id: 'en-1',
        user_id: 'user-1',
        course_id: 'c-1',
        order_id: 'ord-1',
        status: 'active',
        granted_at: '2026-09-04T00:00:00.000Z',
        granted_by: 'admin-1',
        revoked_at: null,
        expires_at: null,
        created_at: '2026-09-04T00:00:00.000Z',
      };

      mockDb.queryOne.mockResolvedValueOnce(sampleRow);

      const result = await service.revokeEnrollment('admin-1', 'en-1');

      expect(result.status).toBe('revoked');
      expect(mockDb.execute).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("UPDATE enrollments SET status = 'revoked'"),
        [expect.any(String), 'en-1'],
      );
      expect(mockAuditService.record).toHaveBeenCalledWith(
        'admin-1',
        'revoke',
        'enrollment',
        'en-1',
        { status: 'active -> revoked', orderId: 'ord-1' },
      );
    });
  });

  // ---------------------------------------------------------------------------
  // activateOrderEnrollments
  // ---------------------------------------------------------------------------
  describe('activateOrderEnrollments', () => {
    it('should execute idempotent ON CONFLICT UPSERT for each courseId', async () => {
      const count = await service.activateOrderEnrollments(
        'order-1',
        'user-1',
        ['c-1', 'c-2'],
        'admin-1',
      );

      expect(count).toBe(2);
      expect(mockDb.execute).toHaveBeenCalledTimes(2);

      const [firstSql, firstParams] = mockDb.execute.mock.calls[0];
      expect(firstSql).toContain('ON CONFLICT(user_id, course_id) DO UPDATE');
      expect(firstSql).toContain("WHERE enrollments.status != 'active'");
      expect(firstParams[1]).toBe('user-1');
      expect(firstParams[2]).toBe('c-1');
      expect(firstParams[3]).toBe('order-1');
      expect(firstParams[5]).toBe('admin-1');
    });
  });
});
