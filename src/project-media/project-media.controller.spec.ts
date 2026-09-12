import { ProjectMediaController } from './project-media.controller';
import { ProjectMediaService } from './project-media.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { ProjectMediaResponseDto } from './dto/project-media-response.dto';

describe('ProjectMediaController', () => {
  let controller: ProjectMediaController;
  let mockService: jest.Mocked<ProjectMediaService>;

  beforeEach(() => {
    mockService = {
      attachMedia: jest.fn(),
      detachMedia: jest.fn(),
    } as unknown as jest.Mocked<ProjectMediaService>;

    controller = new ProjectMediaController(mockService);
  });

  // Nest decorators store method-level metadata on descriptor.value (the
  // handler function itself), so read from the function first.
  function handlerGuards(name: keyof ProjectMediaController): unknown[] {
    const handler = ProjectMediaController.prototype[name] as object;
    return Reflect.getMetadata('__guards__', handler) ?? [];
  }

  function handlerRoles(name: keyof ProjectMediaController): string[] {
    const handler = ProjectMediaController.prototype[name] as object;
    return Reflect.getMetadata(ROLES_KEY, handler) ?? [];
  }

  it('delegates attachMedia with the acting admin id', async () => {
    const attached = new ProjectMediaResponseDto({
      id: 'media-1',
      projectId: 'project-1',
      objectKey: 'projects/shot-1.png',
      mediaType: 'image',
      sortOrder: 1,
    });
    mockService.attachMedia.mockResolvedValueOnce(attached);

    const dto = { objectKey: 'projects/shot-1.png', mediaType: 'image', sortOrder: 1 };
    const result = await controller.attachMedia('admin-1', 'project-1', dto);

    expect(result).toBe(attached);
    expect(mockService.attachMedia).toHaveBeenCalledWith('admin-1', 'project-1', dto);
  });

  it('delegates detachMedia with the acting admin id', async () => {
    mockService.detachMedia.mockResolvedValueOnce({ message: 'Project media detached.' });

    const result = await controller.detachMedia('admin-1', 'project-1', 'media-1');

    expect(result).toEqual({ message: 'Project media detached.' });
    expect(mockService.detachMedia).toHaveBeenCalledWith('admin-1', 'project-1', 'media-1');
  });

  it('protects both handlers with AuthGuard + RolesGuard + admin role', () => {
    for (const handler of ['attachMedia', 'detachMedia'] as const) {
      const guards = handlerGuards(handler);
      expect(guards).toContain(AuthGuard);
      expect(guards).toContain(RolesGuard);
      expect(handlerRoles(handler)).toEqual(['admin']);
    }
  });
});
