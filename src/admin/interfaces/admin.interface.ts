/**
 * Internal DB row shapes for the admin module. These mirror the SQLite
 * migrations (SCHEMA.md V2) plus the computed aliases produced by the admin
 * queries — they never leave the service layer (mappers write the DTOs).
 */
export type AdminRole = 'user' | 'admin';
export type AdminOrderStatus = 'pending' | 'paid' | 'cancelled';
export type AdminEnrollmentStatus = 'active' | 'revoked';
/** Derived presentation value (SCHEMA.md §82-83) — never a stored column. */
export type AdminActivationStatus = 'active' | 'not_active';

/** Row of `GET /admin/users` (users LEFT JOIN enrollments, GROUP BY u.id). */
export interface AdminUserRow {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  status: string | null;
  created_at: string | null;
  enrollment_count: number;
}

/** Row of the user lookup inside `GET /admin/users/:id`. */
export interface AdminUserDetailRow {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  status: string | null;
  created_at: string | null;
}

/** Enrollments of one user (enrollments JOIN courses). */
export interface AdminUserEnrollmentRow {
  id: string;
  course_id: string;
  status: string;
  granted_at: string | null;
  course_title: string | null;
  course_slug: string | null;
}

/** Orders of one user (safe columns only). */
export interface AdminUserOrderRow {
  id: string;
  status: string;
  amount: number;
  created_at: string | null;
}

/**
 * Row of `GET /admin/orders` — orders JOIN users, LEFT JOIN order_items/
 * courses/enrollments/granting admin, GROUP BY o.id. `course_titles` and
 * `granted_by_names` are char(31)-separated aggregates split by the mapper.
 */
export interface AdminOrderRow {
  id: string;
  status: string;
  amount: number;
  created_at: string | null;
  updated_at: string | null;
  user_id: string;
  user_name: string | null;
  user_email: string;
  user_phone: string | null;
  course_titles: string | null;
  has_active_enrollment: number;
  granted_by_names: string | null;
  granted_at: string | null;
}

/** Shared DL-011 list envelope: {items, page, limit, total}. */
export interface AdminPaginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}
