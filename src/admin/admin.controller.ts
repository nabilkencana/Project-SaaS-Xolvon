import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminService } from './admin.service';
// Value import (not `import type`): the ValidationPipe reads the parameter's
// runtime class from design:paramtypes metadata — a type-only import erases
// it and silently disables query validation.
import { ListAdminOrdersQueryDto, ListAdminUsersQueryDto } from './dto/list-query.dto';
import type { AdminUserDetailDto, AdminUserDto } from './dto/admin-user.dto';
import type { AdminOrderDto } from './dto/admin-order.dto';
import type { AdminOverviewDto } from './dto/overview.dto';

/**
 * Admin operational reads (plan T12, PRD §43-45). Guards and the admin role
 * are applied at the CLASS level so every `/admin/*` route is protected —
 * the FE route `/67` is pure frontend routing and the backend rejects
 * non-admins on every admin path server-side (HANDBOOK §7). Read-only by
 * contract: mutations live in the orders/enrollments flows (plan T15).
 */
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /** Paginated user list (`?q=` on email/name, DL-011 pagination). */
  @Get('users')
  async listUsers(@Query() query: ListAdminUsersQueryDto): Promise<{
    items: AdminUserDto[];
    page: number;
    limit: number;
    total: number;
  }> {
    return this.adminService.listUsers(query);
  }

  /** User detail with enrollments and orders (PRD §44). */
  @Get('users/:id')
  async getUserDetail(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<AdminUserDetailDto> {
    return this.adminService.getUserDetail(id);
  }

  /** Paginated order list with PRD §45 columns (`?status=`, `?q=` on email). */
  @Get('orders')
  async listOrders(@Query() query: ListAdminOrdersQueryDto): Promise<{
    items: AdminOrderDto[];
    page: number;
    limit: number;
    total: number;
  }> {
    return this.adminService.listOrders(query);
  }

  /** Dashboard counters (HANDBOOK §5.4). */
  @Get('overview')
  async getOverview(): Promise<AdminOverviewDto> {
    return this.adminService.getOverview();
  }
}
