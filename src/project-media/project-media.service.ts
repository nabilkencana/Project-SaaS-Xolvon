import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import type { ProjectMediaRow } from '../projects/interfaces/project.interface';
import type { AttachProjectMediaDto } from './dto/attach-project-media.dto';
import { ProjectMediaResponseDto } from './dto/project-media-response.dto';

/**
 * Admin management of `project_media` rows (SCHEMA.md §49). Presentation
 * order is owned by `sort_order` (SCHEMA.md §166) — never insertion order.
 * `mediaType` stays a controlled string: the final enumeration is an open
 * decision (SCHEMA.md §50, decision log "Plan T7").
 */
@Injectable()
export class ProjectMediaService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /** Admin: attach one media item to a project + audit 'create'. */
  async attachMedia(
    adminId: string,
    projectId: string,
    dto: AttachProjectMediaDto,
  ): Promise<ProjectMediaResponseDto> {
    const project = await this.db.queryOne<{ id: string }>(
      'SELECT id FROM projects WHERE id = ? LIMIT 1;',
      [projectId],
    );
    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    const id = randomUUID();
    const sortOrder = dto.sortOrder ?? 0;

    await this.db.execute(
      'INSERT INTO project_media (id, project_id, object_key, media_type, sort_order) VALUES (?, ?, ?, ?, ?);',
      [id, projectId, dto.objectKey, dto.mediaType, sortOrder],
    );

    await this.audit.record(adminId, 'create', 'project_media', id, {
      project_id: projectId,
      media_type: dto.mediaType,
      sort_order: sortOrder,
    });

    return new ProjectMediaResponseDto({
      id,
      projectId,
      objectKey: dto.objectKey,
      mediaType: dto.mediaType,
      sortOrder,
    });
  }

  /** Admin: detach one media item, scoped to the project + audit 'delete'. */
  async detachMedia(
    adminId: string,
    projectId: string,
    mediaId: string,
  ): Promise<{ message: string }> {
    const media = await this.db.queryOne<ProjectMediaRow>(
      'SELECT * FROM project_media WHERE id = ? AND project_id = ? LIMIT 1;',
      [mediaId, projectId],
    );
    if (!media) {
      throw new NotFoundException('Media not found for this project.');
    }

    await this.db.execute('DELETE FROM project_media WHERE id = ? AND project_id = ?;', [
      mediaId,
      projectId,
    ]);

    await this.audit.record(adminId, 'delete', 'project_media', mediaId, {
      project_id: projectId,
    });

    return { message: 'Project media detached.' };
  }
}
