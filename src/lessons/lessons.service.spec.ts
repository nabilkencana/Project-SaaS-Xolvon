import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import type { LessonRow } from './interfaces/lesson.interface';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { ReorderLessonDto } from './dto/reorder-lesson.dto';

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

function makeCreateDto(overrides: Partial<CreateLessonDto> = {}): CreateLessonDto {
  return Object.assign(new CreateLessonDto(), {
    title: 'Intro',
    content: 'Hello world',
    orderIndex: 1,
    ...overrides,
  });
}

describe('LessonsService', () => {
  let service: LessonsService;
  let mockDb: { queryAll: jest.Mock; queryOne: jest.Mock; execute: jest.Mock };
  let mockAudit: { record: jest.Mock };

  beforeEach(() => {
    mockDb = {
      queryAll: jest.fn(),
      queryOne: jest.fn(),
      execute: jest.fn(),
    };
    mockAudit = { record: jest.fn().mockResolvedValue(undefined) };

    service = new LessonsService(
      mockDb as unknown as DatabaseService,
      mockAudit as unknown as AuditService,
    );
  });

  describe('listPublishedByCourseSlug', () => {
    it('returns published lessons of a published course ordered by order_index ASC', async () => {
      mockDb.queryOne.mockResolvedValueOnce({ id: 'course-1', status: 'published' });
      mockDb.queryAll.mockResolvedValueOnce([
        makeLessonRow({ id: 'lesson-b', order_index: 2, title: 'Zebra' }),
        makeLessonRow({ id: 'lesson-a', order_index: 1, title: 'Alpha' }),
      ]);

      const result = await service.listPublishedByCourseSlug('video-saas');

      expect(result).toEqual([
        { id: 'lesson-b', title: 'Zebra', orderIndex: 2, status: 'published' },
        { id: 'lesson-a', title: 'Alpha', orderIndex: 1, status: 'published' },
      ]);

      const [courseSql] = mockDb.queryOne.mock.calls[0];
      expect(courseSql).toContain('FROM courses WHERE slug = ?');

      const [lessonsSql, lessonsParams] = mockDb.queryAll.mock.calls[0];
      expect(lessonsSql).toContain("status = 'published'");
      expect(lessonsSql).toContain('ORDER BY order_index ASC');
      expect(lessonsSql).not.toContain('content');
      expect(lessonsSql).not.toContain('video_object_key');
      expect(lessonsParams).toEqual(['course-1']);
    });

    it('404s when the slug is unknown', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(service.listPublishedByCourseSlug('ghost')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockDb.queryAll).not.toHaveBeenCalled();
    });

    it('404s when the course is a draft (published-only public surface)', async () => {
      mockDb.queryOne.mockResolvedValueOnce({ id: 'course-1', status: 'draft' });

      await expect(service.listPublishedByCourseSlug('draft-course')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockDb.queryAll).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('inserts a draft lesson bound to the course and audits create', async () => {
      mockDb.queryOne.mockResolvedValueOnce({ id: 'course-1', status: 'draft' });

      const result = await service.create('admin-1', 'course-1', makeCreateDto());

      expect(result).toMatchObject({
        courseId: 'course-1',
        title: 'Intro',
        content: 'Hello world',
        orderIndex: 1,
        status: 'draft',
      });
      expect(typeof result.id).toBe('string');

      const [insertSql, insertParams] = mockDb.execute.mock.calls[0];
      expect(insertSql).toContain('INSERT INTO lessons');
      expect(insertSql).toContain("'draft'");
      expect(insertParams[1]).toBe('course-1');
      expect(insertParams[2]).toBe('Intro');
      expect(insertParams[3]).toBe('Hello world');
      expect(insertParams[5]).toBe(1);

      expect(mockAudit.record).toHaveBeenCalledWith(
        'admin-1',
        'create',
        'lesson',
        expect.any(String),
        expect.objectContaining({ courseId: 'course-1' }),
      );
    });

    it('stores null content when omitted', async () => {
      mockDb.queryOne.mockResolvedValueOnce({ id: 'course-1', status: 'draft' });

      await service.create('admin-1', 'course-1', makeCreateDto({ content: undefined }));

      const [, insertParams] = mockDb.execute.mock.calls[0];
      expect(insertParams[3]).toBeNull();
    });

    it('404s when the course does not exist and writes nothing', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(
        service.create('admin-1', 'missing-course', makeCreateDto()),
      ).rejects.toThrow(NotFoundException);

      expect(mockDb.execute).not.toHaveBeenCalled();
      expect(mockAudit.record).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('applies only provided fields and audits update', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeLessonRow({ status: 'draft' }));

      const result = await service.update(
        'admin-1',
        'lesson-1',
        Object.assign(new UpdateLessonDto(), { title: 'Renamed', content: 'New body' }),
      );

      expect(result).toMatchObject({ title: 'Renamed', content: 'New body' });

      const [updateSql, updateParams] = mockDb.execute.mock.calls[0];
      expect(updateSql).toContain('UPDATE lessons SET');
      expect(updateSql).toContain('title = ?');
      expect(updateSql).toContain('content = ?');
      expect(updateSql).not.toContain('order_index = ?');
      expect(updateParams).toEqual(['Renamed', 'New body', 'lesson-1']);

      expect(mockAudit.record).toHaveBeenCalledWith(
        'admin-1',
        'update',
        'lesson',
        'lesson-1',
        expect.objectContaining({ fields: ['title', 'content'] }),
      );
    });

    it('returns the row unchanged without SQL when the payload is empty', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeLessonRow());

      const result = await service.update('admin-1', 'lesson-1', new UpdateLessonDto());

      expect(result.id).toBe('lesson-1');
      expect(mockDb.execute).not.toHaveBeenCalled();
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    it('404s for an unknown lesson', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(
        service.update('admin-1', 'ghost', Object.assign(new UpdateLessonDto(), { title: 'X' })),
      ).rejects.toThrow(NotFoundException);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });
  });

  describe('reorder', () => {
    it('writes the new order_index and audits update', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeLessonRow({ order_index: 1 }));

      const result = await service.reorder(
        'admin-1',
        'lesson-1',
        Object.assign(new ReorderLessonDto(), { orderIndex: 3 }),
      );

      expect(result.orderIndex).toBe(3);

      const [updateSql, updateParams] = mockDb.execute.mock.calls[0];
      expect(updateSql).toContain('UPDATE lessons SET order_index = ? WHERE id = ?');
      expect(updateParams).toEqual([3, 'lesson-1']);

      expect(mockAudit.record).toHaveBeenCalledWith(
        'admin-1',
        'update',
        'lesson',
        'lesson-1',
        { from: 1, to: 3 },
      );
    });

    it('404s for an unknown lesson', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(
        service.reorder(
          'admin-1',
          'ghost',
          Object.assign(new ReorderLessonDto(), { orderIndex: 2 }),
        ),
      ).rejects.toThrow(NotFoundException);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });
  });

  describe('publish / unpublish', () => {
    it('publishes a draft lesson and audits publish', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeLessonRow({ status: 'draft' }));

      const result = await service.publish('admin-1', 'lesson-1');

      expect(result.status).toBe('published');
      const [updateSql] = mockDb.execute.mock.calls[0];
      expect(updateSql).toContain("UPDATE lessons SET status = 'published' WHERE id = ?");
      expect(mockAudit.record).toHaveBeenCalledWith('admin-1', 'publish', 'lesson', 'lesson-1', {
        courseId: 'course-1',
      });
    });

    it('rejects publishing an already published lesson with 400', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeLessonRow({ status: 'published' }));

      await expect(service.publish('admin-1', 'lesson-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it('unpublishes a published lesson and audits unpublish', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeLessonRow({ status: 'published' }));

      const result = await service.unpublish('admin-1', 'lesson-1');

      expect(result.status).toBe('draft');
      const [updateSql] = mockDb.execute.mock.calls[0];
      expect(updateSql).toContain("UPDATE lessons SET status = 'draft' WHERE id = ?");
      expect(mockAudit.record).toHaveBeenCalledWith('admin-1', 'unpublish', 'lesson', 'lesson-1', {
        courseId: 'course-1',
      });
    });

    it('rejects unpublishing an already draft lesson with 400', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeLessonRow({ status: 'draft' }));

      await expect(service.unpublish('admin-1', 'lesson-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockDb.execute).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('hard deletes the lesson and its resources first, then audits delete', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeLessonRow());

      await service.remove('admin-1', 'lesson-1');

      expect(mockDb.execute).toHaveBeenCalledTimes(2);
      const [resourcesSql] = mockDb.execute.mock.calls[0];
      expect(resourcesSql).toContain('DELETE FROM course_resources WHERE lesson_id = ?');
      const [lessonSql, lessonParams] = mockDb.execute.mock.calls[1];
      expect(lessonSql).toContain('DELETE FROM lessons WHERE id = ?');
      expect(lessonParams).toEqual(['lesson-1']);

      expect(mockAudit.record).toHaveBeenCalledWith('admin-1', 'delete', 'lesson', 'lesson-1', {
        courseId: 'course-1',
      });
    });

    it('404s for an unknown lesson and deletes nothing', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(service.remove('admin-1', 'ghost')).rejects.toThrow(NotFoundException);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });
  });
});
