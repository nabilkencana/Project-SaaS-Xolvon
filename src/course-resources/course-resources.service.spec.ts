import { NotFoundException } from '@nestjs/common';
import { CourseResourcesService } from './course-resources.service';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import type { CourseResourceRow } from './interfaces/course-resource.interface';
import { CreateCourseResourceDto } from './dto/create-course-resource.dto';

function makeResourceRow(overrides: Partial<CourseResourceRow> = {}): CourseResourceRow {
  return {
    id: 'res-1',
    lesson_id: 'lesson-1',
    course_id: 'course-1',
    type: 'pdf',
    object_key: 'lessons/lesson-1/slides.pdf',
    title: 'Slides',
    metadata: null,
    created_at: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeCreateDto(overrides: Partial<CreateCourseResourceDto> = {}): CreateCourseResourceDto {
  return Object.assign(new CreateCourseResourceDto(), {
    type: 'pdf',
    objectKey: 'lessons/lesson-1/slides.pdf',
    title: 'Slides',
    ...overrides,
  });
}

describe('CourseResourcesService', () => {
  let service: CourseResourcesService;
  let mockDb: { queryAll: jest.Mock; queryOne: jest.Mock; execute: jest.Mock };
  let mockAudit: { record: jest.Mock };

  beforeEach(() => {
    mockDb = {
      queryAll: jest.fn(),
      queryOne: jest.fn(),
      execute: jest.fn(),
    };
    mockAudit = { record: jest.fn().mockResolvedValue(undefined) };

    service = new CourseResourcesService(
      mockDb as unknown as DatabaseService,
      mockAudit as unknown as AuditService,
    );
  });

  describe('create', () => {
    it('inserts the resource bound to the lesson and audits create', async () => {
      mockDb.queryOne.mockResolvedValueOnce({ id: 'lesson-1', course_id: 'course-1' });

      const result = await service.create('admin-1', 'lesson-1', makeCreateDto());

      expect(result).toMatchObject({
        lessonId: 'lesson-1',
        courseId: 'course-1',
        type: 'pdf',
        objectKey: 'lessons/lesson-1/slides.pdf',
        title: 'Slides',
      });
      expect(typeof result.id).toBe('string');

      const [insertSql, insertParams] = mockDb.execute.mock.calls[0];
      expect(insertSql).toContain('INSERT INTO course_resources');
      expect(insertParams[1]).toBe('lesson-1');
      expect(insertParams[2]).toBe('course-1');
      expect(insertParams[3]).toBe('pdf');
      expect(insertParams[4]).toBe('lessons/lesson-1/slides.pdf');
      expect(insertParams[5]).toBe('Slides');

      expect(mockAudit.record).toHaveBeenCalledWith(
        'admin-1',
        'create',
        'course_resource',
        expect.any(String),
        { lessonId: 'lesson-1', type: 'pdf' },
      );
    });

    it('404s when the lesson does not exist and writes nothing', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(
        service.create('admin-1', 'ghost', makeCreateDto()),
      ).rejects.toThrow(NotFoundException);

      expect(mockDb.execute).not.toHaveBeenCalled();
      expect(mockAudit.record).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('hard deletes the resource and audits delete', async () => {
      mockDb.queryOne.mockResolvedValueOnce(makeResourceRow());

      await service.remove('admin-1', 'res-1');

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
      const [deleteSql, deleteParams] = mockDb.execute.mock.calls[0];
      expect(deleteSql).toContain('DELETE FROM course_resources WHERE id = ?');
      expect(deleteParams).toEqual(['res-1']);

      expect(mockAudit.record).toHaveBeenCalledWith(
        'admin-1',
        'delete',
        'course_resource',
        'res-1',
        { lessonId: 'lesson-1', type: 'pdf' },
      );
    });

    it('404s for an unknown resource and deletes nothing', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(service.remove('admin-1', 'ghost')).rejects.toThrow(NotFoundException);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });
  });
});
