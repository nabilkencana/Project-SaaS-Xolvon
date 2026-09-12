import type {
  AdminActivationStatus,
  AdminOrderStatus,
} from '../interfaces/admin.interface';

/** Buyer identity nested on each admin order row (PRD §45 User/Email/Phone). */
export class AdminOrderUserDto {
  readonly id: string;
  readonly name: string | null;
  readonly email: string;
  readonly phone: string | null;

  constructor(partial: Partial<AdminOrderUserDto>) {
    Object.assign(this, partial);
  }
}

/**
 * Admin order row (SCHEMA.md §82 AdminOrderDTO adapted to PRD §45 columns).
 * `courseTitles` aggregates the titles of the order's order_items — orders
 * can contain several courses, so the singular `course` of §82 is expressed
 * as an array (presentation-level, derived in SQL, not a stored field).
 * `activationStatus` is derived (SCHEMA.md §82-83): any active enrollment for
 * the order's user+course pair → 'active', else 'not_active'. The WhatsApp/
 * proof reference is intentionally absent — payment_proofs rows are the
 * reference (decision log DL-006/DL-015).
 */
export class AdminOrderDto {
  readonly id: string;
  readonly user: AdminOrderUserDto;
  readonly courseTitles: string[];
  readonly amount: number;
  readonly status: AdminOrderStatus;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
  readonly activationStatus: AdminActivationStatus;
  readonly grantedBy: string | null;
  readonly grantedAt: string | null;

  constructor(partial: Partial<AdminOrderDto>) {
    Object.assign(this, partial);
    this.courseTitles = partial.courseTitles ?? [];
    this.user = partial.user as AdminOrderUserDto;
  }
}
