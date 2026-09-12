import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import type { ProjectRow } from './interfaces/project.interface';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let mockDb: { queryAll: jest.Mock; queryOne: jest.Mock; execute: jest.Mock };
  let mockAudit: { record: jest.Mock };

  const projectRow: ProjectRow = {
    id: '0b9e6b5e-1111-4222-8333-444455556666',
    title: 'Xolvon Dashboard',
    slug: 'xolvon-dashboard',
    type: 'web-app',
    summary: 'Internal analytics dashboard.',
    problem: 'Data scattered across tools.',
    solution: 'Single source of truth dashboard.',
    tech_stack: 'Next.js, TypeScript, D1',
    result: 'Reduced reporting time.',
    status: 'published',
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-02T00:00:00.000Z',
  };

  beforeEach(() => {
    mockDb = {
      queryAll: jest.fn(),
      queryOne: jest.fn(),
      execute: jest.fn(),
    };
    mockAudit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new ProjectsService(
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
    it('should return paginated published cards following the DL-011 contract', async () => {
      mockDb.queryOne.mockResolvedValueOnce({ total: 1 });
      mockDb.queryAll.mockResolvedValueOnce([
        {
          id: projectRow.id,
          title: projectRow.title,
          slug: projectRow.slug,
          type: projectRow.type,
          summary: projectRow.summary,
          status: 'published',
        },
      ]);

      const result = await service.listPublished({});

      expect(result).toEqual({
        items: [
          {
            id: projectRow.id,
            title: projectRow.title,
            slug: projectRow.slug,
            type: projectRow.type,
            summary: projectRow.summary,
            status: 'published',
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
      });

      const [countSql, countParams] = mockDb.queryOne.mock.calls[0];
      expect(countSql).toContain("status = 'published'");
      expect(countParams).toEqual([]);

      const [listSql, listParams] = mockDb.queryAll.mock.calls[0];
      expect(listSql).toContain("WHERE status = 'published'");
      expect(listSql).toContain('ORDER BY created_at DESC');
      expect(listSql).toContain('LIMIT ? OFFSET ?');
      expect(listParams.slice(-2)).toEqual([20, 0]);
    });

    it('should apply q filter, oldest sort, and page offset when provided', async () => {
      mockDb.queryOne.mockResolvedValueOnce({ total: 0 });
      mockDb.queryAll.mockResolvedValueOnce([]);

      await service.listPublished({ q: 'dashboard', sort: 'oldest', page: 2, limit: 5 });

      const [countSql, countParams] = mockDb.queryOne.mock.calls[0];
      expect(countSql).toContain('title LIKE ?');
      expect(countSql).toContain('summary LIKE ?');
      expect(countParams[0]).toBe('%dashboard%');

      const [listSql, listParams] = mockDb.queryAll.mock.calls[0];
      expect(listSql).toContain('ORDER BY created_at ASC');
      expect(listParams.slice(-2)).toEqual([5, 5]);
    });

    it('should never select problem/solution/tech_stack for the public card list', async () => {
      mockDb.queryOne.mockResolvedValueOnce({ total: 0 });
      mockDb.queryAll.mockResolvedValueOnce([]);

      await service.listPublished({});

      const [listSql] = mockDb.queryAll.mock.calls[0];
      expect(listSql).toContain('SELECT id, title, slug, type, summary, status FROM projects');
      expect(listSql).not.toContain('problem');
    });
  });

  // ---------------------------------------------------------------------------
  // getPublishedDetailBySlug
  // ---------------------------------------------------------------------------
  describe('getPublishedDetailBySlug', () => {
    // Pre-sorted: the mock does not apply SQL `ORDER BY sort_order ASC`
    // (ordering is storage-layer behavior, asserted separately below).
    const mediaRows = [
      { id: 'media-2', project_id: projectRow.id, object_key: 'projects/shot-2.png', media_type: 'image', sort_order: 1 },
      { id: 'media-1', project_id: projectRow.id, object_key: 'projects/shot-1.png', media_type: 'image', sort_order: 2 },
    ];
    const memberRows = [
      { member_id: 'member-1', name: 'Nabil', role: 'BE' },
      { member_id: 'member-2', name: 'Sinta', role: 'Design' },
    ];

    it('should return detail following the story order with parsed techStack and members with role', async () => {
      mockDb.queryOne.mockResolvedValueOnce(projectRow);
      mockDb.queryAll
        .mockResolvedValueOnce(mediaRows) // media
        .mockResolvedValueOnce(memberRows); // members

      const result = await service.getPublishedDetailBySlug('xolvon-dashboard');

      expect(result.id).toBe(projectRow.id);
      expect(result.status).toBe('published');
      expect(result.techStack).toEqual(['Next.js', 'TypeScript', 'D1']);
      expect(result.result).toBe('Reduced reporting time.');
      expect(result.media).toEqual([
        { id: 'media-2', mediaType: 'image', sortOrder: 1 },
        { id: 'media-1', mediaType: 'image', sortOrder: 2 },
      ]);
      expect(result.members).toEqual([
        { memberId: 'member-1', name: 'Nabil', role: 'BE' },
        { memberId: 'member-2', name: 'Sinta', role: 'Design' },
      ]);

      // Public response must never leak private object keys.
      expect(JSON.stringify(result)).not.toContain('projects/shot-1.png');

      // SCHEMA §48 story order: problem → solution → techStack → result → media → members.
      const keys = Object.keys(result);
      const indexOf = (key: string): number => keys.indexOf(key);
      expect(indexOf('problem')).toBeLessThan(indexOf('solution'));
      expect(indexOf('solution')).toBeLessThan(indexOf('techStack'));
      expect(indexOf('techStack')).toBeLessThan(indexOf('result'));
      expect(indexOf('result')).toBeLessThan(indexOf('media'));
      expect(indexOf('media')).toBeLessThan(indexOf('members'));
    });

    it('should order media by sort_order and exclude video from the public response', async () => {
      mockDb.queryOne.mockResolvedValueOnce(projectRow);
      mockDb.queryAll.mockResolvedValueOnce([]);
      mockDb.queryAll.mockResolvedValueOnce([]);

      await service.getPublishedDetailBySlug('xolvon-dashboard');

      const [mediaSql] = mockDb.queryAll.mock.calls[0];
      expect(mediaSql).toContain('ORDER BY sort_order ASC');
      expect(mediaSql).toContain("LOWER(media_type) != 'video'");
    });

    it('should join project_members with collective_members for the built-by list', async () => {
      mockDb.queryOne.mockResolvedValueOnce(projectRow);
      mockDb.queryAll.mockResolvedValueOnce([]);
      mockDb.queryAll.mockResolvedValueOnce([]);

      await service.getPublishedDetailBySlug('xolvon-dashboard');

      const [memberSql] = mockDb.queryAll.mock.calls[1];
      expect(memberSql).toContain('JOIN collective_members');
      expect(memberSql).toContain('project_members');
    });

    it('should throw NotFoundException for a draft or unknown slug', async () => {
      // A draft row exercises the in-code published-only guard (courses
      // convention) — provable without relying on the storage layer.
      mockDb.queryOne.mockResolvedValueOnce({ ...projectRow, status: 'draft' });

      await expect(service.getPublishedDetailBySlug('draft-project')).rejects.toThrow(
        NotFoundException,
      );

      const [sql, params] = mockDb.queryOne.mock.calls[0];
      expect(sql).toContain("status = 'published'");
      expect(params).toEqual(['draft-project']);
    });
  });

  // ---------------------------------------------------------------------------
  // createProject
  // ---------------------------------------------------------------------------
  describe('createProject', () => {
    const dto = {
      title: 'Xolvon Dashboard',
      slug: 'xolvon-dashboard',
      type: 'web-app',
      summary: 'Internal analytics dashboard.',
      problem: 'Data scattered across tools.',
      solution: 'Single source of truth dashboard.',
      techStack: 'Next.js, TypeScript',
      result: null as string | null,
    };

    it('should insert a draft project and record the create audit', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined); // slug uniqueness check

      const result = await service.createProject('admin-1', dto);

      expect(result.status).toBe('draft');
      expect(result.slug).toBe('xolvon-dashboard');
      expect(result.techStack).toEqual(['Next.js', 'TypeScript']);

      const [insertSql, insertParams] = mockDb.execute.mock.calls[0];
      expect(insertSql).toContain('INSERT INTO projects');
      // Status is a SQL literal (courses convention, courses.service.ts:131),
      // not a bind parameter — slug and type are the meaningful params.
      expect(insertSql).toContain("'draft'");
      expect(insertParams).toEqual(
        expect.arrayContaining(['xolvon-dashboard', 'web-app']),
      );

      expect(mockAudit.record).toHaveBeenCalledWith(
        'admin-1',
        'create',
        'project',
        result.id,
        expect.objectContaining({ slug: 'xolvon-dashboard' }),
      );
    });

    it('should reject a duplicate slug with ConflictException', async () => {
      mockDb.queryOne.mockResolvedValueOnce({ id: 'existing' });

      await expect(service.createProject('admin-1', dto)).rejects.toThrow(ConflictException);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // updateProject
  // ---------------------------------------------------------------------------
  describe('updateProject', () => {
    it('should update only the provided fields and record the update audit', async () => {
      mockDb.queryOne
        .mockResolvedValueOnce(projectRow) // current row
        .mockResolvedValueOnce(undefined); // slug uniqueness check (self-excluded)

      const result = await service.updateProject('admin-1', projectRow.id, {
        summary: 'Updated summary.',
        techStack: 'Next.js',
      });

      expect(result.summary).toBe('Updated summary.');
      expect(result.title).toBe(projectRow.title);
      expect(result.techStack).toEqual(['Next.js']);

      const [updateSql, updateParams] = mockDb.execute.mock.calls[0];
      expect(updateSql).toContain('summary = ?');
      expect(updateSql).toContain('tech_stack = ?');
      expect(updateSql).not.toContain('title = ?');
      expect(updateSql).toContain('updated_at = ?');
      expect(updateParams).toEqual(
        expect.arrayContaining(['Updated summary.', 'Next.js', projectRow.id]),
      );

      expect(mockAudit.record).toHaveBeenCalledWith(
        'admin-1',
        'update',
        'project',
        projectRow.id,
        expect.objectContaining({ fields: ['summary', 'techStack'] }),
      );
    });

    it('should throw NotFoundException when the project does not exist', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(
        service.updateProject('admin-1', projectRow.id, { title: 'New' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // publishProject / unpublishProject
  // ---------------------------------------------------------------------------
  describe('publishProject', () => {
    it('should reject publishing when required fields are empty', async () => {
      mockDb.queryOne.mockResolvedValueOnce({
        ...projectRow,
        status: 'draft',
        type: null,
        summary: null,
        problem: null,
        solution: null,
      });

      await expect(service.publishProject('admin-1', projectRow.id)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockDb.execute).not.toHaveBeenCalled();
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    it('should set status published and record the publish audit', async () => {
      mockDb.queryOne.mockResolvedValueOnce({ ...projectRow, status: 'draft' });

      const result = await service.publishProject('admin-1', projectRow.id);

      expect(result.status).toBe('published');
      const [updateSql, updateParams] = mockDb.execute.mock.calls[0];
      expect(updateSql).toContain("SET status = 'published'");
      expect(updateParams[updateParams.length - 1]).toBe(projectRow.id);
      expect(mockAudit.record).toHaveBeenCalledWith(
        'admin-1',
        'publish',
        'project',
        projectRow.id,
        expect.anything(),
      );
    });

    it('should throw NotFoundException when the project does not exist', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(service.publishProject('admin-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('unpublishProject', () => {
    it('should set status draft and record the unpublish audit', async () => {
      mockDb.queryOne.mockResolvedValueOnce(projectRow);

      const result = await service.unpublishProject('admin-1', projectRow.id);

      expect(result.status).toBe('draft');
      const [updateSql] = mockDb.execute.mock.calls[0];
      expect(updateSql).toContain("SET status = 'draft'");
      expect(mockAudit.record).toHaveBeenCalledWith(
        'admin-1',
        'unpublish',
        'project',
        projectRow.id,
        expect.anything(),
      );
    });
  });
});
