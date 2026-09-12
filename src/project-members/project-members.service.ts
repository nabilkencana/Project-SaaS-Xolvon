import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import type { AssignProjectMemberDto } from './dto/assign-project-member.dto';

/**
 * Admin management of the Project ↔ Collective Member many-to-many relation
 * (SCHEMA.md §51-53). Role attribution is mandatory and explicit; `role` stays
 * a controlled string because the final enum is not locked (SCHEMA.md §52).
 */
@Injectable()
export class ProjectMembersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Admin: assign a collective member to a project with an explicit role.
   * Upsert on (project_id, member_id): re-assigning updates the role
   * atomically instead of failing on the composite primary key.
   */
  async assignMember(
    adminId: string,
    projectId: string,
    dto: AssignProjectMemberDto,
  ): Promise<{ projectId: string; memberId: string; role: string }> {
    const project = await this.db.queryOne<{ id: string }>(
      'SELECT id FROM projects WHERE id = ? LIMIT 1;',
      [projectId],
    );
    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    const member = await this.db.queryOne<{ id: string }>(
      'SELECT id FROM collective_members WHERE id = ? LIMIT 1;',
      [dto.memberId],
    );
    if (!member) {
      throw new NotFoundException('Collective member not found.');
    }

    await this.db.execute(
      `INSERT INTO project_members (project_id, member_id, role) VALUES (?, ?, ?)
       ON CONFLICT(project_id, member_id) DO UPDATE SET role = excluded.role;`,
      [projectId, dto.memberId, dto.role],
    );

    await this.audit.record(adminId, 'create', 'project_member', projectId, {
      member_id: dto.memberId,
      role: dto.role,
    });

    return { projectId, memberId: dto.memberId, role: dto.role };
  }

  /** Admin: remove a member assignment, scoped to the project + audit 'delete'. */
  async removeMember(
    adminId: string,
    projectId: string,
    memberId: string,
  ): Promise<{ message: string }> {
    const assignment = await this.db.queryOne<{ member_id: string }>(
      'SELECT member_id FROM project_members WHERE project_id = ? AND member_id = ? LIMIT 1;',
      [projectId, memberId],
    );
    if (!assignment) {
      throw new NotFoundException('Member assignment not found for this project.');
    }

    await this.db.execute('DELETE FROM project_members WHERE project_id = ? AND member_id = ?;', [
      projectId,
      memberId,
    ]);

    await this.audit.record(adminId, 'delete', 'project_member', projectId, {
      member_id: memberId,
    });

    return { message: 'Project member removed.' };
  }
}
