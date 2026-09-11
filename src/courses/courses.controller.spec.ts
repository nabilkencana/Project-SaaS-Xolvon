import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { CourseCardDto, CourseDetailDto, LessonSummaryDto } from './dto/course-response.dto';

describe('CoursesController', () => {
  let controller: CoursesController;
  let mockService: jest.Mocked<CoursesService>;

  beforeEach(() => {
    mockService = {
      listPublished: jest.fn(),
      getPublishedBySlug: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      publish: jest.fn(),
      unpublish: jest.fn(),
    } as unknown as jest.Mocked<CoursesService>;

    controller = new CoursesController(mockService);
  });

  // Nest decorators store method-level metadata on descriptor.value (the
  // handler function itself), so read from the function first.
  function handlerGuards(name: keyof CoursesController): unknown[] {
    const handler = CoursesController.prototype[name] as object;
    return Reflect.getMetadata('__guards__', handler) ?? [];
  }

  function handlerRoles(name: keyof CoursesController): string[] {
    const handler = CoursesController.prototype[name] as object;
    return Reflect.getMetadata(ROLES_KEY, handler) ?? [];
  }

  function handlerIsPublic(name: keyof CoursesController): boolean {
    const handler = CoursesController.prototype[name] as object;
    return Reflect.getMetadata(IS_PUBLIC_KEY, handler) === true;
  }

  it('delegates listPublished to the service', async () => {
    const response = {
      items: [],
      page: 1,
      limit: 20,
      total: 0,
      query: null,
    };
    mockService.listPublished.mockResolvedValueOnce(response);

    const result = await controller.listPublished({ page: 2, limit: 10, q: 'video', sort: 'oldest' });

    expect(result).toBe(response);
    expect(mockService.listPublished).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      q: 'video',
      sort: 'oldest',
    });
  });

  it('delegates getPublishedBySlug to the service', async () => {
    const detail = new CourseDetailDto({
      id: 'course-1',
      title: 'Video SaaS Mastery',
      slug: 'video-saas',
      description: '',
      price: 250000,
      thumbnailUrl: null,
      status: 'published',
      lessons: [
        new LessonSummaryDto({ id: 'lesson-1', title: 'Intro', orderIndex: 1, status: 'published' }),
      ],
    });
    mockService.getPublishedBySlug.mockResolvedValueOnce(detail);

    const result = await controller.getPublishedBySlug('video-saas');

    expect(result).toBe(detail);
    expect(mockService.getPublishedBySlug).toHaveBeenCalledWith('video-saas');
  });

  it('delegates create with the acting admin id', async () => {
    const created = new CourseCardDto({
      id: 'course-1',
      title: 'T',
      slug: 't',
      description: 'D',
      price: 0,
      thumbnailUrl: null,
      status: 'draft',
    });
    mockService.create.mockResolvedValueOnce(created);

    const dto = {
      title: 'T',
      slug: 't',
      description: 'D',
      price: 0,
    };
    const result = await controller.create('admin-1', dto);

    expect(result).toBe(created);
    expect(mockService.create).toHaveBeenCalledWith('admin-1', dto);
  });

  it('delegates update, publish, and unpublish', async () => {
    const course = new CourseCardDto({
      id: 'course-1',
      title: 'T',
      slug: 't',
      description: '',
      price: 0,
      thumbnailUrl: null,
      status: 'published',
    });

    mockService.update.mockResolvedValueOnce(course);
    mockService.publish.mockResolvedValueOnce(course);
    mockService.unpublish.mockResolvedValueOnce(course);

    await controller.update('admin-1', 'course-1', { title: 'T2' });
    await controller.publish('admin-1', 'course-1');
    await controller.unpublish('admin-1', 'course-1');

    expect(mockService.update).toHaveBeenCalledWith('admin-1', 'course-1', { title: 'T2' });
    expect(mockService.publish).toHaveBeenCalledWith('admin-1', 'course-1');
    expect(mockService.unpublish).toHaveBeenCalledWith('admin-1', 'course-1');
  });

  describe('guard wiring (admin-only mutations)', () => {
    it('protects create, update, publish, and unpublish with AuthGuard + RolesGuard + admin role', () => {
      for (const handler of ['create', 'update', 'publish', 'unpublish'] as const) {
        const guards = handlerGuards(handler);
        expect(guards).toContain(AuthGuard);
        expect(guards).toContain(RolesGuard);
        expect(handlerRoles(handler)).toEqual(['admin']);
      }
    });

    it('marks public read routes with @Public and leaves them unguarded', () => {
      for (const handler of ['listPublished', 'getPublishedBySlug'] as const) {
        expect(handlerIsPublic(handler)).toBe(true);
        expect(handlerGuards(handler)).toEqual([]);
        expect(handlerRoles(handler)).toEqual([]);
      }
    });
  });
});
