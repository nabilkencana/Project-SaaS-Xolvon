import {
  AdminOrderDto,
  AdminOrderUserDto,
} from '../dto/admin-order.dto';
import {
  AdminUserDetailDto,
  AdminUserDto,
  AdminUserEnrollmentDto,
  AdminUserOrderDto,
} from '../dto/admin-user.dto';
import type {
  AdminOrderRow,
  AdminUserDetailRow,
  AdminUserEnrollmentRow,
  AdminUserOrderRow,
  AdminUserRow,
} from '../interfaces/admin.interface';

/**
 * GROUP_CONCAT separator emitted by the admin order SQL (`char(31)` — the
 * ASCII unit separator). A control character that cannot appear in typed
 * titles, so splitting never corrupts course titles that contain commas.
 */
export const GROUP_CONCAT_SEPARATOR = String.fromCharCode(31);

/** Split a char(31)-separated aggregate into a deduplicated list. */
function splitAggregate(value: string | null): string[] {
  if (!value) {
    return [];
  }
  return [...new Set(value.split(GROUP_CONCAT_SEPARATOR).filter((part) => part.length > 0))];
}

/** Row → admin user DTO. The only writer of the SCHEMA.md §81 contract. */
export function toAdminUserDto(row: AdminUserRow): AdminUserDto {
  return new AdminUserDto({
    id: row.id,
    name: row.name ?? null,
    email: row.email,
    phone: row.phone ?? null,
    role: row.role as AdminUserDto['role'],
    status: row.status ?? null,
    createdAt: row.created_at ?? null,
    enrollmentCount: row.enrollment_count ?? 0,
  });
}

/** Enrollments JOIN courses row → safe enrollment DTO (title/slug only). */
export function toAdminUserEnrollmentDto(
  row: AdminUserEnrollmentRow,
): AdminUserEnrollmentDto {
  return new AdminUserEnrollmentDto({
    id: row.id,
    courseId: row.course_id,
    courseTitle: row.course_title ?? null,
    courseSlug: row.course_slug ?? null,
    status: row.status as AdminUserEnrollmentDto['status'],
    grantedAt: row.granted_at ?? null,
  });
}

export function toAdminUserOrderDto(row: AdminUserOrderRow): AdminUserOrderDto {
  return new AdminUserOrderDto({
    id: row.id,
    status: row.status as AdminUserOrderDto['status'],
    amount: row.amount,
    createdAt: row.created_at ?? null,
  });
}

/** User detail row + child lists → the `GET /admin/users/:id` response. */
export function toAdminUserDetailDto(
  row: AdminUserDetailRow,
  enrollments: AdminUserEnrollmentRow[],
  orders: AdminUserOrderRow[],
): AdminUserDetailDto {
  return new AdminUserDetailDto({
    id: row.id,
    name: row.name ?? null,
    email: row.email,
    phone: row.phone ?? null,
    role: row.role as AdminUserDetailDto['role'],
    status: row.status ?? null,
    createdAt: row.created_at ?? null,
    enrollments: enrollments.map(toAdminUserEnrollmentDto),
    orders: orders.map(toAdminUserOrderDto),
  });
}

/**
 * Grouped order row → the PRD §45 / SCHEMA.md §82 contract. `activationStatus`
 * is presentation-level derived data (SCHEMA.md §83): the SQL computes
 * `has_active_enrollment` via LEFT JOIN on enrollments — it is never read
 * from or written to a stored column.
 */
export function toAdminOrderDto(row: AdminOrderRow): AdminOrderDto {
  return new AdminOrderDto({
    id: row.id,
    user: new AdminOrderUserDto({
      id: row.user_id,
      name: row.user_name ?? null,
      email: row.user_email,
      phone: row.user_phone ?? null,
    }),
    courseTitles: splitAggregate(row.course_titles),
    amount: row.amount,
    status: row.status as AdminOrderDto['status'],
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    activationStatus: row.has_active_enrollment === 1 ? 'active' : 'not_active',
    grantedBy: row.granted_by_names
      ? [...new Set(row.granted_by_names.split(GROUP_CONCAT_SEPARATOR))]
          .filter((name) => name.length > 0)
          .join(', ')
      : null,
    grantedAt: row.granted_at ?? null,
  });
}
