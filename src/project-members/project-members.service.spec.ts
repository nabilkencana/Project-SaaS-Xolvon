import { NotFoundException } from '@nestjs/common';
import { ProjectMembersService } from './project-members.service';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';

describe('ProjectMembersService', () => {
  let service: ProjectMembersService;
  let mockDb: { queryAll: jest.Mock; queryOne: jest.Mock; execute: jest.Mock };
  let mockAudit: { record: jest.Mock };

  beforeEach(() => {
    mockDb = {
      queryAll: jest.fn(),
      queryOne: jest.fn(),
      execute: jest.fn(),
    };
    mockAudit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new ProjectMembersService(
      mockDb as unknown as DatabaseService,
      mockAudit as unknown as AuditService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // assignMember
  // ---------------------------------------------------------------------------
  describe('assignMember', () => {
    it('should upsert the assignment (idempotent on re-assign) and record the audit', async () => {
      mockDb.queryOne
        .mockResolvedValueOnce({ id: 'project-1' }) // project exists
        .mockResolvedValueOnce({ id: 'member-1' }); // collective member exists

      const result = await service.assignMember('admin-1', 'project-1', {
        memberId: 'member-1',
        role: 'BE',
      });

      expect(result).toEqual({ projectId: 'project-1', memberId: 'member-1', role: 'BE' });

      const [upsertSql, upsertParams] = mockDb.execute.mock.calls[0];
      expect(upsertSql).toContain('INSERT INTO project_members');
      expect(upsertSql).toContain('ON CONFLICT(project_id, member_id) DO UPDATE SET');
      expect(upsertSql).toContain('role = excluded.role');
      expect(upsertParams).toEqual(['project-1', 'member-1', 'BE']);

      expect(mockAudit.record).toHaveBeenCalledWith(
        'admin-1',
        'create',
        'project_member',
        'project-1',
        expect.objectContaining({ member_id: 'member-1', role: 'BE' }),
      );
    });

    it('should throw NotFoundException when the project does not exist', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(
        service.assignMember('admin-1', 'missing', { memberId: 'member-1', role: 'BE' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the collective member does not exist', async () => {
      mockDb.queryOne
        .mockResolvedValueOnce({ id: 'project-1' })
        .mockResolvedValueOnce(undefined);

      await expect(
        service.assignMember('admin-1', 'project-1', { memberId: 'ghost', role: 'BE' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // removeMember
  // ---------------------------------------------------------------------------
  describe('removeMember', () => {
    it('should delete the assignment scoped to the project and record the audit', async () => {
      mockDb.queryOne.mockResolvedValueOnce({ member_id: 'member-1' });

      const result = await service.removeMember('admin-1', 'project-1', 'member-1');

      expect(result.message).toBeDefined();
      const [deleteSql, deleteParams] = mockDb.execute.mock.calls[0];
      expect(deleteSql).toContain('DELETE FROM project_members');
      expect(deleteParams).toEqual(['project-1', 'member-1']);
      expect(mockAudit.record).toHaveBeenCalledWith(
        'admin-1',
        'delete',
        'project_member',
        'project-1',
        expect.objectContaining({ member_id: 'member-1' }),
      );
    });

    it('should throw NotFoundException when the assignment does not exist', async () => {
      mockDb.queryOne.mockResolvedValueOnce(undefined);

      await expect(
        service.removeMember('admin-1', 'project-1', 'ghost'),
      ).rejects.toThrow(NotFoundException);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });
  });
});
