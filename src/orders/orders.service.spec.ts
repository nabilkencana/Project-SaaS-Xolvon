import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { DatabaseService } from '../database/database.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { AuditService } from '../audit/audit.service';
import type { OrderRow } from './interfaces/order.interface';

/**
 * Rows carrying statuses outside the reconciled `pending|paid|cancelled` set
 * (e.g. legacy `awaiting_verification` rows written before the status
 * collapse) must still be rejected at runtime by the state guards.
 */
const LEGACY_AWAITING_VERIFICATION =
  'awaiting_verification' as unknown as OrderRow['status'];

describe('OrdersService', () => {
  let service: OrdersService;
  let mockDb: { queryAll: jest.Mock; queryOne: jest.Mock; execute: jest.Mock };
  let mockEnrollmentsService: jest.Mocked<EnrollmentsService>;
  let mockAuditService: jest.Mocked<AuditService>;

  beforeEach(() => {
    mockDb = {
      queryAll: jest.fn(),
      queryOne: jest.fn(),
      execute: jest.fn(),
    };

    mockEnrollmentsService = {
      activateOrderEnrollments: jest.fn(),
      getUserEnrollments: jest.fn(),
      isUserEntitled: jest.fn(),
      revokeEnrollment: jest.fn(),
    } as unknown as jest.Mocked<EnrollmentsService>;
    mockAuditService = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;

    service = new OrdersService(
      mockDb as unknown as DatabaseService,
      mockEnrollmentsService,
      mockAuditService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // checkout
  // ---------------------------------------------------------------------------
  describe('checkout', () => {
    it('should throw BadRequestException if courseIds contain duplicates', async () => {
      await expect(
        service.checkout('user-1', {
          courseIds: [
            '11111111-1111-4111-8111-111111111111',
            '11111111-1111-4111-8111-111111111111',
          ],
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'Duplikasi courseId tidak diperbolehkan dalam satu order.',
        ),
      );
    });

    it('should throw BadRequestException if one or more courses are not found in DB', async () => {
      mockDb.queryAll.mockResolvedValueOnce([{ id: 'c-1', price: 100000 }]);

      await expect(
        service.checkout('user-1', {
          courseIds: ['c-1', 'c-2'],
        }),
      ).rejects.toThrow(
        new BadRequestException('Satu atau lebih course tidak ditemukan.'),
      );
    });

    it('should throw BadRequestException if total amount is zero or less', async () => {
      mockDb.queryAll.mockResolvedValueOnce([{ id: 'c-1', price: 0 }]);

      await expect(
        service.checkout('user-1', {
          courseIds: ['c-1'],
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'Total amount order harus lebih besar dari 0.',
        ),
      );
    });

    it('should compute amount from database prices, create order and items', async () => {
      // 1. courses query
      mockDb.queryAll.mockResolvedValueOnce([
        { id: 'c-1', price: 150000 },
        { id: 'c-2', price: 200000 },
      ]);

      const result = await service.checkout('user-1', {
        courseIds: ['c-1', 'c-2'],
        notes: 'Please expedite',
      });

      expect(result.status).toBe('pending');
      expect(result.amount).toBe(350000);
      expect(result.notes).toBe('Please expedite');
      expect(result.items).toHaveLength(2);
      expect(result.items[0].courseId).toBe('c-1');
      expect(result.items[0].price).toBe(150000);
      expect(result.items[1].courseId).toBe('c-2');
      expect(result.items[1].price).toBe(200000);

      expect(mockDb.queryAll).toHaveBeenCalledTimes(1);
      expect(mockDb.execute).toHaveBeenCalledTimes(3);
      const [orderSql] = mockDb.execute.mock.calls[0];
      expect(orderSql).toContain('INSERT INTO orders');
    });
  });

  // ---------------------------------------------------------------------------
  // submitPaymentProof
  // ---------------------------------------------------------------------------
  describe('submitPaymentProof', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(
        service.submitPaymentProof('user-1', 'ord-1', {
          objectKey: 'proofs/ord-1.jpg',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if order belongs to another user (IDOR prevention)', async () => {
      mockDb.queryOne.mockResolvedValueOnce({
        id: 'ord-1',
        user_id: 'other-user',
        status: 'pending',
      });

      await expect(
        service.submitPaymentProof('user-1', 'ord-1', {
          objectKey: 'proofs/ord-1.jpg',
        }),
      ).rejects.toThrow(
        new ForbiddenException('Anda tidak memiliki akses ke order ini.'),
      );
    });

    it('should throw BadRequestException if order status is paid (state validation)', async () => {
      mockDb.queryOne.mockResolvedValueOnce({
        id: 'ord-1',
        user_id: 'user-1',
        status: 'paid',
      });

      await expect(
        service.submitPaymentProof('user-1', 'ord-1', {
          objectKey: 'proofs/ord-1.jpg',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject legacy awaiting_verification rows (status no longer exists)', async () => {
      mockDb.queryOne.mockResolvedValueOnce({
        id: 'ord-1',
        user_id: 'user-1',
        status: LEGACY_AWAITING_VERIFICATION,
      });

      await expect(
        service.submitPaymentProof('user-1', 'ord-1', {
          objectKey: 'proofs/ord-1.jpg',
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'Bukti pembayaran hanya dapat diunggah untuk order yang berstatus pending.',
        ),
      );
    });

    it('should insert payment proof and keep the order status pending (no status update)', async () => {
      mockDb.queryOne.mockResolvedValueOnce({
        id: 'ord-1',
        user_id: 'user-1',
        status: 'pending',
      });

      // Fixture updated for BUG-T9-01: the old key 'proofs/ord-1.jpg' encoded
      // the buggy acceptance of foreign prefixes; allowed-prefix keys only.
      const result = await service.submitPaymentProof('user-1', 'ord-1', {
        objectKey: 'private/courses/ord-1.jpg',
      });

      expect(result.message).toBe('Bukti pembayaran berhasil diunggah.');
      expect(result.proofId).toBeDefined();

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
      const [proofSql] = mockDb.execute.mock.calls[0];
      expect(proofSql).toContain('INSERT INTO payment_proofs');

      const touchedSqls = mockDb.execute.mock.calls.map(([sql]) => sql);
      expect(
        touchedSqls.some((sql) => sql.includes('UPDATE orders')),
      ).toBe(false);
    });

    // ---------------------------------------------------------------------------
    // BUG-T9-01 (reproduction): submitPaymentProof stored ANY client-supplied
    // objectKey. QA evidence (task-9-critical-local.md L3-L6, EXPLOIT-TERBUKTI
    // on both targets): '../etc/passwd', percent-encoded traversal, and keys
    // from foreign prefixes were all accepted with 201. These legs must 400.
    // ---------------------------------------------------------------------------
    const pendingOwnOrder = () =>
      mockDb.queryOne.mockResolvedValueOnce({
        id: 'ord-1',
        user_id: 'user-1',
        status: 'pending',
      });

    it('should reject path-traversal objectKey "../etc/passwd" with 400 (BUG-T9-01)', async () => {
      pendingOwnOrder();

      await expect(
        service.submitPaymentProof('user-1', 'ord-1', {
          objectKey: '../etc/passwd',
        }),
      ).rejects.toThrow('objectKey bukti pembayaran tidak valid.');
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it('should reject percent-encoded traversal objectKey with 400 (BUG-T9-01)', async () => {
      pendingOwnOrder();

      await expect(
        service.submitPaymentProof('user-1', 'ord-1', {
          objectKey: 'private/courses/%2e%2e/%2e%2e/etc/passwd',
        }),
      ).rejects.toThrow('objectKey bukti pembayaran tidak valid.');
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it('should reject backslash objectKey with 400 (BUG-T9-01)', async () => {
      pendingOwnOrder();

      await expect(
        service.submitPaymentProof('user-1', 'ord-1', {
          objectKey: 'private\\courses\\x.png',
        }),
      ).rejects.toThrow('objectKey bukti pembayaran tidak valid.');
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it('should reject objectKey outside MEDIA_PREFIXES allowlist with 400 (BUG-T9-01)', async () => {
      pendingOwnOrder();

      await expect(
        service.submitPaymentProof('user-1', 'ord-1', {
          objectKey: 'payment-proofs/some-key.jpg',
        }),
      ).rejects.toThrow('objectKey bukti pembayaran tidak valid.');
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it('should still accept an allowed-prefix key even when it may reference another user upload (documented residual, not fixed here)', async () => {
      // Residual gap: cross-user references within an allowed prefix cannot be
      // closed without an attribution column + student upload endpoint
      // (product decision — see T16 report). This test pins that behaviour.
      pendingOwnOrder();

      const result = await service.submitPaymentProof('user-1', 'ord-1', {
        objectKey: 'private/courses/qa-t9-proof-B-1789276695.png',
      });

      expect(result.proofId).toBeDefined();
      expect(mockDb.execute).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // verifyOrder
  // ---------------------------------------------------------------------------
  describe('verifyOrder', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(service.verifyOrder('admin-1', 'ord-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should transition a pending order to paid and record verified_by and verified_at', async () => {
      mockDb.queryOne.mockResolvedValueOnce({
        id: 'ord-1',
        user_id: 'user-1',
        status: 'pending',
        amount: 150000,
        notes: '',
        verified_by: null,
        verified_at: null,
        created_at: '2026-09-04T00:00:00.000Z',
        updated_at: '2026-09-04T00:00:00.000Z',
      });
      mockDb.queryAll.mockResolvedValueOnce([
        {
          id: 'it-1',
          order_id: 'ord-1',
          course_id: 'c-1',
          price: 150000,
          created_at: '2026-09-04T00:00:00.000Z',
        },
      ]);

      const result = await service.verifyOrder('admin-1', 'ord-1');

      expect(result.status).toBe('paid');
      expect(result.verifiedAt).toBeDefined();
      expect(mockDb.execute).toHaveBeenCalledTimes(1);
      const [updateSql, updateParams] = mockDb.execute.mock.calls[0];
      expect(updateSql).toContain("UPDATE orders SET status = 'paid'");
      expect(updateParams).toEqual([
        'admin-1',
        expect.any(String),
        expect.any(String),
        'ord-1',
      ]);
      expect(mockAuditService.record).toHaveBeenCalledWith(
        'admin-1',
        'verify',
        'order',
        'ord-1',
        { status: 'pending -> paid' },
      );
    });

    it('should throw BadRequestException if order is already paid', async () => {
      mockDb.queryOne.mockResolvedValueOnce({
        id: 'ord-1',
        user_id: 'user-1',
        status: 'paid',
      });

      await expect(service.verifyOrder('admin-1', 'ord-1')).rejects.toThrow(
        new BadRequestException(
          'Order sudah diverifikasi dan berstatus paid.',
        ),
      );
    });

    it('should throw BadRequestException if order is cancelled', async () => {
      mockDb.queryOne.mockResolvedValueOnce({
        id: 'ord-1',
        user_id: 'user-1',
        status: 'cancelled',
      });

      await expect(service.verifyOrder('admin-1', 'ord-1')).rejects.toThrow(
        new BadRequestException(
          'Order yang sudah dibatalkan tidak dapat diverifikasi.',
        ),
      );
    });

    it('should reject legacy awaiting_verification rows (only pending can be verified)', async () => {
      mockDb.queryOne.mockResolvedValueOnce({
        id: 'ord-1',
        user_id: 'user-1',
        status: LEGACY_AWAITING_VERIFICATION,
      });

      await expect(service.verifyOrder('admin-1', 'ord-1')).rejects.toThrow(
        new BadRequestException(
          'Hanya order berstatus pending yang dapat diverifikasi.',
        ),
      );
      expect(mockDb.execute).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // activateOrder
  // ---------------------------------------------------------------------------
  describe('activateOrder', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(service.activateOrder('admin-1', 'ord-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if order status is not paid', async () => {
      mockDb.queryOne.mockResolvedValueOnce({
        id: 'ord-1',
        user_id: 'user-1',
        status: 'pending',
      });

      await expect(service.activateOrder('admin-1', 'ord-1')).rejects.toThrow(
        new BadRequestException(
          'Hanya order yang berstatus paid yang dapat diaktivasi.',
        ),
      );
    });

    it('should delegate to enrollmentsService.activateOrderEnrollments for paid order', async () => {
      mockDb.queryOne.mockResolvedValueOnce({
        id: 'ord-1',
        user_id: 'user-1',
        status: 'paid',
      });
      mockDb.queryAll.mockResolvedValueOnce([
        {
          id: 'it-1',
          order_id: 'ord-1',
          course_id: 'c-1',
          price: 150000,
          created_at: '2026-09-04T00:00:00.000Z',
        },
      ]);

      mockEnrollmentsService.activateOrderEnrollments.mockResolvedValueOnce(1);

      const result = await service.activateOrder('admin-1', 'ord-1');

      expect(result.message).toBe('Enrollment berhasil diaktivasi.');
      expect(result.activatedCoursesCount).toBe(1);
      expect(
        mockEnrollmentsService.activateOrderEnrollments,
      ).toHaveBeenCalledWith('ord-1', 'user-1', ['c-1'], 'admin-1');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        'admin-1',
        'activate',
        'order',
        'ord-1',
        { activatedCoursesCount: 1 },
      );
    });

    it('should cancel a pending order and record the audit event', async () => {
      mockDb.queryOne.mockResolvedValueOnce({
        id: 'ord-1',
        user_id: 'user-1',
        status: 'pending',
        amount: 150000,
        notes: '',
        verified_by: null,
        verified_at: null,
        created_at: '2026-09-04T00:00:00.000Z',
        updated_at: '2026-09-04T00:00:00.000Z',
      });
      mockDb.queryAll.mockResolvedValueOnce([]);

      const result = await service.cancelOrder('admin-1', 'ord-1');

      expect(result.status).toBe('cancelled');
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE orders SET status = 'cancelled'"),
        [expect.any(String), 'ord-1'],
      );
      expect(mockAuditService.record).toHaveBeenCalledWith(
        'admin-1',
        'cancel',
        'order',
        'ord-1',
        { status: 'pending -> cancelled' },
      );
    });

    it('should reject cancellation unless the order is pending', async () => {
      mockDb.queryOne.mockResolvedValueOnce({ id: 'ord-1', status: 'paid' });

      await expect(service.cancelOrder('admin-1', 'ord-1')).rejects.toThrow(
        new BadRequestException(
          'Hanya order berstatus pending yang dapat dibatalkan.',
        ),
      );
      expect(mockAuditService.record).not.toHaveBeenCalled();
    });
  });
});
