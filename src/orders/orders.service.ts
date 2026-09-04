import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'node:crypto';
import { D1Service } from '../database/d1.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import type { OrderRow } from './interfaces/order.interface';
import type { OrderItemRow } from './interfaces/order-item.interface';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { SubmitPaymentProofDto } from './dto/submit-payment-proof.dto';
import {
  OrderActivationResponseDto,
  OrderResponseDto,
} from './dto/order-response.dto';
import { toOrderResponse } from './mappers/order.mapper';

@Injectable()
export class OrdersService {
  constructor(
    private readonly d1: D1Service,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  /**
   * User checkout: Creates an order with status 'pending' and inserts order_items.
   * Calculates total amount from official prices in the `courses` table (never trusts client amount).
   *
   * @param userId - UUID of the authenticated user
   * @param dto    - CreateOrderDto containing courseIds and optional notes
   */
  async checkout(userId: string, dto: CreateOrderDto): Promise<OrderResponseDto> {
    // 1. Defense-in-depth: Validate courseId uniqueness within this order
    const uniqueIds = new Set(dto.courseIds);
    if (uniqueIds.size !== dto.courseIds.length) {
      throw new BadRequestException(
        'Duplikasi courseId tidak diperbolehkan dalam satu order.',
      );
    }

    // 2. Fetch prices from courses table
    const placeholders = dto.courseIds.map(() => '?').join(', ');
    const coursesQuery = `SELECT id, price FROM courses WHERE id IN (${placeholders});`;
    const coursesResult = await this.d1.query<{ id: string; price: number }>(
      coursesQuery,
      dto.courseIds,
    );

    if (coursesResult.results.length !== dto.courseIds.length) {
      throw new BadRequestException('Satu atau lebih course tidak ditemukan.');
    }

    const courseMap = new Map<string, number>(
      coursesResult.results.map((c) => [c.id, c.price]),
    );

    // 3. Compute total amount from database prices
    let totalAmount = 0;
    for (const courseId of dto.courseIds) {
      const price = courseMap.get(courseId) ?? 0;
      totalAmount += price;
    }

    /**
     * OPEN DECISION:
     * Problem:
     * Schema tabel orders memiliki constraint `CHECK (amount > 0)`.
     * Jika terdapat course gratis (price = 0) dan totalAmount <= 0, query insert akan ditolak database.
     *
     * Existing Requirement:
     * Schema database memaksakan `amount > 0`.
     *
     * Options:
     * 1. Course gratis di masa depan langsung diproses via alur khusus (direct enrollment tanpa order).
     * 2. Schema orders diubah menjadi `CHECK (amount >= 0)` agar order gratis tetap tercatat untuk audit.
     * 3. V1 hanya mendukung course berbayar, course gratis belum tersedia.
     *
     * Owner:
     * Product Owner / Database Engineer
     *
     * Status:
     * OPEN
     */
    if (totalAmount <= 0) {
      throw new BadRequestException(
        'Total amount order harus lebih besar dari 0.',
      );
    }

    const orderId = crypto.randomUUID();
    const now = new Date().toISOString();
    const notes = dto.notes ?? '';

    // 4. Insert order row
    const insertOrderSql = `
      INSERT INTO orders (
        id, user_id, status, amount, notes, verified_by, verified_at, created_at, updated_at
      ) VALUES (?, ?, 'pending', ?, ?, NULL, NULL, ?, ?);
    `;

    await this.d1.query(insertOrderSql, [
      orderId,
      userId,
      totalAmount,
      notes,
      now,
      now,
    ]);

    // 5. Insert order_items
    const items: OrderItemRow[] = [];
    for (const courseId of dto.courseIds) {
      const itemId = crypto.randomUUID();
      const price = courseMap.get(courseId) ?? 0;

      const insertItemSql = `
        INSERT INTO order_items (id, order_id, course_id, price, created_at)
        VALUES (?, ?, ?, ?, ?);
      `;

      await this.d1.query(insertItemSql, [itemId, orderId, courseId, price, now]);

      items.push({
        id: itemId,
        order_id: orderId,
        course_id: courseId,
        price,
        created_at: now,
      });
    }

    const orderRow: OrderRow = {
      id: orderId,
      user_id: userId,
      status: 'pending',
      amount: totalAmount,
      notes,
      verified_by: null,
      verified_at: null,
      created_at: now,
      updated_at: now,
    };

    return toOrderResponse(orderRow, items);
  }

  /**
   * User: Submits transfer payment proof object key (Cloudflare R2 private).
   * Validates ownership to prevent IDOR attacks.
   * Updates order status from 'pending' to 'awaiting_verification'.
   */
  async submitPaymentProof(
    userId: string,
    orderId: string,
    dto: SubmitPaymentProofDto,
  ): Promise<{ message: string; proofId: string }> {
    const orderResult = await this.d1.query<OrderRow>(
      'SELECT id, user_id, status FROM orders WHERE id = ? LIMIT 1;',
      [orderId],
    );

    if (orderResult.results.length === 0) {
      throw new NotFoundException('Order tidak ditemukan.');
    }

    const order = orderResult.results[0];

    // IDOR Prevention: Check that the logged-in user owns this order
    if (order.user_id !== userId) {
      throw new ForbiddenException('Anda tidak memiliki akses ke order ini.');
    }

    // State validation
    if (order.status !== 'pending' && order.status !== 'awaiting_verification') {
      throw new BadRequestException(
        'Bukti pembayaran hanya dapat diunggah untuk order yang berstatus pending.',
      );
    }

    const proofId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Insert payment proof record
    const insertProofSql = `
      INSERT INTO payment_proofs (id, order_id, object_key, uploaded_by, uploaded_at)
      VALUES (?, ?, ?, ?, ?);
    `;
    await this.d1.query(insertProofSql, [
      proofId,
      orderId,
      dto.objectKey,
      userId,
      now,
    ]);

    // Update order status to 'awaiting_verification'
    const updateOrderSql = `
      UPDATE orders SET status = 'awaiting_verification', updated_at = ? WHERE id = ?;
    `;
    await this.d1.query(updateOrderSql, [now, orderId]);

    return {
      message: 'Bukti pembayaran berhasil diunggah.',
      proofId,
    };
  }

  /**
   * Admin-only: Verifies payment for an order.
   * Strict transition rule: ONLY allows orders currently in 'awaiting_verification'.
   * Sets status to 'paid', verified_by to admin user ID, and verified_at to current timestamp.
   */
  async verifyOrder(adminId: string, orderId: string): Promise<OrderResponseDto> {
    const orderResult = await this.d1.query<OrderRow>(
      'SELECT * FROM orders WHERE id = ? LIMIT 1;',
      [orderId],
    );

    if (orderResult.results.length === 0) {
      throw new NotFoundException('Order tidak ditemukan.');
    }

    const order = orderResult.results[0];

    // Strict status transition validations
    if (order.status === 'pending') {
      throw new BadRequestException('Order belum ada bukti pembayaran.');
    }

    if (order.status === 'paid') {
      throw new BadRequestException(
        'Order sudah diverifikasi dan berstatus paid.',
      );
    }

    if (order.status === 'cancelled') {
      throw new BadRequestException(
        'Order yang sudah dibatalkan tidak dapat diverifikasi.',
      );
    }

    if (order.status !== 'awaiting_verification') {
      throw new BadRequestException(
        'Hanya order berstatus awaiting_verification yang dapat diverifikasi.',
      );
    }

    const now = new Date().toISOString();

    await this.d1.query(
      `UPDATE orders SET status = 'paid', verified_by = ?, verified_at = ?, updated_at = ? WHERE id = ?;`,
      [adminId, now, now, orderId],
    );

    const itemsResult = await this.d1.query<OrderItemRow>(
      'SELECT * FROM order_items WHERE order_id = ?;',
      [orderId],
    );

    const updatedOrder: OrderRow = {
      ...order,
      status: 'paid',
      verified_by: adminId,
      verified_at: now,
      updated_at: now,
    };

    return toOrderResponse(updatedOrder, itemsResult.results);
  }

  /**
   * Admin-only: Activates course enrollments for all courses in a paid order.
   * Delegates idempotent creation to EnrollmentsService.
   */
  async activateOrder(
    adminId: string,
    orderId: string,
  ): Promise<OrderActivationResponseDto> {
    const orderResult = await this.d1.query<OrderRow>(
      'SELECT id, user_id, status FROM orders WHERE id = ? LIMIT 1;',
      [orderId],
    );

    if (orderResult.results.length === 0) {
      throw new NotFoundException('Order tidak ditemukan.');
    }

    const order = orderResult.results[0];

    if (order.status !== 'paid') {
      throw new BadRequestException(
        'Hanya order yang berstatus paid yang dapat diaktivasi.',
      );
    }

    const itemsResult = await this.d1.query<OrderItemRow>(
      'SELECT course_id FROM order_items WHERE order_id = ?;',
      [orderId],
    );

    if (itemsResult.results.length === 0) {
      throw new BadRequestException(
        'Order tidak memiliki item course untuk diaktivasi.',
      );
    }

    const courseIds = itemsResult.results.map((i) => i.course_id);

    const count = await this.enrollmentsService.activateOrderEnrollments(
      orderId,
      order.user_id,
      courseIds,
      adminId,
    );

    return new OrderActivationResponseDto({
      message: 'Enrollment berhasil diaktivasi.',
      orderId,
      activatedCoursesCount: count,
    });
  }
}
