import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { DatabaseService } from '../database/database.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { AuditService } from '../audit/audit.service';
import type { StoragePort } from '../media/storage.port';
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
  let mockStorage: {
    createUploadUrl: jest.Mock;
    createReadUrl: jest.Mock;
    confirmUpload: jest.Mock;
  };

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

    mockStorage = {
      createUploadUrl: jest.fn().mockResolvedValue('http://local-storage.test/upload/x'),
      createReadUrl: jest.fn(),
      confirmUpload: jest.fn(),
    };

    service = new OrdersService(
      mockDb as unknown as DatabaseService,
      mockEnrollmentsService,
      mockAuditService,
    );
    // B.3 mint needs the storage port; assigned via cast so the spec compiles
    // and runs (assertion-level RED) before the constructor accepts it.
    (service as unknown as { storage?: StoragePort }).storage =
      mockStorage as unknown as StoragePort;
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

      // Fixture updated for B.3: proof keys must be own-scope
      // private/users/{caller}/proofs/{uuid}.{ext}; the old admin-prefixed
      // 'private/courses/…' key is now rejected with 400.
      const result = await service.submitPaymentProof('user-1', 'ord-1', {
        objectKey:
          'private/users/user-1/proofs/2f1c9a44-77a5-4a1e-9d12-5f2a6b1c0d3e.png',
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

    it('should reject a legacy admin-prefixed course key with 400 (B.3: proof keys leave the admin prefix entirely)', async () => {
      pendingOwnOrder();

      await expect(
        service.submitPaymentProof('user-1', 'ord-1', {
          objectKey: 'private/courses/qa-t9-proof-B-1789276695.png',
        }),
      ).rejects.toThrow('objectKey bukti pembayaran tidak valid.');
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    // B.3 (BUG-T9-01 residual CLOSED): the cross-user reference within an
    // allowed prefix is now a 403 — proof keys must carry the caller's own
    // private/users/{caller}/proofs/ scope minted by paymentProofUrl.
    it('should reject another user\'s proof key with ForbiddenException (B.3 closes BUG-T9-01 residual)', async () => {
      pendingOwnOrder();

      await expect(
        service.submitPaymentProof('user-1', 'ord-1', {
          objectKey:
            'private/users/22222222-2222-4222-8222-222222222222/proofs/11111111-1111-4111-8111-111111111111.png',
        }),
      ).rejects.toThrow(
        new ForbiddenException('objectKey bukti pembayaran bukan milik Anda.'),
      );
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it('should reject a forged other-user proof prefix with ForbiddenException (B.3)', async () => {
      pendingOwnOrder();

      await expect(
        service.submitPaymentProof('user-1', 'ord-1', {
          objectKey:
            'private/users/9b2f8f9e-2c30-4c1a-8b3c-9c1f2f3f4f5f/proofs/33333333-3333-4333-8333-333333333333.webp',
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it('should reject a proof key with a non-uuid object segment with 400 (B.3 malformed shape)', async () => {
      pendingOwnOrder();

      await expect(
        service.submitPaymentProof('user-1', 'ord-1', {
          objectKey: 'private/users/user-1/proofs/not-a-uuid.png',
        }),
      ).rejects.toThrow('objectKey bukti pembayaran tidak valid.');
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it('should insert the proof when the caller submits their own minted proof key (B.3 happy path)', async () => {
      pendingOwnOrder();

      const result = await service.submitPaymentProof('user-1', 'ord-1', {
        objectKey:
          'private/users/user-1/proofs/4d8f3a21-56bc-4def-9a01-77e21c0b9f45.jpg',
      });

      expect(result.proofId).toBeDefined();
      expect(mockDb.execute).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // paymentProofUrl (B.3): student-owned upload surface. Mints
  // private/users/{caller}/proofs/{uuid}.{ext}, presigned PUT via the storage
  // port, and records an 'issued' media_objects row (migration 0008).
  // ---------------------------------------------------------------------------
  describe('paymentProofUrl', () => {
    async function paymentProofUrl(
      userId: string,
      orderId: string,
      dto: { contentType: string; size: number },
    ) {
      const fn = (
        service as unknown as {
          paymentProofUrl?: (
            u: string,
            o: string,
            d: { contentType: string; size: number },
          ) => Promise<{ key: string; uploadUrl: string; expiresIn: number }>;
        }
      ).paymentProofUrl;
      expect(typeof fn).toBe('function');
      return (
        service as unknown as {
          paymentProofUrl: (
            u: string,
            o: string,
            d: { contentType: string; size: number },
          ) => Promise<{ key: string; uploadUrl: string; expiresIn: number }>;
        }
      ).paymentProofUrl(userId, orderId, dto);
    }

    const ownPendingOrder = () =>
      mockDb.queryOne.mockResolvedValueOnce({
        id: 'ord-1',
        user_id: 'user-1',
        status: 'pending',
      });

    it('should mint an own-scope proof key with presigned PUT and record media_objects issued', async () => {
      ownPendingOrder();

      const res = await paymentProofUrl('user-1', 'ord-1', {
        contentType: 'image/png',
        size: 2048,
      });

      expect(res.key).toMatch(
        /^private\/users\/user-1\/proofs\/[a-f0-9-]{36}\.png$/,
      );
      expect(res.uploadUrl).toBe('http://local-storage.test/upload/x');
      expect(res.expiresIn).toBe(3600);
      expect(mockStorage.createUploadUrl).toHaveBeenCalledWith({
        key: res.key,
        contentType: 'image/png',
        contentLength: 2048,
      });

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
      const [insertSql, insertParams] = mockDb.execute.mock.calls[0];
      expect(insertSql).toContain('INSERT INTO media_objects');
      expect(insertParams).toEqual([
        expect.any(String),
        res.key,
        'user-1',
        'image/png',
        2048,
        'issued',
        expect.any(String),
      ]);
    });

    it('should derive the key extension from the declared contentType', async () => {
      ownPendingOrder();
      const res = await paymentProofUrl('user-1', 'ord-1', {
        contentType: 'application/pdf',
        size: 4096,
      });
      expect(res.key).toMatch(/\.pdf$/);
    });

    it('should throw NotFoundException for an unknown order', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(
        paymentProofUrl('user-1', 'ord-1', {
          contentType: 'image/png',
          size: 2048,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for another user\'s order', async () => {
      mockDb.queryOne.mockResolvedValueOnce({
        id: 'ord-1',
        user_id: 'other-user',
        status: 'pending',
      });

      await expect(
        paymentProofUrl('user-1', 'ord-1', {
          contentType: 'image/png',
          size: 2048,
        }),
      ).rejects.toThrow(
        new ForbiddenException('Anda tidak memiliki akses ke order ini.'),
      );
      expect(mockStorage.createUploadUrl).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when the order is not pending', async () => {
      mockDb.queryOne.mockResolvedValueOnce({
        id: 'ord-1',
        user_id: 'user-1',
        status: 'paid',
      });

      await expect(
        paymentProofUrl('user-1', 'ord-1', {
          contentType: 'image/png',
          size: 2048,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockStorage.createUploadUrl).not.toHaveBeenCalled();
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
