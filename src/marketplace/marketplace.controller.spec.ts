import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { MarketplaceItemDto } from './dto/marketplace-item-response.dto';

describe('MarketplaceController', () => {
  let controller: MarketplaceController;
  let mockService: jest.Mocked<MarketplaceService>;

  beforeEach(() => {
    mockService = {
      listPublished: jest.fn(),
      getPublishedBySlug: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      publish: jest.fn(),
      unpublish: jest.fn(),
      attachMedia: jest.fn(),
      detachMedia: jest.fn(),
    } as unknown as jest.Mocked<MarketplaceService>;

    controller = new MarketplaceController(mockService);
  });

  // Nest decorators store method-level metadata on descriptor.value (the
  // handler function itself), so read from the function first.
  function handlerGuards(name: keyof MarketplaceController): unknown[] {
    const handler = MarketplaceController.prototype[name] as object;
    return Reflect.getMetadata('__guards__', handler) ?? [];
  }

  function handlerRoles(name: keyof MarketplaceController): string[] {
    const handler = MarketplaceController.prototype[name] as object;
    return Reflect.getMetadata(ROLES_KEY, handler) ?? [];
  }

  it('delegates listPublished to the service', async () => {
    const response = {
      items: [],
      page: 1,
      limit: 20,
      total: 0,
    };
    mockService.listPublished.mockResolvedValueOnce(response);

    const result = await controller.listPublished({ page: 2, limit: 10, q: 'invoicing', sort: 'oldest' });

    expect(result).toBe(response);
    expect(mockService.listPublished).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      q: 'invoicing',
      sort: 'oldest',
    });
  });

  it('delegates getPublishedBySlug to the service', async () => {
    const detail = new MarketplaceItemDto({
      id: 'item-1',
      title: 'Invoice SaaS',
      slug: 'invoice-saas',
      description: '',
      capabilities: [],
      externalUrl: 'https://invoice.example.com',
      status: 'published',
    });
    mockService.getPublishedBySlug.mockResolvedValueOnce(detail);

    const result = await controller.getPublishedBySlug('invoice-saas');

    expect(result).toBe(detail);
    expect(mockService.getPublishedBySlug).toHaveBeenCalledWith('invoice-saas');
  });

  it('delegates create with the acting admin id', async () => {
    const created = new MarketplaceItemDto({
      id: 'item-1',
      title: 'T',
      slug: 't',
      description: '',
      capabilities: [],
      externalUrl: 'https://t.example.com',
      status: 'draft',
    });
    mockService.create.mockResolvedValueOnce(created);

    const dto = {
      title: 'T',
      slug: 't',
      externalUrl: 'https://t.example.com',
    };
    const result = await controller.create('admin-1', dto);

    expect(result).toBe(created);
    expect(mockService.create).toHaveBeenCalledWith('admin-1', dto);
  });

  it('delegates update, publish, unpublish, attachMedia, and detachMedia', async () => {
    const item = new MarketplaceItemDto({
      id: 'item-1',
      title: 'T',
      slug: 't',
      description: '',
      capabilities: [],
      externalUrl: 'https://t.example.com',
      status: 'published',
    });

    mockService.update.mockResolvedValueOnce(item);
    mockService.publish.mockResolvedValueOnce(item);
    mockService.unpublish.mockResolvedValueOnce(item);
    mockService.attachMedia.mockResolvedValueOnce({
      id: 'media-1',
      objectKey: 'k',
      mediaType: 'image',
      sortOrder: 0,
    });
    mockService.detachMedia.mockResolvedValueOnce({ message: 'ok' });

    await controller.update('admin-1', 'item-1', { title: 'T2' });
    await controller.publish('admin-1', 'item-1');
    await controller.unpublish('admin-1', 'item-1');
    await controller.attachMedia('admin-1', 'item-1', { objectKey: 'k', mediaType: 'image' });
    await controller.detachMedia('admin-1', 'item-1', 'media-1');

    expect(mockService.update).toHaveBeenCalledWith('admin-1', 'item-1', { title: 'T2' });
    expect(mockService.publish).toHaveBeenCalledWith('admin-1', 'item-1');
    expect(mockService.unpublish).toHaveBeenCalledWith('admin-1', 'item-1');
    expect(mockService.attachMedia).toHaveBeenCalledWith('admin-1', 'item-1', {
      objectKey: 'k',
      mediaType: 'image',
    });
    expect(mockService.detachMedia).toHaveBeenCalledWith('admin-1', 'item-1', 'media-1');
  });

  describe('guard wiring (admin-only mutations)', () => {
    it('protects create, update, publish, unpublish, and media routes with AuthGuard + RolesGuard + admin role', () => {
      for (const handler of [
        'create',
        'update',
        'publish',
        'unpublish',
        'attachMedia',
        'detachMedia',
      ] as const) {
        const guards = handlerGuards(handler);
        expect(guards).toContain(AuthGuard);
        expect(guards).toContain(RolesGuard);
        expect(handlerRoles(handler)).toEqual(['admin']);
      }
    });

    it('leaves public read routes unguarded', () => {
      expect(handlerGuards('listPublished')).toEqual([]);
      expect(handlerRoles('listPublished')).toEqual([]);
      expect(handlerGuards('getPublishedBySlug')).toEqual([]);
      expect(handlerRoles('getPublishedBySlug')).toEqual([]);
    });
  });
});
