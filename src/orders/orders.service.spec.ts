import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { D1Service } from '../database/d1.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import type { OrderRow } from './interfaces/order.interface';

describe('OrdersService', () => {
  let service: OrdersService;
  let mockD1Service: jest.Mocked<D1Service>;
  let mockEnrollmentsService: jest.Mocked<EnrollmentsService>;

  beforeEach(() => {
    mockD1Service = {
      query: jest.fn(),
    } as unknown as jest.Mocked<D1Service>;

    mockEnrollmentsService = {
      activateOrderEnrollments: jest.fn(),
      getUserEnrollments: jest.fn(),
      isUserEntitled: jest.fn(),
      revokeEnrollment: jest.fn(),
    } as unknown as jest.Mocked<EnrollmentsService>;

    service = new OrdersService(mockD1Service, mockEnrollmentsService);
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
      mockD1Service.query.mockResolvedValueOnce({
        results: [{ id: 'c-1', price: 100000 }],
        meta: {} as any,
      });

      await expect(
        service.checkout('user-1', {
          courseIds: ['c-1', 'c-2'],
        }),
      ).rejects.toThrow(
        new BadRequestException('Satu atau lebih course tidak ditemukan.'),
      );
    });

    it('should throw BadRequestException if total amount is zero or less', async () => {
      mockD1Service.query.mockResolvedValueOnce({
        results: [{ id: 'c-1', price: 0 }],
        meta: {} as any,
      });

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
      mockD1Service.query
        .mockResolvedValueOnce({
          results: [
            { id: 'c-1', price: 150000 },
            { id: 'c-2', price: 200000 },
          ],
          meta: {} as any,
        })
        // 2. insert order
        .mockResolvedValueOnce({ results: [], meta: {} as any })
        // 3. insert item 1
        .mockResolvedValueOnce({ results: [], meta: {} as any })
        // 4. insert item 2
        .mockResolvedValueOnce({ results: [], meta: {} as any });

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

      expect(mockD1Service.query).toHaveBeenCalledTimes(4);
    });
  });

  // ---------------------------------------------------------------------------
  // submitPaymentProof
  // ---------------------------------------------------------------------------
  describe('submitPaymentProof', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      mockD1Service.query.mockResolvedValueOnce({
        results: [],
        meta: {} as any,
      });

      await expect(
        service.submitPaymentProof('user-1', 'ord-1', {
          objectKey: 'proofs/ord-1.jpg',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if order belongs to another user (IDOR prevention)', async () => {
      const orderRow: Partial<OrderRow> = {
        id: 'ord-1',
        user_id: 'other-user',
        status: 'pending',
      };

      mockD1Service.query.mockResolvedValueOnce({
        results: [orderRow as OrderRow],
        meta: {} as any,
      });

      await expect(
        service.submitPaymentProof('user-1', 'ord-1', {
          objectKey: 'proofs/ord-1.jpg',
        }),
      ).rejects.toThrow(
        new ForbiddenException('Anda tidak memiliki akses ke order ini.'),
      );
    });

    it('should throw BadRequestException if order status is not pending or awaiting_verification', async () => {
      const orderRow: Partial<OrderRow> = {
        id: 'ord-1',
        user_id: 'user-1',
        status: 'paid',
      };

      mockD1Service.query.mockResolvedValueOnce({
        results: [orderRow as OrderRow],
        meta: {} as any,
      });

      await expect(
        service.submitPaymentProof('user-1', 'ord-1', {
          objectKey: 'proofs/ord-1.jpg',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should insert payment proof and update order status to awaiting_verification', async () => {
      const orderRow: Partial<OrderRow> = {
        id: 'ord-1',
        user_id: 'user-1',
        status: 'pending',
      };

      mockD1Service.query
        .mockResolvedValueOnce({
          results: [orderRow as OrderRow],
          meta: {} as any,
        })
        .mockResolvedValueOnce({ results: [], meta: {} as any })
        .mockResolvedValueOnce({ results: [], meta: {} as any });

      const result = await service.submitPaymentProof('user-1', 'ord-1', {
        objectKey: 'proofs/ord-1.jpg',
      });

      expect(result.message).toBe('Bukti pembayaran berhasil diunggah.');
      expect(result.proofId).toBeDefined();
      expect(mockD1Service.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining(
          "UPDATE orders SET status = 'awaiting_verification'",
        ),
        [expect.any(String), 'ord-1'],
      );
    });
  });

  // ---------------------------------------------------------------------------
  // verifyOrder
  // ---------------------------------------------------------------------------
  describe('verifyOrder', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      mockD1Service.query.mockResolvedValueOnce({
        results: [],
        meta: {} as any,
      });

      await expect(service.verifyOrder('admin-1', 'ord-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException("Order belum ada bukti pembayaran.") if order is pending', async () => {
      const orderRow: Partial<OrderRow> = {
        id: 'ord-1',
        status: 'pending',
      };

      mockD1Service.query.mockResolvedValueOnce({
        results: [orderRow as OrderRow],
        meta: {} as any,
      });

      await expect(service.verifyOrder('admin-1', 'ord-1')).rejects.toThrow(
        new BadRequestException('Order belum ada bukti pembayaran.'),
      );
    });

    it('should throw BadRequestException if order is already paid', async () => {
      const orderRow: Partial<OrderRow> = {
        id: 'ord-1',
        status: 'paid',
      };

      mockD1Service.query.mockResolvedValueOnce({
        results: [orderRow as OrderRow],
        meta: {} as any,
      });

      await expect(service.verifyOrder('admin-1', 'ord-1')).rejects.toThrow(
        new BadRequestException(
          'Order sudah diverifikasi dan berstatus paid.',
        ),
      );
    });

    it('should throw BadRequestException if order is cancelled', async () => {
      const orderRow: Partial<OrderRow> = {
        id: 'ord-1',
        status: 'cancelled',
      };

      mockD1Service.query.mockResolvedValueOnce({
        results: [orderRow as OrderRow],
        meta: {} as any,
      });

      await expect(service.verifyOrder('admin-1', 'ord-1')).rejects.toThrow(
        new BadRequestException(
          'Order yang sudah dibatalkan tidak dapat diverifikasi.',
        ),
      );
    });

    it('should update status to paid and record verified_by and verified_at for awaiting_verification order', async () => {
      const orderRow: OrderRow = {
        id: 'ord-1',
        user_id: 'user-1',
        status: 'awaiting_verification',
        amount: 150000,
        notes: '',
        verified_by: null,
        verified_at: null,
        created_at: '2026-09-04T00:00:00.000Z',
        updated_at: '2026-09-04T00:00:00.000Z',
      };

      mockD1Service.query
        .mockResolvedValueOnce({
          results: [orderRow],
          meta: {} as any,
        })
        .mockResolvedValueOnce({ results: [], meta: {} as any })
        .mockResolvedValueOnce({
          results: [
            {
              id: 'it-1',
              order_id: 'ord-1',
              course_id: 'c-1',
              price: 150000,
              created_at: '2026-09-04T00:00:00.000Z',
            },
          ],
          meta: {} as any,
        });

      const result = await service.verifyOrder('admin-1', 'ord-1');

      expect(result.status).toBe('paid');
      expect(result.verifiedAt).toBeDefined();
      expect(mockD1Service.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("UPDATE orders SET status = 'paid'"),
        ['admin-1', expect.any(String), expect.any(String), 'ord-1'],
      );
    });
  });

  // ---------------------------------------------------------------------------
  // activateOrder
  // ---------------------------------------------------------------------------
  describe('activateOrder', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      mockD1Service.query.mockResolvedValueOnce({
        results: [],
        meta: {} as any,
      });

      await expect(service.activateOrder('admin-1', 'ord-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if order status is not paid', async () => {
      const orderRow: Partial<OrderRow> = {
        id: 'ord-1',
        user_id: 'user-1',
        status: 'awaiting_verification',
      };

      mockD1Service.query.mockResolvedValueOnce({
        results: [orderRow as OrderRow],
        meta: {} as any,
      });

      await expect(service.activateOrder('admin-1', 'ord-1')).rejects.toThrow(
        new BadRequestException(
          'Hanya order yang berstatus paid yang dapat diaktivasi.',
        ),
      );
    });

    it('should delegate to enrollmentsService.activateOrderEnrollments for paid order', async () => {
      const orderRow: Partial<OrderRow> = {
        id: 'ord-1',
        user_id: 'user-1',
        status: 'paid',
      };

      mockD1Service.query
        .mockResolvedValueOnce({
          results: [orderRow as OrderRow],
          meta: {} as any,
        })
        .mockResolvedValueOnce({
          results: [
            {
              id: 'it-1',
              order_id: 'ord-1',
              course_id: 'c-1',
              price: 150000,
              created_at: '2026-09-04T00:00:00.000Z',
            },
          ],
          meta: {} as any,
        });

      mockEnrollmentsService.activateOrderEnrollments.mockResolvedValueOnce(1);

      const result = await service.activateOrder('admin-1', 'ord-1');

      expect(result.message).toBe('Enrollment berhasil diaktivasi.');
      expect(result.activatedCoursesCount).toBe(1);
      expect(
        mockEnrollmentsService.activateOrderEnrollments,
      ).toHaveBeenCalledWith('ord-1', 'user-1', ['c-1'], 'admin-1');
    });
  });
});
