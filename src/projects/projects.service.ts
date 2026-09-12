import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import type {
  ProjectMediaRow,
  ProjectMemberDetailRow,
  ProjectRow,
} from './interfaces/project.interface';
import { ProjectCardDto } from './dto/project-card.dto';
import { ProjectDetailDto } from './dto/project-detail.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import type { CreateProjectDto } from './dto/create-project.dto';
import type { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import type { UpdateProjectDto } from './dto/update-project.dto';
import { toProjectCard, toProjectDetail, toProjectResponse } from './mappers/project.mapper';

/** Fields publish validation requires to be non-empty (SCHEMA.md §46-47:
 * card and detail contracts declare them; only `result` is nullable). */
const PUBLISH_REQUIRED_FIELDS = ['title', 'slug', 'type', 'summary', 'problem', 'solution'] as const;

/** DTO field → column mapping for partial updates (fixed whitelist — column
 * names never come from user input; values are always bind parameters). */
const UPDATE_COLUMNS: Partial<Record<keyof UpdateProjectDto, keyof ProjectRow>> = {
  title: 'title',
  slug: 'slug',
  type: 'type',
  summary: 'summary',
  problem: 'problem',
  solution: 'solution',
  techStack: 'tech_stack',
  result: 'result',
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Public: paginated list of published projects (SCHEMA.md §44 — public
   * portfolio only serves `published`). Follows the locked pagination
   * contract DL-011: ?page= 1-based, ?limit= default 20 max 100, response
   * {items, page, limit, total}.
   */
  async listPublished(
    query: ListProjectsQueryDto,
  ): Promise<{ items: ProjectCardDto[]; page: number; limit: number; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const whereBase = "status = 'published'";
    const qClause = query.q ? ' AND (title LIKE ? OR summary LIKE ?)' : '';
    const qParams = query.q ? [`%${query.q}%`, `%${query.q}%`] : [];

    const countRow = await this.db.queryOne<{ total: number }>(
      `SELECT COUNT(*) AS total FROM projects WHERE ${whereBase}${qClause};`,
      qParams,
    );

    // `sort` is validated against ['latest','oldest'] at the DTO boundary;
    // both branches are fixed literals.
    const orderSql = query.sort === 'oldest' ? 'ORDER BY created_at ASC' : 'ORDER BY created_at DESC';

    const rows = await this.db.queryAll<ProjectRow>(
      `SELECT id, title, slug, type, summary, status FROM projects WHERE ${whereBase}${qClause} ${orderSql} LIMIT ? OFFSET ?;`,
      [...qParams, limit, offset],
    );

    return {
      items: rows.map(toProjectCard),
      page,
      limit,
      total: Number(countRow?.total ?? 0),
    };
  }

  /**
   * Public: published project detail by slug. Drafts and unknown slugs are
   * indistinguishable (404) so draft content is never revealed. Story order
   * Problem→Solution→Tech Stack→Result→Media→members is fixed in the DTO.
   */
  async getPublishedDetailBySlug(slug: string): Promise<ProjectDetailDto> {
    const project = await this.db.queryOne<ProjectRow>(
      "SELECT * FROM projects WHERE slug = ? AND status = 'published' LIMIT 1;",
      [slug],
    );

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    // Published-only guard in code: draft rows 404 exactly like missing ones.
    if (project.status !== 'published') {
      throw new NotFoundException('Project not found.');
    }

    // Public media: sorted by sort_order (SCHEMA.md §166), object keys never
    // leave the API, and video is excluded (requires signed private access).
    const media = await this.db.queryAll<ProjectMediaRow>(
      `SELECT id, media_type, sort_order FROM project_media
       WHERE project_id = ? AND (media_type IS NULL OR LOWER(media_type) != 'video')
       ORDER BY sort_order ASC;`,
      [project.id],
    );

    // "Built by": many-to-many Project ↔ Collective Member with explicit role
    // attribution (SCHEMA.md §51-53).
    const members = await this.db.queryAll<ProjectMemberDetailRow>(
      `SELECT pm.member_id, cm.name, pm.role
       FROM project_members pm
       JOIN collective_members cm ON cm.id = pm.member_id
       WHERE pm.project_id = ?
       ORDER BY cm.display_order ASC, cm.name ASC;`,
      [project.id],
    );

    return toProjectDetail(project, media, members);
  }

  /** Admin: create a project (status defaults to draft) + audit 'create'. */
  async createProject(adminId: string, dto: CreateProjectDto): Promise<ProjectResponseDto> {
    const existing = await this.db.queryOne<{ id: string }>(
      'SELECT id FROM projects WHERE slug = ? LIMIT 1;',
      [dto.slug],
    );
    if (existing) {
      // Re-map the storage-layer UNIQUE violation to an actionable 409.
      throw new ConflictException('A project with this slug already exists.');
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    await this.db.execute(
      `INSERT INTO projects (
         id, title, slug, type, summary, problem, solution, tech_stack, result,
         status, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?);`,
      [
        id,
        dto.title,
        dto.slug,
        dto.type ?? null,
        dto.summary ?? null,
        dto.problem ?? null,
        dto.solution ?? null,
        dto.techStack ?? null,
        dto.result ?? null,
        now,
        now,
      ],
    );

    await this.audit.record(adminId, 'create', 'project', id, {
      title: dto.title,
      slug: dto.slug,
    });

    return toProjectResponse({
      id,
      title: dto.title,
      slug: dto.slug,
      type: dto.type ?? null,
      summary: dto.summary ?? null,
      problem: dto.problem ?? null,
      solution: dto.solution ?? null,
      tech_stack: dto.techStack ?? null,
      result: dto.result ?? null,
      status: 'draft',
      created_at: now,
      updated_at: now,
    });
  }

  /** Admin: partial update + audit 'update'. Only provided fields are written. */
  async updateProject(
    adminId: string,
    id: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    const current = await this.db.queryOne<ProjectRow>(
      'SELECT * FROM projects WHERE id = ? LIMIT 1;',
      [id],
    );
    if (!current) {
      throw new NotFoundException('Project not found.');
    }

    const fields = (Object.keys(dto) as (keyof UpdateProjectDto)[]).filter(
      (field) => dto[field] !== undefined,
    );

    if (dto.slug !== undefined) {
      const existing = await this.db.queryOne<{ id: string }>(
        'SELECT id FROM projects WHERE slug = ? AND id != ? LIMIT 1;',
        [dto.slug, id],
      );
      if (existing) {
        throw new ConflictException('A project with this slug already exists.');
      }
    }

    const now = new Date().toISOString();
    const sets: string[] = [];
    const params: unknown[] = [];

    for (const field of fields) {
      const column = UPDATE_COLUMNS[field];
      if (!column) {
        continue;
      }
      sets.push(`${column} = ?`);
      params.push(dto[field] ?? null);
    }
    sets.push('updated_at = ?');
    params.push(now);
    params.push(id);

    await this.db.execute(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?;`, params);

    await this.audit.record(adminId, 'update', 'project', id, {
      fields: fields.filter((field) => UPDATE_COLUMNS[field] !== undefined),
    });

    const override: Partial<ProjectRow> = { updated_at: now };
    for (const field of fields) {
      const column = UPDATE_COLUMNS[field];
      if (column) {
        (override as Record<string, unknown>)[column] = dto[field] ?? null;
      }
    }

    return toProjectResponse({ ...current, ...override });
  }

  /**
   * Admin: publish — validates that every field the public contracts declare
   * (SCHEMA.md §46-47) is present, then flips draft → published + audit.
   */
  async publishProject(adminId: string, id: string): Promise<ProjectResponseDto> {
    const project = await this.db.queryOne<ProjectRow>(
      'SELECT * FROM projects WHERE id = ? LIMIT 1;',
      [id],
    );
    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    const missing = PUBLISH_REQUIRED_FIELDS.filter(
      (field) => !String(project[field] ?? '').trim(),
    );
    if (missing.length > 0) {
      throw new BadRequestException(
        `Project cannot be published. Missing required fields: ${missing.join(', ')}.`,
      );
    }

    const now = new Date().toISOString();
    await this.db.execute(
      "UPDATE projects SET status = 'published', updated_at = ? WHERE id = ?;",
      [now, id],
    );
    await this.audit.record(adminId, 'publish', 'project', id, { slug: project.slug });

    return toProjectResponse({ ...project, status: 'published', updated_at: now });
  }

  /** Admin: unpublish — published → draft + audit 'unpublish'. */
  async unpublishProject(adminId: string, id: string): Promise<ProjectResponseDto> {
    const project = await this.db.queryOne<ProjectRow>(
      'SELECT * FROM projects WHERE id = ? LIMIT 1;',
      [id],
    );
    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    const now = new Date().toISOString();
    await this.db.execute(
      "UPDATE projects SET status = 'draft', updated_at = ? WHERE id = ?;",
      [now, id],
    );
    await this.audit.record(adminId, 'unpublish', 'project', id, { slug: project.slug });

    return toProjectResponse({ ...project, status: 'draft', updated_at: now });
  }
}
