import { NotFoundException } from '@nestjs/common';
import { ProjectMediaService } from './project-media.service';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';

describe('ProjectMediaService', () => {
  let service: ProjectMediaService;
  let mockDb: { queryAll: jest.Mock; queryOne: jest.Mock; execute: jest.Mock };
  let mockAudit: { record: jest.Mock };

  beforeEach(() => {
    mockDb = {
      queryAll: jest.fn(),
      queryOne: jest.fn(),
      execute: jest.fn(),
    };
    mockAudit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new ProjectMediaService(
      mockDb as unknown as DatabaseService,
      mockAudit as unknown as AuditService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // attachMedia
  // ---------------------------------------------------------------------------
  describe('attachMedia', () => {
    it('should insert media with defaults and record the create audit', async () => {
      mockDb.queryOne.mockResolvedValueOnce({ id: 'project-1' }); // project exists

      const result = await service.attachMedia('admin-1', 'project-1', {
        objectKey: 'projects/project-1/shot-1.png',
        mediaType: 'image',
      });

      expect(result).toMatchObject({
        objectKey: 'projects/project-1/shot-1.png',
        mediaType: 'image',
        sortOrder: 0,
        projectId: 'project-1',
      });
      expect(result.id).toBeDefined();

      const [insertSql, insertParams] = mockDb.execute.mock.calls[0];
      expect(insertSql).toContain('INSERT INTO project_media');
      expect(insertParams).toEqual(
        expect.arrayContaining(['projects/project-1/shot-1.png', 'image', 0, 'project-1']),
      );

      expect(mockAudit.record).toHaveBeenCalledWith(
        'admin-1',
        'create',
        'project_media',
        result.id,
        expect.objectContaining({ project_id: 'project-1', media_type: 'image' }),
      );
    });

    it('should persist the provided sort_order', async () => {
      mockDb.queryOne.mockResolvedValueOnce({ id: 'project-1' });

      const result = await service.attachMedia('admin-1', 'project-1', {
        objectKey: 'projects/project-1/deck.pdf',
        mediaType: 'deck',
        sortOrder: 3,
      });

      expect(result.sortOrder).toBe(3);
      const [, insertParams] = mockDb.execute.mock.calls[0];
      expect(insertParams).toEqual(
        expect.arrayContaining([3]),
      );
    });

    it('should throw NotFoundException when the project does not exist', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(
        service.attachMedia('admin-1', 'missing', {
          objectKey: 'projects/missing/x.png',
          mediaType: 'image',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // detachMedia
  // ---------------------------------------------------------------------------
  describe('detachMedia', () => {
    it('should delete media scoped to the project and record the delete audit', async () => {
      mockDb.queryOne.mockResolvedValueOnce({
        id: 'media-1',
        project_id: 'project-1',
        object_key: 'projects/project-1/shot-1.png',
        media_type: 'image',
        sort_order: 0,
      });

      const result = await service.detachMedia('admin-1', 'project-1', 'media-1');

      expect(result.message).toBeDefined();
      const [deleteSql, deleteParams] = mockDb.execute.mock.calls[0];
      expect(deleteSql).toContain('DELETE FROM project_media');
      expect(deleteParams).toEqual(['media-1', 'project-1']);
      expect(mockAudit.record).toHaveBeenCalledWith(
        'admin-1',
        'delete',
        'project_media',
        'media-1',
        expect.objectContaining({ project_id: 'project-1' }),
      );
    });

    it('should throw NotFoundException when media does not belong to the project', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(
        service.detachMedia('admin-1', 'project-1', 'other-media'),
      ).rejects.toThrow(NotFoundException);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });
  });
});
