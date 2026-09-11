import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import type { MarketplaceItemRow } from './interfaces/marketplace-item.interface';

function makeItemRow(overrides: Partial<MarketplaceItemRow> = {}): MarketplaceItemRow {
  return {
    id: 'item-1',
    title: 'Invoice SaaS',
    slug: 'invoice-saas',
    description: 'Billing for freelancers',
    capabilities: 'Invoicing,Taxes,Reports',
    external_url: 'https://invoice.example.com',
    status: 'published',
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('MarketplaceService', () => {
  let service: MarketplaceService;
  let mockDb: { queryAll: jest.Mock; queryOne: jest.Mock; execute: jest.Mock };
  let mockAudit: { record: jest.Mock };

  beforeEach(() => {
    mockDb = {
      queryAll: jest.fn(),
      queryOne: jest.fn(),
      execute: jest.fn(),
    };
    mockAudit = { record: jest.fn().mockResolvedValue(undefined) };

    service = new MarketplaceService(
      mockDb as unknown as DatabaseService,
      mockAudit as unknown as AuditService,
    );
  });

  // ---------------------------------------------------------------------------
  // listPublished
  // ---------------------------------------------------------------------------
  describe('listPublished', () => {
    it('returns the pagination contract {items, page, limit, total} with parsed capabilities', async () => {
      mockDb.queryAll.mockResolvedValueOnce([
        makeItemRow(),
        makeItemRow({ id: 'item-2', slug: 'crm-saas', capabilities: null }),
      ]);
      mockDb.queryOne.mockResolvedValueOnce({ total: 2 });

      const result = await service.listPublished({ page: 1, limit: 20 });

      expect(result).toMatchObject({
        page: 1,
        limit: 20,
        total: 2,
      });
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({
        id: 'item-1',
        title: 'Invoice SaaS',
        slug: 'invoice-saas',
        description: 'Billing for freelancers',
        capabilities: ['Invoicing', 'Taxes', 'Reports'],
        externalUrl: 'https://invoice.example.com',
        status: 'published',
      });
      // Null capabilities parses to an empty array, never null/undefined.
      expect(result.items[1].capabilities).toEqual([]);
    });

    it('queries published rows only, defaults sort to latest, and paginates via OFFSET', async () => {
      mockDb.queryAll.mockResolvedValueOnce([]);
      mockDb.queryOne.mockResolvedValueOnce({ total: 0 });

      await service.listPublished({ page: 3, limit: 10 });

      const [rowsSql, rowsParams] = mockDb.queryAll.mock.calls[0];
      expect(rowsSql).toContain("status = 'published'");
      expect(rowsSql).toContain('ORDER BY created_at DESC');
      expect(rowsSql).toContain('LIMIT ? OFFSET ?');
      expect(rowsParams).toEqual([10, 20]);

      const [countSql] = mockDb.queryOne.mock.calls[0];
      expect(countSql).toContain('COUNT(*)');
      expect(countSql).toContain("status = 'published'");
    });

    it('sorts oldest when sort=oldest', async () => {
      mockDb.queryAll.mockResolvedValueOnce([]);
      mockDb.queryOne.mockResolvedValueOnce({ total: 0 });

      await service.listPublished({ page: 1, limit: 20, sort: 'oldest' });

      const [rowsSql] = mockDb.queryAll.mock.calls[0];
      expect(rowsSql).toContain('ORDER BY created_at ASC');
    });

    it('scopes ?q= to title/description with escaped LIKE wildcards', async () => {
      mockDb.queryAll.mockResolvedValueOnce([]);
      mockDb.queryOne.mockResolvedValueOnce({ total: 0 });

      await service.listPublished({ page: 1, limit: 20, q: '100%_done' });

      const [rowsSql, rowsParams] = mockDb.queryAll.mock.calls[0];
      expect(rowsSql).toContain('title LIKE ?');
      expect(rowsSql).toContain('description LIKE ?');
      expect(rowsSql).toContain("ESCAPE '\\'");
      // % and _ are escaped so the visitor query matches literally.
      expect(rowsParams).toEqual(['100\\%\\_done', '100\\%\\_done', 20, 0]);
    });

    it('clamps limit to the DL-011 maximum of 100', async () => {
      mockDb.queryAll.mockResolvedValueOnce([]);
      mockDb.queryOne.mockResolvedValueOnce({ total: 0 });

      await service.listPublished({ page: 1, limit: 500 });

      const [rowsSql, rowsParams] = mockDb.queryAll.mock.calls[0];
      expect(rowsSql).toContain('LIMIT ? OFFSET ?');
      expect(rowsParams).toEqual([100, 0]);
    });
  });

  // ---------------------------------------------------------------------------
  // getPublishedBySlug
  // ---------------------------------------------------------------------------
  describe('getPublishedBySlug', () => {
    it('returns the detail with media sorted by sort_order', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeItemRow());
      mockDb.queryAll.mockResolvedValueOnce([
        {
          id: 'media-1',
          marketplace_id: 'item-1',
          object_key: 'marketplace/shot.png',
          media_type: 'image',
          sort_order: 1,
        },
        {
          id: 'media-2',
          marketplace_id: 'item-1',
          object_key: 'marketplace/deck.pdf',
          media_type: 'deck',
          sort_order: 2,
        },
      ]);

      const result = await service.getPublishedBySlug('invoice-saas');

      expect(result).toMatchObject({
        id: 'item-1',
        slug: 'invoice-saas',
        externalUrl: 'https://invoice.example.com',
        capabilities: ['Invoicing', 'Taxes', 'Reports'],
      });
      expect(result.media).toEqual([
        { id: 'media-1', objectKey: 'marketplace/shot.png', mediaType: 'image', sortOrder: 1 },
        { id: 'media-2', objectKey: 'marketplace/deck.pdf', mediaType: 'deck', sortOrder: 2 },
      ]);

      const [mediaSql] = mockDb.queryAll.mock.calls[0];
      expect(mediaSql).toContain('ORDER BY sort_order ASC');
    });

    it('returns 404 for a draft item (published-only lookup)', async () => {
      mockDb.queryOne.mockResolvedValueOnce(
        makeItemRow({ status: 'draft' as MarketplaceItemRow['status'] }),
      );

      await expect(service.getPublishedBySlug('invoice-saas')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns 404 for an unknown slug', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(service.getPublishedBySlug('nope')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    const dto = {
      title: 'Invoice SaaS',
      slug: 'invoice-saas',
      description: 'Billing for freelancers',
      externalUrl: 'https://invoice.example.com',
      capabilities: ['Invoicing', 'Taxes'],
    };

    it('accepts a valid https URL, stores draft status and comma-joined capabilities, audits create', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined); // slug check

      const result = await service.create('admin-1', dto);

      expect(result).toMatchObject({
        title: 'Invoice SaaS',
        slug: 'invoice-saas',
        externalUrl: 'https://invoice.example.com',
        capabilities: ['Invoicing', 'Taxes'],
        status: 'draft',
      });

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
      const [insertSql, insertParams] = mockDb.execute.mock.calls[0];
      expect(insertSql).toContain('INSERT INTO marketplace_items');
      expect(insertParams).toContain('Invoicing,Taxes');
      expect(insertSql).toContain("'draft'");

      expect(mockAudit.record).toHaveBeenCalledWith(
        'admin-1',
        'create',
        'marketplace_item',
        result.id,
        expect.any(Object),
      );
    });

    it('rejects http URLs (redirection security) with 400', async () => {
      await expect(
        service.create('admin-1', { ...dto, externalUrl: 'http://invoice.example.com' }),
      ).rejects.toThrow(
        new BadRequestException('external_url harus menggunakan protokol https.'),
      );
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it('rejects non-URL strings with 400', async () => {
      await expect(
        service.create('admin-1', { ...dto, externalUrl: 'not-a-url' }),
      ).rejects.toThrow(
        new BadRequestException('external_url harus URL yang valid.'),
      );
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it('rejects a duplicate slug with 409', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeItemRow()); // slug taken

      await expect(service.create('admin-1', dto)).rejects.toThrow(ConflictException);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('applies only provided fields, revalidates external_url, audits update', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeItemRow());

      const result = await service.update('admin-1', 'item-1', {
        title: 'Invoice SaaS Pro',
        externalUrl: 'https://invoice-pro.example.com',
      });

      expect(result).toMatchObject({
        id: 'item-1',
        title: 'Invoice SaaS Pro',
        externalUrl: 'https://invoice-pro.example.com',
        // Untouched fields survive.
        slug: 'invoice-saas',
        capabilities: ['Invoicing', 'Taxes', 'Reports'],
      });

      const [updateSql] = mockDb.execute.mock.calls[0];
      expect(updateSql).toContain('UPDATE marketplace_items');
      expect(updateSql).toContain('title = ?');
      expect(updateSql).toContain('external_url = ?');
      expect(updateSql).not.toContain('slug = ?');

      expect(mockAudit.record).toHaveBeenCalledWith(
        'admin-1',
        'update',
        'marketplace_item',
        'item-1',
        expect.any(Object),
      );
    });

    it('joins capabilities to comma-separated TEXT on update', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeItemRow());

      await service.update('admin-1', 'item-1', {
        capabilities: ['A', 'B'],
      });

      const [updateSql, updateParams] = mockDb.execute.mock.calls[0];
      expect(updateSql).toContain('capabilities = ?');
      expect(updateParams).toContain('A,B');
    });

    it('returns 404 for an unknown item', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(
        service.update('admin-1', 'missing', { title: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects an http external_url on update with 400', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeItemRow());

      await expect(
        service.update('admin-1', 'item-1', { externalUrl: 'http://evil.example.com' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockDb.execute).not.toHaveBeenCalled();
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    it('rejects a duplicate slug on update with 409', async () => {
      mockDb.queryOne
        .mockResolvedValueOnce(makeItemRow()) // target item (slug: invoice-saas)
        .mockResolvedValueOnce(makeItemRow({ id: 'other', slug: 'crm-saas' })); // new slug taken

      await expect(
        service.update('admin-1', 'item-1', { slug: 'crm-saas' }),
      ).rejects.toThrow(ConflictException);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it('keeps the slug untouched (no conflict) when the sent slug equals the current one', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeItemRow());

      const result = await service.update('admin-1', 'item-1', { slug: 'invoice-saas' });

      expect(result.slug).toBe('invoice-saas');
      expect(mockDb.execute).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // publish / unpublish
  // ---------------------------------------------------------------------------
  describe('publish', () => {
    it('transitions draft → published and audits publish', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeItemRow({ status: 'draft' as MarketplaceItemRow['status'] }));

      const result = await service.publish('admin-1', 'item-1');

      expect(result.status).toBe('published');
      const [updateSql, updateParams] = mockDb.execute.mock.calls[0];
      expect(updateSql).toContain("SET status = 'published'");
      expect(updateParams[updateParams.length - 1]).toBe('item-1');
      expect(mockAudit.record).toHaveBeenCalledWith(
        'admin-1',
        'publish',
        'marketplace_item',
        'item-1',
        expect.any(Object),
      );
    });

    it('rejects publishing an already published item with 400 (strict transition)', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeItemRow({ status: 'published' }));

      await expect(service.publish('admin-1', 'item-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockDb.execute).not.toHaveBeenCalled();
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    it('returns 404 for an unknown item', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(service.publish('admin-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('unpublish', () => {
    it('transitions published → draft and audits unpublish', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeItemRow({ status: 'published' }));

      const result = await service.unpublish('admin-1', 'item-1');

      expect(result.status).toBe('draft');
      const [updateSql] = mockDb.execute.mock.calls[0];
      expect(updateSql).toContain("SET status = 'draft'");
      expect(mockAudit.record).toHaveBeenCalledWith(
        'admin-1',
        'unpublish',
        'marketplace_item',
        'item-1',
        expect.any(Object),
      );
    });

    it('rejects unpublishing an already draft item with 400 (strict transition)', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeItemRow({ status: 'draft' as MarketplaceItemRow['status'] }));

      await expect(service.unpublish('admin-1', 'item-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockAudit.record).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // attachMedia / detachMedia
  // ---------------------------------------------------------------------------
  describe('attachMedia', () => {
    const dto = { objectKey: 'marketplace/deck.pdf', mediaType: 'deck' as const, sortOrder: 2 };

    it('inserts the media row scoped to the item and audits create', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeItemRow()); // item exists

      const result = await service.attachMedia('admin-1', 'item-1', dto);

      expect(result).toMatchObject({
        objectKey: 'marketplace/deck.pdf',
        mediaType: 'deck',
        sortOrder: 2,
      });
      const [insertSql, insertParams] = mockDb.execute.mock.calls[0];
      expect(insertSql).toContain('INSERT INTO marketplace_media');
      expect(insertParams).toContain('marketplace/deck.pdf');
      expect(insertParams).toContain('item-1');
      expect(mockAudit.record).toHaveBeenCalledWith(
        'admin-1',
        'create',
        'marketplace_media',
        result.id,
        expect.any(Object),
      );
    });

    it('defaults sortOrder to 0 when omitted', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeItemRow());

      const result = await service.attachMedia('admin-1', 'item-1', {
        objectKey: 'marketplace/shot.png',
        mediaType: 'image',
      });

      expect(result.sortOrder).toBe(0);
    });

    it('returns 404 when the item does not exist', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(
        service.attachMedia('admin-1', 'missing', dto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('detachMedia', () => {
    it('deletes the media row scoped to the item and audits delete', async () => {
      mockDb.queryOne
        .mockResolvedValueOnce(makeItemRow()) // item exists
        .mockResolvedValueOnce({ id: 'media-1' }); // media belongs to item

      const result = await service.detachMedia('admin-1', 'item-1', 'media-1');

      expect(result.message).toBeDefined();
      const [deleteSql, deleteParams] = mockDb.execute.mock.calls[0];
      expect(deleteSql).toContain('DELETE FROM marketplace_media');
      expect(deleteSql).toContain('marketplace_id = ?');
      expect(deleteParams).toEqual(['media-1', 'item-1']);
      expect(mockAudit.record).toHaveBeenCalledWith(
        'admin-1',
        'delete',
        'marketplace_media',
        'media-1',
        expect.any(Object),
      );
    });

    it('returns 404 when the media does not belong to the item', async () => {
      mockDb.queryOne
        .mockResolvedValueOnce(makeItemRow())
        .mockResolvedValueOnce(undefined);

      await expect(
        service.detachMedia('admin-1', 'item-1', 'media-other'),
      ).rejects.toThrow(NotFoundException);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });
  });
});
