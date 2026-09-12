import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type {
  AdminOrderRow,
  AdminPaginated,
  AdminUserDetailRow,
  AdminUserEnrollmentRow,
  AdminUserOrderRow,
  AdminUserRow,
} from './interfaces/admin.interface';
import type { ListAdminOrdersQueryDto, ListAdminUsersQueryDto } from './dto/list-query.dto';
import { AdminUserDetailDto, AdminUserDto } from './dto/admin-user.dto';
import { AdminOrderDto } from './dto/admin-order.dto';
import { AdminOverviewDto } from './dto/overview.dto';
import { toAdminOrderDto, toAdminUserDetailDto, toAdminUserDto } from './mappers/admin.mapper';

/** DL-011 pagination contract: ?limit= defaults to 20, maximum 100. */
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Admin operational reads over users/orders/enrollments (plan T12, PRD
 * §43-45, HANDBOOK §5.4). Strictly read-only — mutations (verify/activate/
 * revoke/cancel) belong to the orders/enrollments flows (plan T15); delete
 * and role-change have no endpoint in V1 (decision log DL-005). Every query
 * uses bind parameters (HANDBOOK §7).
 */
@Injectable()
export class AdminService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Paginated user list with per-user enrollment counts. One grouped query
   * (LEFT JOIN + GROUP BY) plus one count — no N+1. `?q=` is a contains-
   * search over email/name with escaped LIKE wildcards.
   */
  async listUsers(query: ListAdminUsersQueryDto): Promise<AdminPaginated<AdminUserDto>> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    if (query.q) {
      const pattern = `%${escapeLike(query.q)}%`;
      conditions.push(`(u.email LIKE ? ESCAPE '\\' OR u.name LIKE ? ESCAPE '\\')`);
      params.push(pattern, pattern);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await this.db.queryAll<AdminUserRow>(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.created_at, ` +
        `COUNT(e.id) AS enrollment_count ` +
        `FROM users u LEFT JOIN enrollments e ON e.user_id = u.id ` +
        `${where} ` +
        `GROUP BY u.id ORDER BY u.created_at DESC, u.id DESC LIMIT ? OFFSET ?;`,
      [...params, limit, offset],
    );
    const countRow = await this.db.queryOne<{ total: number }>(
      `SELECT COUNT(*) AS total FROM users u ${where};`,
      params,
    );

    return {
      items: rows.map(toAdminUserDto),
      page,
      limit,
      total: countRow?.total ?? 0,
    };
  }

  /**
   * User detail with activation history (enrollments) and course ownership
   * (orders). Three indexed single-purpose queries — no N+1 loops. The user
   * row is selected column-by-column so `password_hash` can never leak.
   */
  async getUserDetail(id: string): Promise<AdminUserDetailDto> {
    const user = await this.db.queryOne<AdminUserDetailRow>(
      `SELECT id, name, email, phone, role, status, created_at ` +
        `FROM users WHERE id = ? LIMIT 1;`,
      [id],
    );
    if (!user) {
      throw new NotFoundException('User tidak ditemukan.');
    }

    const enrollments = await this.db.queryAll<AdminUserEnrollmentRow>(
      `SELECT e.id, e.course_id, e.status, e.granted_at, ` +
        `c.title AS course_title, c.slug AS course_slug ` +
        `FROM enrollments e JOIN courses c ON c.id = e.course_id ` +
        `WHERE e.user_id = ? ORDER BY e.granted_at DESC, e.id DESC;`,
      [id],
    );
    const orders = await this.db.queryAll<AdminUserOrderRow>(
      `SELECT id, status, amount, created_at FROM orders ` +
        `WHERE user_id = ? ORDER BY created_at DESC, id DESC;`,
      [id],
    );

    return toAdminUserDetailDto(user, enrollments, orders);
  }

  /**
   * Paginated order list with the PRD §45 columns. One grouped query joins
   * users (buyer identity), order_items/courses (titles), and enrollments
   * (derived activation via LEFT JOIN on user+course, SCHEMA.md §82-83) —
   * no N+1 and no stored activation column. `?status=` filters the final
   * order status; `?q=` contains-searches the buyer email.
   */
  async listOrders(query: ListAdminOrdersQueryDto): Promise<AdminPaginated<AdminOrderDto>> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    if (query.status) {
      conditions.push('o.status = ?');
      params.push(query.status);
    }
    if (query.q) {
      conditions.push(`u.email LIKE ? ESCAPE '\\'`);
      params.push(`%${escapeLike(query.q)}%`);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await this.db.queryAll<AdminOrderRow>(
      `SELECT o.id, o.status, o.amount, o.created_at, o.updated_at, ` +
        `u.id AS user_id, u.name AS user_name, u.email AS user_email, u.phone AS user_phone, ` +
        `GROUP_CONCAT(c.title, char(31)) AS course_titles, ` +
        `MAX(CASE WHEN e.status = 'active' THEN 1 ELSE 0 END) AS has_active_enrollment, ` +
        `GROUP_CONCAT(gu.name, char(31)) AS granted_by_names, ` +
        `MIN(e.granted_at) AS granted_at ` +
        `FROM orders o ` +
        `JOIN users u ON u.id = o.user_id ` +
        `LEFT JOIN order_items oi ON oi.order_id = o.id ` +
        `LEFT JOIN courses c ON c.id = oi.course_id ` +
        `LEFT JOIN enrollments e ON e.user_id = o.user_id AND e.course_id = oi.course_id ` +
        `LEFT JOIN users gu ON gu.id = e.granted_by ` +
        `${where} ` +
        `GROUP BY o.id ORDER BY o.created_at DESC, o.id DESC LIMIT ? OFFSET ?;`,
      [...params, limit, offset],
    );
    const countRow = await this.db.queryOne<{ total: number }>(
      `SELECT COUNT(*) AS total FROM orders o JOIN users u ON u.id = o.user_id ${where};`,
      params,
    );

    return {
      items: rows.map(toAdminOrderDto),
      page,
      limit,
      total: countRow?.total ?? 0,
    };
  }

  /**
   * Dashboard counters (HANDBOOK §5.4): three independent COUNT queries run
   * in parallel. userCount follows the handbook's `role = 'user'` scope.
   */
  async getOverview(): Promise<AdminOverviewDto> {
    const [userCount, pendingOrders, activeEnrollments] = await Promise.all([
      this.db.queryOne<{ count: number }>(
        `SELECT COUNT(*) AS count FROM users WHERE role = 'user';`,
      ),
      this.db.queryOne<{ count: number }>(
        `SELECT COUNT(*) AS count FROM orders WHERE status = 'pending';`,
      ),
      this.db.queryOne<{ count: number }>(
        `SELECT COUNT(*) AS count FROM enrollments WHERE status = 'active';`,
      ),
    ]);

    return new AdminOverviewDto({
      userCount: userCount?.count ?? 0,
      pendingOrders: pendingOrders?.count ?? 0,
      activeEnrollments: activeEnrollments?.count ?? 0,
    });
  }
}

/**
 * Escape LIKE wildcards so a visitor/admin query matches literally, then the
 * caller wraps with % for contains semantics (same rule as CoursesService).
 */
function escapeLike(term: string): string {
  return term.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}
