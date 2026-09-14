import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { AuditService } from '../audit/audit.service';
import { STORAGE_PORT, type StoragePort } from '../media/storage.port';
import type { OrderRow } from './interfaces/order.interface';
import type { OrderItemRow } from './interfaces/order-item.interface';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { SubmitPaymentProofDto } from './dto/submit-payment-proof.dto';
import type { PaymentProofUrlDto } from './dto/payment-proof-url.dto';
import {
  OrderActivationResponseDto,
  OrderResponseDto,
} from './dto/order-response.dto';
import { toOrderResponse } from './mappers/order.mapper';

@Injectable()
export class OrdersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly enrollmentsService: EnrollmentsService,
    private readonly audit: AuditService,
    @Inject(STORAGE_PORT) private readonly storage?: StoragePort,
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
    const coursesQuery = `SELECT id, price, status FROM courses WHERE id IN (${placeholders});`;
    const courses = await this.db.queryAll<{ id: string; price: number; status?: string }>(
      coursesQuery,
      dto.courseIds,
    );

    if (courses.length !== dto.courseIds.length) {
      throw new BadRequestException('Satu atau lebih course tidak ditemukan.');
    }

    // B.2: Course must be published. Non-published courses return 404 (draft is hidden from public view).
    const nonPublished = courses.some((c) => c.status && c.status !== 'published');
    if (nonPublished) {
      throw new NotFoundException('Course tidak ditemukan atau belum dipublikasikan.');
    }

    // B.2: Check if user already has an active enrollment for any of the courses.
    const activeEnrollment = await this.db.queryOne<{ id: string }>(
      `SELECT id FROM enrollments WHERE user_id = ? AND course_id IN (${placeholders}) AND status = 'active' LIMIT 1;`,
      [userId, ...dto.courseIds],
    );
    if (activeEnrollment && activeEnrollment.id) {
      throw new ConflictException('Anda sudah memiliki akses aktif ke course ini.');
    }

    const courseMap = new Map<string, number>(
      courses.map((c) => [c.id, c.price]),
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

    await this.db.execute(insertOrderSql, [
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

      await this.db.execute(insertItemSql, [
        itemId,
        orderId,
        courseId,
        price,
        now,
      ]);

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
   * User: Mints a presigned PUT URL for the payment proof of an OWN pending
   * order. The key scope is server-assigned from the JWT subject —
   * `private/users/{userId}/proofs/{uuid}.{ext}` — so a student can only ever
   * obtain keys inside their own prefix (B.3, closes the BUG-T9-01 residual).
   * The minted key is recorded in `media_objects` with status 'issued'
   * (migration 0008).
   */
  async paymentProofUrl(
    userId: string,
    orderId: string,
    dto: PaymentProofUrlDto,
  ): Promise<{ key: string; uploadUrl: string; expiresIn: number }> {
    const order = await this.db.queryOne<OrderRow>(
      'SELECT id, user_id, status FROM orders WHERE id = ? LIMIT 1;',
      [orderId],
    );

    if (!order) {
      throw new NotFoundException('Order tidak ditemukan.');
    }

    if (order.user_id !== userId) {
      throw new ForbiddenException('Anda tidak memiliki akses ke order ini.');
    }

    if (order.status !== 'pending') {
      throw new BadRequestException(
        'Bukti pembayaran hanya dapat diunggah untuk order yang berstatus pending.',
      );
    }

    if (!this.storage) {
      throw new Error('Storage provider is not configured.');
    }

    const extension = OrdersService.PROOF_EXTENSIONS[dto.contentType] ?? 'bin';
    const key = `private/users/${userId}/proofs/${crypto.randomUUID()}.${extension}`;
    const uploadUrl = await this.storage.createUploadUrl({
      key,
      contentType: dto.contentType,
      contentLength: dto.size,
    });

    const now = new Date().toISOString();
    await this.db.execute(
      'INSERT INTO media_objects (id, key, uploaded_by, content_type, size_bytes, status, created_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?);',
      [
        crypto.randomUUID(),
        key,
        userId,
        dto.contentType,
        dto.size,
        'issued',
        now,
      ],
    );

    return { key, uploadUrl, expiresIn: 3600 };
  }

  /**
   * User: Submits transfer payment proof object key (Cloudflare R2 private).
   * Validates ownership to prevent IDOR attacks.
   * Records the proof only — the order status stays 'pending' until an admin verifies it.
   */
  async submitPaymentProof(
    userId: string,
    orderId: string,
    dto: SubmitPaymentProofDto,
  ): Promise<{ message: string; proofId: string }> {
    const order = await this.db.queryOne<OrderRow>(
      'SELECT id, user_id, status FROM orders WHERE id = ? LIMIT 1;',
      [orderId],
    );

    if (!order) {
      throw new NotFoundException('Order tidak ditemukan.');
    }

    // IDOR Prevention: Check that the logged-in user owns this order
    if (order.user_id !== userId) {
      throw new ForbiddenException('Anda tidak memiliki akses ke order ini.');
    }

    // State validation: proofs only attach to orders still awaiting payment.
    if (order.status !== 'pending') {
      throw new BadRequestException(
        'Bukti pembayaran hanya dapat diunggah untuk order yang berstatus pending.',
      );
    }

    // BUG-T9-01 (B.3, residual CLOSED): proof keys must be the caller's own
    // server-minted private/users/{caller}/proofs/{uuid}.{ext} scope. Foreign
    // prefixes, traversal and malformed shapes are 400; a valid proof key
    // belonging to another user is 403. Admin-prefixed course keys can no
    // longer ride the proof path at all.
    this.assertOwnProofKey(dto.objectKey, userId);

    const proofId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Insert payment proof record — the order status remains 'pending'.
    const insertProofSql = `
      INSERT INTO payment_proofs (id, order_id, object_key, uploaded_by, uploaded_at)
      VALUES (?, ?, ?, ?, ?);
    `;
    await this.db.execute(insertProofSql, [
      proofId,
      orderId,
      dto.objectKey,
      userId,
      now,
    ]);

    return {
      message: 'Bukti pembayaran berhasil diunggah.',
      proofId,
    };
  }

  /**
   * Admin-only: Verifies payment for an order.
   * Strict transition rule: ONLY allows orders currently in 'pending' to move to 'paid'.
   * Sets status to 'paid', verified_by to admin user ID, and verified_at to current timestamp.
   */
  async verifyOrder(adminId: string, orderId: string): Promise<OrderResponseDto> {
    const order = await this.db.queryOne<OrderRow>(
      'SELECT * FROM orders WHERE id = ? LIMIT 1;',
      [orderId],
    );

    if (!order) {
      throw new NotFoundException('Order tidak ditemukan.');
    }

    // Strict status transition validations
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

    if (order.status !== 'pending') {
      // Defense-in-depth for rows written before the order-status
      // reconciliation (unknown/legacy status values).
      throw new BadRequestException(
        'Hanya order berstatus pending yang dapat diverifikasi.',
      );
    }

    const now = new Date().toISOString();

    await this.db.execute(
      `UPDATE orders SET status = 'paid', verified_by = ?, verified_at = ?, updated_at = ? WHERE id = ?;`,
      [adminId, now, now, orderId],
    );

    const items = await this.db.queryAll<OrderItemRow>(
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

    await this.audit.record(adminId, 'verify', 'order', orderId, {
      status: 'pending -> paid',
    });

    return toOrderResponse(updatedOrder, items);
  }

  /**
   * Admin-only: Activates course enrollments for all courses in a paid order.
   * Delegates idempotent creation to EnrollmentsService.
   */
  async activateOrder(
    adminId: string,
    orderId: string,
  ): Promise<OrderActivationResponseDto> {
    const order = await this.db.queryOne<OrderRow>(
      'SELECT id, user_id, status FROM orders WHERE id = ? LIMIT 1;',
      [orderId],
    );

    if (!order) {
      throw new NotFoundException('Order tidak ditemukan.');
    }

    if (order.status !== 'paid') {
      throw new BadRequestException(
        'Hanya order yang berstatus paid yang dapat diaktivasi.',
      );
    }

    const items = await this.db.queryAll<{ course_id: string }>(
      'SELECT course_id FROM order_items WHERE order_id = ?;',
      [orderId],
    );

    if (items.length === 0) {
      throw new BadRequestException(
        'Order tidak memiliki item course untuk diaktivasi.',
      );
    }

    const courseIds = items.map((i) => i.course_id);

    const count = await this.enrollmentsService.activateOrderEnrollments(
      orderId,
      order.user_id,
      courseIds,
      adminId,
    );

    await this.audit.record(adminId, 'activate', 'order', orderId, {
      activatedCoursesCount: count,
    });

    return new OrderActivationResponseDto({
      message: 'Enrollment berhasil diaktivasi.',
      orderId,
      activatedCoursesCount: count,
    });
  }

  async cancelOrder(adminId: string, orderId: string): Promise<OrderResponseDto> {
    const order = await this.db.queryOne<OrderRow>(
      'SELECT * FROM orders WHERE id = ? LIMIT 1;',
      [orderId],
    );

    if (!order) {
      throw new NotFoundException('Order tidak ditemukan.');
    }

    if (order.status !== 'pending') {
      throw new BadRequestException(
        'Hanya order berstatus pending yang dapat dibatalkan.',
      );
    }

    const now = new Date().toISOString();
    await this.db.execute(
      `UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = ?;`,
      [now, orderId],
    );

    const items = await this.db.queryAll<OrderItemRow>(
      'SELECT * FROM order_items WHERE order_id = ?;',
      [orderId],
    );

    await this.audit.record(adminId, 'cancel', 'order', orderId, {
      status: 'pending -> cancelled',
    });

    return toOrderResponse(
      { ...order, status: 'cancelled', updated_at: now },
      items,
    );
  }

  /** Key extension derived from the declared proof MIME type. */
  private static readonly PROOF_EXTENSIONS: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
    'video/mp4': 'mp4',
  };

  /**
   * Server-side validation of a client-supplied payment-proof object key
   * (B.3, closing the BUG-T9-01 residual). The key must be the exact shape
   * `private/users/{caller}/proofs/{uuid}.{ext}` minted by paymentProofUrl:
   * traversal (any iterative-decode form), backslashes, foreign prefixes and
   * malformed shapes are 400; a valid proof key whose owner segment is not
   * the caller is 403.
   */
  private assertOwnProofKey(objectKey: string, userId: string): void {
    const forms = [objectKey];
    let current = objectKey;
    for (let depth = 0; depth < 2; depth++) {
      try {
        const decoded = decodeURIComponent(current);
        if (decoded === current) break;
        current = decoded;
        forms.push(current);
      } catch {
        break;
      }
    }

    const escaped = forms.some(
      (form) => form.includes('..') || form.includes('\\'),
    );
    // Owner is compared strictly against the JWT subject below; the segment
    // pattern is intentionally permissive so a well-shaped foreign-owner key
    // yields 403 (cross-user) instead of 400 (malformed).
    const shape = escaped
      ? null
      : /^private\/users\/([^/]+)\/proofs\/[a-f0-9-]{36}\.[a-z0-9]+$/.exec(
          objectKey,
        );

    if (escaped || !shape) {
      throw new BadRequestException(
        'objectKey bukti pembayaran tidak valid.',
      );
    }

    if (shape[1] !== userId) {
      throw new ForbiddenException(
        'objectKey bukti pembayaran bukan milik Anda.',
      );
    }
  }
}
