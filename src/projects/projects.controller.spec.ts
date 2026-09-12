import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { ProjectDetailDto, ProjectMediaPublicDto, ProjectMemberDto } from './dto/project-detail.dto';
import { ProjectResponseDto } from './dto/project-response.dto';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let mockService: jest.Mocked<ProjectsService>;

  beforeEach(() => {
    mockService = {
      listPublished: jest.fn(),
      getPublishedDetailBySlug: jest.fn(),
      createProject: jest.fn(),
      updateProject: jest.fn(),
      publishProject: jest.fn(),
      unpublishProject: jest.fn(),
    } as unknown as jest.Mocked<ProjectsService>;

    controller = new ProjectsController(mockService);
  });

  // Nest decorators store method-level metadata on descriptor.value (the
  // handler function itself), so read from the function first.
  function handlerGuards(name: keyof ProjectsController): unknown[] {
    const handler = ProjectsController.prototype[name] as object;
    return Reflect.getMetadata('__guards__', handler) ?? [];
  }

  function handlerRoles(name: keyof ProjectsController): string[] {
    const handler = ProjectsController.prototype[name] as object;
    return Reflect.getMetadata(ROLES_KEY, handler) ?? [];
  }

  function handlerIsPublic(name: keyof ProjectsController): boolean {
    const handler = ProjectsController.prototype[name] as object;
    return Reflect.getMetadata(IS_PUBLIC_KEY, handler) === true;
  }

  it('delegates listPublished to the service', async () => {
    const response = { items: [], page: 1, limit: 20, total: 0 };
    mockService.listPublished.mockResolvedValueOnce(response);

    const result = await controller.listPublished({ page: 2, limit: 10, q: 'dashboard' });

    expect(result).toBe(response);
    expect(mockService.listPublished).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      q: 'dashboard',
    });
  });

  it('delegates getPublishedDetailBySlug to the service', async () => {
    const detail = new ProjectDetailDto({
      id: 'project-1',
      title: 'Xolvon Dashboard',
      slug: 'xolvon-dashboard',
      type: 'web-app',
      summary: 'Analytics dashboard.',
      problem: 'P',
      solution: 'S',
      techStack: ['Next.js'],
      result: null,
      media: [new ProjectMediaPublicDto({ id: 'media-1', mediaType: 'image', sortOrder: 1 })],
      members: [new ProjectMemberDto({ memberId: 'member-1', name: 'Nabil', role: 'BE' })],
      status: 'published',
    });
    mockService.getPublishedDetailBySlug.mockResolvedValueOnce(detail);

    const result = await controller.getPublishedDetailBySlug('xolvon-dashboard');

    expect(result).toBe(detail);
    expect(mockService.getPublishedDetailBySlug).toHaveBeenCalledWith('xolvon-dashboard');
  });

  it('delegates create with the acting admin id', async () => {
    const created = new ProjectResponseDto({
      id: 'project-1',
      title: 'T',
      slug: 't',
      type: null,
      summary: null,
      problem: null,
      solution: null,
      techStack: [],
      result: null,
      status: 'draft',
      createdAt: '2026-09-12T00:00:00.000Z',
      updatedAt: '2026-09-12T00:00:00.000Z',
    });
    mockService.createProject.mockResolvedValueOnce(created);

    const dto = { title: 'T', slug: 't' };
    const result = await controller.createProject('admin-1', dto);

    expect(result).toBe(created);
    expect(mockService.createProject).toHaveBeenCalledWith('admin-1', dto);
  });

  it('delegates update, publish, and unpublish with the acting admin id', async () => {
    const project = new ProjectResponseDto({
      id: 'project-1',
      title: 'T',
      slug: 't',
      type: null,
      summary: null,
      problem: null,
      solution: null,
      techStack: [],
      result: null,
      status: 'published',
      createdAt: '2026-09-12T00:00:00.000Z',
      updatedAt: '2026-09-12T00:00:00.000Z',
    });

    mockService.updateProject.mockResolvedValueOnce(project);
    mockService.publishProject.mockResolvedValueOnce(project);
    mockService.unpublishProject.mockResolvedValueOnce(project);

    await controller.updateProject('admin-1', 'project-1', { title: 'T2' });
    await controller.publishProject('admin-1', 'project-1');
    await controller.unpublishProject('admin-1', 'project-1');

    expect(mockService.updateProject).toHaveBeenCalledWith('admin-1', 'project-1', { title: 'T2' });
    expect(mockService.publishProject).toHaveBeenCalledWith('admin-1', 'project-1');
    expect(mockService.unpublishProject).toHaveBeenCalledWith('admin-1', 'project-1');
  });

  describe('guard wiring (admin-only mutations)', () => {
    it('protects create, update, publish, and unpublish with AuthGuard + RolesGuard + admin role', () => {
      for (const handler of [
        'createProject',
        'updateProject',
        'publishProject',
        'unpublishProject',
      ] as const) {
        const guards = handlerGuards(handler);
        expect(guards).toContain(AuthGuard);
        expect(guards).toContain(RolesGuard);
        expect(handlerRoles(handler)).toEqual(['admin']);
      }
    });

    it('marks public read routes with @Public and leaves them unguarded', () => {
      for (const handler of ['listPublished', 'getPublishedDetailBySlug'] as const) {
        expect(handlerIsPublic(handler)).toBe(true);
        expect(handlerGuards(handler)).toEqual([]);
        expect(handlerRoles(handler)).toEqual([]);
      }
    });
  });
});
