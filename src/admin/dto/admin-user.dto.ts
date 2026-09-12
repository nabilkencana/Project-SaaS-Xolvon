import type {
  AdminEnrollmentStatus,
  AdminOrderStatus,
  AdminRole,
} from '../interfaces/admin.interface';

/**
 * Admin user row (SCHEMA.md §81 AdminUserDTO + status/enrollmentCount per
 * plan T12). Mappers are the only writers — `password_hash` NEVER reaches
 * this DTO (SCHEMA.md §81: NEVER, HANDBOOK §7).
 */
export class AdminUserDto {
  readonly id: string;
  readonly name: string | null;
  readonly email: string;
  readonly phone: string | null;
  readonly role: AdminRole;
  readonly status: string | null;
  readonly createdAt: string | null;
  readonly enrollmentCount: number;

  constructor(partial: Partial<AdminUserDto>) {
    Object.assign(this, partial);
  }
}

/** One enrollment of a user inside the admin user detail (PRD §44). */
export class AdminUserEnrollmentDto {
  readonly id: string;
  readonly courseId: string;
  readonly courseTitle: string | null;
  readonly courseSlug: string | null;
  readonly status: AdminEnrollmentStatus;
  readonly grantedAt: string | null;

  constructor(partial: Partial<AdminUserEnrollmentDto>) {
    Object.assign(this, partial);
  }
}

/** One order of a user inside the admin user detail (safe columns only). */
export class AdminUserOrderDto {
  readonly id: string;
  readonly status: AdminOrderStatus;
  readonly amount: number;
  readonly createdAt: string | null;

  constructor(partial: Partial<AdminUserOrderDto>) {
    Object.assign(this, partial);
  }
}

/** `GET /admin/users/:id` — user + activation history + course ownership. */
export class AdminUserDetailDto {
  readonly id: string;
  readonly name: string | null;
  readonly email: string;
  readonly phone: string | null;
  readonly role: AdminRole;
  readonly status: string | null;
  readonly createdAt: string | null;
  readonly enrollments: AdminUserEnrollmentDto[];
  readonly orders: AdminUserOrderDto[];

  constructor(partial: Partial<AdminUserDetailDto>) {
    Object.assign(this, partial);
    // Array fields re-initialize after Object.assign via their declarations
    // in some transpile targets, so assign them explicitly (same guard as
    // CourseDetailDto).
    this.enrollments = partial.enrollments ?? [];
    this.orders = partial.orders ?? [];
  }
}
