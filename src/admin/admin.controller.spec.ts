import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import type { AdminOverviewDto } from './dto/overview.dto';
import type { AdminUserDetailDto } from './dto/admin-user.dto';

describe('AdminController', () => {
  let controller: AdminController;
  let mockService: jest.Mocked<AdminService>;

  beforeEach(() => {
    mockService = {
      listUsers: jest.fn(),
      getUserDetail: jest.fn(),
      listOrders: jest.fn(),
      getOverview: jest.fn(),
    } as unknown as jest.Mocked<AdminService>;

    controller = new AdminController(mockService);
  });

  it('delegates listUsers to the service', async () => {
    const response = { items: [], page: 1, limit: 20, total: 0 };
    mockService.listUsers.mockResolvedValueOnce(response);

    const query = { page: 2, limit: 10, q: 'video' };
    const result = await controller.listUsers(query);

    expect(result).toBe(response);
    expect(mockService.listUsers).toHaveBeenCalledWith(query);
  });

  it('delegates getUserDetail to the service', async () => {
    const detail = { id: 'user-uuid-1', enrollments: [], orders: [] } as AdminUserDetailDto;
    mockService.getUserDetail.mockResolvedValueOnce(detail);

    const result = await controller.getUserDetail('user-uuid-1');

    expect(result).toBe(detail);
    expect(mockService.getUserDetail).toHaveBeenCalledWith('user-uuid-1');
  });

  it('delegates listOrders to the service', async () => {
    const response = { items: [], page: 1, limit: 20, total: 0 };
    mockService.listOrders.mockResolvedValueOnce(response);

    const query = { status: 'paid' as const, page: 1, limit: 20 };
    const result = await controller.listOrders(query);

    expect(result).toBe(response);
    expect(mockService.listOrders).toHaveBeenCalledWith(query);
  });

  it('delegates getOverview to the service', async () => {
    const overview: AdminOverviewDto = {
      userCount: 7,
      pendingOrders: 3,
      activeEnrollments: 5,
    };
    mockService.getOverview.mockResolvedValueOnce(overview);

    const result = await controller.getOverview();

    expect(result).toBe(overview);
  });

  describe('guard wiring — class-level admin-only protection on EVERY route', () => {
    it('applies AuthGuard + RolesGuard + @Roles(admin) at the class level', () => {
      const classGuards = Reflect.getMetadata('__guards__', AdminController) ?? [];
      expect(classGuards).toContain(AuthGuard);
      expect(classGuards).toContain(RolesGuard);
      expect(Reflect.getMetadata(ROLES_KEY, AdminController)).toEqual(['admin']);
    });

    it('leaves no @Public escape hatch and no per-handler role override on any handler', () => {
      const handlers = ['listUsers', 'getUserDetail', 'listOrders', 'getOverview'] as const;
      for (const handlerName of handlers) {
        const handler = AdminController.prototype[handlerName] as object;
        expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
        // Roles live at class level only — no handler may override them away.
        expect(Reflect.getMetadata(ROLES_KEY, handler)).toBeUndefined();
      }
    });
  });
});
