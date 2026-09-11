import { ConflictException, NotFoundException } from '@nestjs/common';
import { CollectiveService } from './collective.service';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import type { CollectiveMemberRow } from './interfaces/collective-member.interface';

describe('CollectiveService', () => {
  let service: CollectiveService;
  let mockDb: { queryAll: jest.Mock; queryOne: jest.Mock; execute: jest.Mock };
  let mockAudit: { record: jest.Mock };

  /**
   * A DB row that also carries personal contact fields. Migration 0004 has no
   * email/phone columns, but if schema drift or a future JOIN ever surfaces
   * them, the mapper MUST still strip them (SCHEMA.md §57 privacy rule).
   */
  const rowWithEmailAndPhone = {
    id: 'member-1',
    name: 'Test Member',
    slug: 'test-member',
    photo: 'https://cdn.example.com/photo.jpg',
    role: 'Fullstack Engineer',
    skills: 'TypeScript, NestJS, SQL',
    bio: 'Builds things.',
    social_links: '[{"platform":"GitHub","url":"https://github.com/test"}]',
    status: 'published',
    display_order: 1,
    created_at: '2026-09-12T00:00:00.000Z',
    email: 'secret@example.com',
    phone: '+628123456789',
  } as unknown as CollectiveMemberRow;

  beforeEach(() => {
    mockDb = {
      queryAll: jest.fn(),
      queryOne: jest.fn(),
      execute: jest.fn(),
    };
    mockAudit = { record: jest.fn().mockResolvedValue(undefined) };

    service = new CollectiveService(
      mockDb as unknown as DatabaseService,
      mockAudit as unknown as AuditService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // listPublished
  // ---------------------------------------------------------------------------
  describe('listPublished', () => {
    it('should return published members with T4 pagination shape and parsed fields', async () => {
      mockDb.queryAll.mockResolvedValueOnce([rowWithEmailAndPhone]); // page rows
      mockDb.queryOne.mockResolvedValueOnce({ total: 21 }); // count

      const result = await service.listPublished();

      expect(result).toEqual({
        items: [
          {
            id: 'member-1',
            name: 'Test Member',
            slug: 'test-member',
            photo: 'https://cdn.example.com/photo.jpg',
            role: 'Fullstack Engineer',
            skills: ['TypeScript', 'NestJS', 'SQL'],
            bio: 'Builds things.',
            socialLinks: [{ platform: 'GitHub', url: 'https://github.com/test' }],
            status: 'published',
          },
        ],
        page: 1,
        limit: 20,
        total: 21,
      });
    });

    it('should query only published rows ordered by display_order ASC, created_at DESC', async () => {
      mockDb.queryAll.mockResolvedValueOnce([]);
      mockDb.queryOne.mockResolvedValueOnce({ total: 0 });

      await service.listPublished();

      const [listSql] = mockDb.queryAll.mock.calls[0];
      expect(listSql).toContain("status = 'published'");
      expect(listSql).toContain('display_order ASC');
      expect(listSql).toContain('created_at DESC');
      expect(listSql).toContain('LIMIT ? OFFSET ?');
      const [countSql] = mockDb.queryOne.mock.calls[0];
      expect(countSql).toContain('COUNT(*)');
    });

    it('should search q with bound LIKE params over name/role/skills', async () => {
      mockDb.queryAll.mockResolvedValueOnce([]);
      mockDb.queryOne.mockResolvedValueOnce({ total: 0 });

      await service.listPublished({ q: 'nest%' });

      const [listSql, listParams] = mockDb.queryAll.mock.calls[0];
      expect(listSql).toContain('name LIKE ?');
      expect(listSql).toContain('role LIKE ?');
      expect(listSql).toContain('skills LIKE ?');
      // Wildcards from user input are escaped, term wrapped for contains-match.
      expect(listParams[0]).toBe('%nest\\%%');
    });

    it('should clamp limit to the 100 maximum of the pagination contract', async () => {
      mockDb.queryAll.mockResolvedValueOnce([]);
      mockDb.queryOne.mockResolvedValueOnce({ total: 0 });

      await service.listPublished({ limit: 500 });

      const [, listParams] = mockDb.queryAll.mock.calls[0];
      expect(listParams).toContain(100);
    });

    it('should never include email or phone in any item', async () => {
      mockDb.queryAll.mockResolvedValueOnce([rowWithEmailAndPhone]);
      mockDb.queryOne.mockResolvedValueOnce({ total: 1 });

      const result = await service.listPublished();

      expect(result.items[0]).not.toHaveProperty('email');
      expect(result.items[0]).not.toHaveProperty('phone');
      expect(JSON.stringify(result)).not.toContain('secret@example.com');
      expect(JSON.stringify(result)).not.toContain('+628123456789');
    });

    it('should default socialLinks to an empty array and skills to [] when stored values are NULL', async () => {
      mockDb.queryAll.mockResolvedValueOnce([
        {
          ...rowWithEmailAndPhone,
          skills: null,
          social_links: null,
        } as unknown as CollectiveMemberRow,
      ]);
      mockDb.queryOne.mockResolvedValueOnce({ total: 1 });

      const result = await service.listPublished();

      expect(result.items[0].skills).toEqual([]);
      expect(result.items[0].socialLinks).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getDetailBySlug
  // ---------------------------------------------------------------------------
  describe('getDetailBySlug', () => {
    const relatedProjectRows = [
      {
        id: 'project-1',
        title: 'Xolvon Platform',
        slug: 'xolvon-platform',
        type: 'SaaS',
        summary: 'The platform itself.',
        status: 'published',
      },
    ];

    it('should return the member with relatedProjects for a published slug', async () => {
      mockDb.queryOne.mockResolvedValueOnce(rowWithEmailAndPhone); // member
      mockDb.queryAll.mockResolvedValueOnce(relatedProjectRows); // projects

      const result = await service.getDetailBySlug('test-member');

      expect(result).toMatchObject({
        id: 'member-1',
        name: 'Test Member',
        slug: 'test-member',
        status: 'published',
      });
      expect(result.relatedProjects).toEqual([
        {
          id: 'project-1',
          title: 'Xolvon Platform',
          slug: 'xolvon-platform',
          type: 'SaaS',
          summary: 'The platform itself.',
          status: 'published',
        },
      ]);
      const [projectsSql] = mockDb.queryAll.mock.calls[0];
      expect(projectsSql).toContain('project_members');
      expect(projectsSql).toContain("p.status = 'published'");
    });

    it('should throw NotFoundException for a draft or unknown slug', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(service.getDetailBySlug('ghost')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should never expose email or phone in the detail payload', async () => {
      mockDb.queryOne.mockResolvedValueOnce(rowWithEmailAndPhone);
      mockDb.queryAll.mockResolvedValueOnce(relatedProjectRows);

      const result = await service.getDetailBySlug('test-member');

      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('phone');
      expect(JSON.stringify(result)).not.toContain('secret@example.com');
      expect(JSON.stringify(result)).not.toContain('+628123456789');
    });
  });

  // ---------------------------------------------------------------------------
  // create (admin)
  // ---------------------------------------------------------------------------
  describe('create', () => {
    const createDto = {
      name: 'New Member',
      slug: 'new-member',
      role: 'Data Engineer',
      skills: ['SQL', 'Python'],
      socialLinks: [{ platform: 'LinkedIn', url: 'https://linkedin.com/in/new' }],
      displayOrder: 3,
    };

    it('should insert a draft member, persist comma-joined skills, and audit create', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined); // slug uniqueness
      mockDb.queryOne.mockResolvedValueOnce({
        ...rowWithEmailAndPhone,
        id: 'member-new',
        slug: 'new-member',
        status: 'draft',
      }); // re-read after insert

      const result = await service.create('admin-1', createDto);

      expect(result.status).toBe('draft');
      expect(mockDb.execute).toHaveBeenCalledTimes(1);

      const [insertSql, insertParams] = mockDb.execute.mock.calls[0];
      expect(insertSql).toContain('INSERT INTO collective_members');
      expect(insertSql).toContain("'draft'");
      expect(insertParams).toContain('new-member');
      expect(insertParams).toContain('SQL,Python');

      const [socialJsonParam] = insertParams.filter(
        (p: unknown) => typeof p === 'string' && p.startsWith('['),
      );
      expect(JSON.parse(socialJsonParam)).toEqual([
        { platform: 'LinkedIn', url: 'https://linkedin.com/in/new' },
      ]);

      expect(mockAudit.record).toHaveBeenCalledWith(
        'admin-1',
        'create',
        'collective_member',
        expect.any(String),
        expect.anything(),
      );
    });

    it('should reject a duplicate slug with 409', async () => {
      mockDb.queryOne.mockResolvedValueOnce({ id: 'existing' });

      await expect(service.create('admin-1', createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockDb.execute).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // update (admin)
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('should throw NotFoundException when the member does not exist', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(
        service.update('admin-1', 'member-1', { name: 'Renamed' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it('should update the provided fields and audit update', async () => {
      mockDb.queryOne.mockResolvedValueOnce(rowWithEmailAndPhone); // exists
      mockDb.queryOne.mockResolvedValueOnce({
        ...rowWithEmailAndPhone,
        name: 'Renamed Member',
      }); // re-read

      const result = await service.update('admin-1', 'member-1', {
        name: 'Renamed Member',
        skills: ['Go'],
      });

      expect(result.name).toBe('Renamed Member');
      const [updateSql, updateParams] = mockDb.execute.mock.calls[0];
      expect(updateSql).toContain('UPDATE collective_members SET');
      expect(updateSql).toContain('name = ?');
      expect(updateSql).toContain('skills = ?');
      expect(updateParams).toContain('Go');

      expect(mockAudit.record).toHaveBeenCalledWith(
        'admin-1',
        'update',
        'collective_member',
        'member-1',
        expect.anything(),
      );
    });

    it('should reject an update that collides with an existing slug', async () => {
      mockDb.queryOne.mockResolvedValueOnce(rowWithEmailAndPhone); // exists
      mockDb.queryOne.mockResolvedValueOnce({ id: 'other-member' }); // slug taken

      await expect(
        service.update('admin-1', 'member-1', { slug: 'taken-slug' }),
      ).rejects.toThrow(ConflictException);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // publish / unpublish (admin)
  // ---------------------------------------------------------------------------
  describe('publish and unpublish', () => {
    it('should set published and audit publish', async () => {
      mockDb.queryOne.mockResolvedValueOnce(rowWithEmailAndPhone); // exists
      mockDb.queryOne.mockResolvedValueOnce({
        ...rowWithEmailAndPhone,
        status: 'published',
      }); // re-read

      const result = await service.publish('admin-1', 'member-1');

      expect(result.status).toBe('published');
      const [updateSql, updateParams] = mockDb.execute.mock.calls[0];
      expect(updateSql).toContain('status =');
      expect(updateParams).toEqual(['published', 'member-1']);
      expect(mockAudit.record).toHaveBeenCalledWith(
        'admin-1',
        'publish',
        'collective_member',
        'member-1',
        expect.anything(),
      );
    });

    it('should set draft and audit unpublish', async () => {
      mockDb.queryOne.mockResolvedValueOnce(rowWithEmailAndPhone); // exists
      mockDb.queryOne.mockResolvedValueOnce({
        ...rowWithEmailAndPhone,
        status: 'draft',
      }); // re-read

      const result = await service.unpublish('admin-1', 'member-1');

      expect(result.status).toBe('draft');
      const [, updateParams] = mockDb.execute.mock.calls[0];
      expect(updateParams).toEqual(['draft', 'member-1']);
      expect(mockAudit.record).toHaveBeenCalledWith(
        'admin-1',
        'unpublish',
        'collective_member',
        'member-1',
        expect.anything(),
      );
    });

    it('should throw NotFoundException for an unknown member id', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(service.publish('admin-1', 'ghost')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockAudit.record).not.toHaveBeenCalled();
    });
  });
});
