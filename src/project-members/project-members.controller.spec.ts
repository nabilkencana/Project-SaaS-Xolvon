import { ProjectMembersController } from './project-members.controller';
import { ProjectMembersService } from './project-members.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

describe('ProjectMembersController', () => {
  let controller: ProjectMembersController;
  let mockService: jest.Mocked<ProjectMembersService>;

  beforeEach(() => {
    mockService = {
      assignMember: jest.fn(),
      removeMember: jest.fn(),
    } as unknown as jest.Mocked<ProjectMembersService>;

    controller = new ProjectMembersController(mockService);
  });

  // Nest decorators store method-level metadata on descriptor.value (the
  // handler function itself), so read from the function first.
  function handlerGuards(name: keyof ProjectMembersController): unknown[] {
    const handler = ProjectMembersController.prototype[name] as object;
    return Reflect.getMetadata('__guards__', handler) ?? [];
  }

  function handlerRoles(name: keyof ProjectMembersController): string[] {
    const handler = ProjectMembersController.prototype[name] as object;
    return Reflect.getMetadata(ROLES_KEY, handler) ?? [];
  }

  it('delegates assignMember with the acting admin id', async () => {
    const assigned = { projectId: 'project-1', memberId: 'member-1', role: 'BE' };
    mockService.assignMember.mockResolvedValueOnce(assigned);

    const dto = { memberId: 'member-1', role: 'BE' };
    const result = await controller.assignMember('admin-1', 'project-1', dto);

    expect(result).toBe(assigned);
    expect(mockService.assignMember).toHaveBeenCalledWith('admin-1', 'project-1', dto);
  });

  it('delegates removeMember with the acting admin id', async () => {
    mockService.removeMember.mockResolvedValueOnce({ message: 'Project member removed.' });

    const result = await controller.removeMember('admin-1', 'project-1', 'member-1');

    expect(result).toEqual({ message: 'Project member removed.' });
    expect(mockService.removeMember).toHaveBeenCalledWith('admin-1', 'project-1', 'member-1');
  });

  it('protects both handlers with AuthGuard + RolesGuard + admin role', () => {
    for (const handler of ['assignMember', 'removeMember'] as const) {
      const guards = handlerGuards(handler);
      expect(guards).toContain(AuthGuard);
      expect(guards).toContain(RolesGuard);
      expect(handlerRoles(handler)).toEqual(['admin']);
    }
  });
});
