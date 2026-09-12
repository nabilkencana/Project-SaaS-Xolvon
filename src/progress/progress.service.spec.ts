import { ProgressService } from './progress.service';
import { DatabaseService } from '../database/database.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';

describe('ProgressService', () => {
  it('binds writes to the authenticated user and updates existing progress idempotently', async () => {
    const db = {
      queryOne: jest.fn()
        .mockResolvedValueOnce({ id: 'lesson-1', course_id: 'course-1' })
        .mockResolvedValueOnce({ id: 'progress-1' })
        .mockResolvedValueOnce({ lesson_id: 'lesson-1', completed: 1, completed_at: '2026-09-12T00:00:00.000Z', updated_at: '2026-09-12T00:00:00.000Z' }),
      queryAll: jest.fn(),
      execute: jest.fn(),
    };
    const enrollments = { isUserEntitled: jest.fn().mockResolvedValue(true) };
    const service = new ProgressService(db as unknown as DatabaseService, enrollments as unknown as EnrollmentsService);

    await service.update('user-a', { lessonId: 'lesson-1', completed: true });

    expect(enrollments.isUserEntitled).toHaveBeenCalledWith('user-a', 'course-1');
    expect(db.execute).toHaveBeenCalledWith(expect.stringContaining('UPDATE progress'), expect.arrayContaining(['course-1', 1]));
    expect(db.execute.mock.calls[0][1]).not.toContain('user-b');
  });
});
