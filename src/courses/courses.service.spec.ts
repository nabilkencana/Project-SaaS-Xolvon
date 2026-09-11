import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import type { CourseRow, LessonRow } from './interfaces/course.interface';

function makeCourseRow(overrides: Partial<CourseRow> = {}): CourseRow {
  return {
    id: 'course-1',
    title: 'Video SaaS Mastery',
    slug: 'video-saas',
    description: 'Build video products end to end',
    price: 250000,
    thumbnail_url: null,
    status: 'published',
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeLessonRow(overrides: Partial<LessonRow> = {}): LessonRow {
  return {
    id: 'lesson-1',
    course_id: 'course-1',
    title: 'Intro',
    content: 'secret-content',
    video_object_key: 'courses/secret.mp4',
    order_index: 1,
    status: 'published',
    created_at: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('CoursesService', () => {
  let service: CoursesService;
  let mockDb: { queryAll: jest.Mock; queryOne: jest.Mock; execute: jest.Mock };
  let mockAudit: { record: jest.Mock };

  beforeEach(() => {
    mockDb = {
      queryAll: jest.fn(),
      queryOne: jest.fn(),
      execute: jest.fn(),
    };
    mockAudit = { record: jest.fn().mockResolvedValue(undefined) };

    service = new CoursesService(
      mockDb as unknown as DatabaseService,
      mockAudit as unknown as AuditService,
    );
  });

  // ---------------------------------------------------------------------------
  // listPublished
  // ---------------------------------------------------------------------------
  describe('listPublished', () => {
    it('returns the {items, page, limit, total, query} envelope with mapped cards', async () => {
      mockDb.queryAll.mockResolvedValueOnce([
        makeCourseRow(),
        makeCourseRow({
          id: 'course-2',
          slug: 'crm-saas',
          description: null,
          thumbnail_url: 'https://cdn.example.com/cover.png',
        }),
      ]);
      mockDb.queryOne.mockResolvedValueOnce({ total: 2 });

      const result = await service.listPublished({ page: 1, limit: 20 });

      expect(result).toMatchObject({ page: 1, limit: 20, total: 2, query: null });
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({
        id: 'course-1',
        title: 'Video SaaS Mastery',
        slug: 'video-saas',
        description: 'Build video products end to end',
        price: 250000,
        thumbnailUrl: null,
        status: 'published',
      });
      // A null description column maps to an empty string, never null/undefined.
      expect(result.items[1].description).toBe('');
      expect(result.items[1].thumbnailUrl).toBe('https://cdn.example.com/cover.png');
    });

    it('echoes the ?q= term in the query field of the envelope', async () => {
      mockDb.queryAll.mockResolvedValueOnce([]);
      mockDb.queryOne.mockResolvedValueOnce({ total: 0 });

      const result = await service.listPublished({ page: 1, limit: 20, q: 'video' });

      expect(result.query).toBe('video');
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

    it('scopes ?q= to the title as a contains search with escaped LIKE wildcards and bind params', async () => {
      mockDb.queryAll.mockResolvedValueOnce([]);
      mockDb.queryOne.mockResolvedValueOnce({ total: 0 });

      await service.listPublished({ page: 1, limit: 20, q: '100%_done' });

      const [rowsSql, rowsParams] = mockDb.queryAll.mock.calls[0];
      expect(rowsSql).toContain('title LIKE ?');
      expect(rowsSql).toContain("ESCAPE '\\'");
      // % and _ are escaped so the visitor query matches literally, then the
      // escaped term is wrapped with % for contains semantics.
      expect(rowsParams).toEqual(['%100\\%\\_done%', 20, 0]);
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
    it('returns the detail with lesson summaries ordered by order_index', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeCourseRow());
      mockDb.queryAll.mockResolvedValueOnce([
        makeLessonRow({ id: 'lesson-1', order_index: 1 }),
        makeLessonRow({ id: 'lesson-2', title: 'Setup', order_index: 2, status: 'draft' }),
      ]);

      const result = await service.getPublishedBySlug('video-saas');

      expect(result).toMatchObject({
        id: 'course-1',
        slug: 'video-saas',
        price: 250000,
        status: 'published',
      });
      expect(result.lessons).toEqual([
        { id: 'lesson-1', title: 'Intro', orderIndex: 1, status: 'published' },
        { id: 'lesson-2', title: 'Setup', orderIndex: 2, status: 'draft' },
      ]);

      const [lessonsSql] = mockDb.queryAll.mock.calls[0];
      expect(lessonsSql).toContain('ORDER BY order_index ASC');
    });

    it('never leaks lesson content, video object keys, or signed URLs (SCHEMA.md §17)', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeCourseRow());
      mockDb.queryAll.mockResolvedValueOnce([makeLessonRow()]);

      const result = await service.getPublishedBySlug('video-saas');

      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain('video_object_key');
      expect(serialized).not.toContain('videoObjectKey');
      expect(serialized).not.toContain('courses/secret.mp4');
      expect(serialized).not.toContain('secret-content');
      expect(serialized).not.toContain('content');
      // The lessons query selects safe columns only — no *.
      const [lessonsSql] = mockDb.queryAll.mock.calls[0];
      expect(lessonsSql).not.toContain('*');
      expect(lessonsSql).not.toContain('video_object_key');
    });

    it('returns 404 for a draft course (published-only lookup)', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeCourseRow({ status: 'draft' }));

      await expect(service.getPublishedBySlug('video-saas')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockDb.queryAll).not.toHaveBeenCalled();
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
      title: 'Video SaaS Mastery',
      slug: 'video-saas',
      description: 'Build video products end to end',
      price: 250000,
      thumbnailUrl: 'https://cdn.example.com/cover.png',
    };

    it('inserts a draft course with a server-generated UUID and audits create', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined); // slug available

      const result = await service.create('admin-1', dto);

      expect(result).toMatchObject({
        title: 'Video SaaS Mastery',
        slug: 'video-saas',
        description: 'Build video products end to end',
        price: 250000,
        thumbnailUrl: 'https://cdn.example.com/cover.png',
        status: 'draft',
      });

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
      const [insertSql, insertParams] = mockDb.execute.mock.calls[0];
      expect(insertSql).toContain('INSERT INTO courses');
      expect(insertSql).toContain("'draft'");
      expect(insertParams).toEqual([
        result.id,
        'Video SaaS Mastery',
        'video-saas',
        'Build video products end to end',
        250000,
        'https://cdn.example.com/cover.png',
        expect.any(String),
        expect.any(String),
      ]);

      expect(mockAudit.record).toHaveBeenCalledWith(
        'admin-1',
        'create',
        'course',
        result.id,
        expect.any(Object),
      );
    });

    it('rejects a duplicate slug with 409', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeCourseRow()); // slug taken

      await expect(service.create('admin-1', dto)).rejects.toThrow(ConflictException);
      expect(mockDb.execute).not.toHaveBeenCalled();
      expect(mockAudit.record).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('applies only provided fields and audits update', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeCourseRow());

      const result = await service.update('admin-1', 'course-1', {
        title: 'Video SaaS Pro',
        price: 300000,
      });

      expect(result).toMatchObject({
        id: 'course-1',
        title: 'Video SaaS Pro',
        price: 300000,
        // Untouched fields survive.
        slug: 'video-saas',
        status: 'published',
      });

      const [updateSql] = mockDb.execute.mock.calls[0];
      expect(updateSql).toContain('UPDATE courses');
      expect(updateSql).toContain('title = ?');
      expect(updateSql).toContain('price = ?');
      expect(updateSql).not.toContain('slug = ?');

      expect(mockAudit.record).toHaveBeenCalledWith(
        'admin-1',
        'update',
        'course',
        'course-1',
        expect.any(Object),
      );
    });

    it('re-checks slug uniqueness only when the slug actually changes', async () => {
      mockDb.queryOne
        .mockResolvedValueOnce(makeCourseRow()) // target course
        .mockResolvedValueOnce(undefined); // new slug available

      const result = await service.update('admin-1', 'course-1', { slug: 'video-saas-pro' });

      expect(result.slug).toBe('video-saas-pro');
      const [updateSql, updateParams] = mockDb.execute.mock.calls[0];
      expect(updateSql).toContain('slug = ?');
      expect(updateParams).toContain('video-saas-pro');
    });

    it('rejects a duplicate slug with 409', async () => {
      mockDb.queryOne
        .mockResolvedValueOnce(makeCourseRow())
        .mockResolvedValueOnce(makeCourseRow({ id: 'other', slug: 'taken' }));

      await expect(
        service.update('admin-1', 'course-1', { slug: 'taken' }),
      ).rejects.toThrow(ConflictException);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it('keeps the slug untouched (no conflict) when the sent slug equals the current one', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeCourseRow());

      const result = await service.update('admin-1', 'course-1', { slug: 'video-saas' });

      expect(result.slug).toBe('video-saas');
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it('returns 404 for an unknown course', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(
        service.update('admin-1', 'missing', { title: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // publish / unpublish
  // ---------------------------------------------------------------------------
  describe('publish', () => {
    it('transitions draft → published and audits publish', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeCourseRow({ status: 'draft' }));

      const result = await service.publish('admin-1', 'course-1');

      expect(result.status).toBe('published');
      const [updateSql, updateParams] = mockDb.execute.mock.calls[0];
      expect(updateSql).toContain("SET status = 'published'");
      expect(updateParams[updateParams.length - 1]).toBe('course-1');
      expect(mockAudit.record).toHaveBeenCalledWith(
        'admin-1',
        'publish',
        'course',
        'course-1',
        expect.any(Object),
      );
    });

    it('rejects publishing a course without a description (required fields check)', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeCourseRow({ status: 'draft', description: null }));

      await expect(service.publish('admin-1', 'course-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockDb.execute).not.toHaveBeenCalled();
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    it('rejects publishing a course with a whitespace-only description', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeCourseRow({ status: 'draft', description: '   ' }));

      await expect(service.publish('admin-1', 'course-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it('rejects publishing an already published course with 400 (strict transition)', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeCourseRow({ status: 'published' }));

      await expect(service.publish('admin-1', 'course-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockDb.execute).not.toHaveBeenCalled();
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    it('returns 404 for an unknown course', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(service.publish('admin-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('unpublish', () => {
    it('transitions published → draft and audits unpublish', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeCourseRow({ status: 'published' }));

      const result = await service.unpublish('admin-1', 'course-1');

      expect(result.status).toBe('draft');
      const [updateSql] = mockDb.execute.mock.calls[0];
      expect(updateSql).toContain("SET status = 'draft'");
      expect(mockAudit.record).toHaveBeenCalledWith(
        'admin-1',
        'unpublish',
        'course',
        'course-1',
        expect.any(Object),
      );
    });

    it('rejects unpublishing an already draft course with 400 (strict transition)', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeCourseRow({ status: 'draft' }));

      await expect(service.unpublish('admin-1', 'course-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockDb.execute).not.toHaveBeenCalled();
      expect(mockAudit.record).not.toHaveBeenCalled();
    });
  });
});
