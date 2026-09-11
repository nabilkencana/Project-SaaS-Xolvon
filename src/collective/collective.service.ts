import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import type {
  CollectiveMemberRow,
  ProjectCardRow,
} from './interfaces/collective-member.interface';
import {
  CollectiveMemberDetailDto,
  CollectiveMemberResponseDto,
  PaginatedCollectiveResponseDto,
} from './dto/collective-member-response.dto';
import type { CreateCollectiveMemberDto } from './dto/create-collective-member.dto';
import type { UpdateCollectiveMemberDto } from './dto/update-collective-member.dto';
import {
  toCollectiveMemberDetail,
  toCollectiveMemberResponse,
  toProjectCard,
} from './mappers/collective.mapper';

const MEMBER_COLUMNS =
  'id, name, slug, photo, role, skills, bio, social_links, status, display_order, created_at';

/**
 * Collective members module (SCHEMA.md §54-57, PRD.md §58-61).
 *
 * Public endpoints only ever serve published rows and only through the
 * whitelist mapper, so personal email/phone (SCHEMA.md §57) can never reach
 * a response even if the row carries them. Every admin mutation writes an
 * audit row (HANDBOOK_BACKEND.md §7).
 */
@Injectable()
export class CollectiveService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async listPublished(
    options: { q?: string; page?: number; limit?: number } = {},
  ): Promise<PaginatedCollectiveResponseDto> {
    const page = Math.max(1, Math.floor(options.page ?? 1));
    // DL-011: limit default 20, maximum 100.
    const limit = Math.min(100, Math.max(1, Math.floor(options.limit ?? 20)));
    const offset = (page - 1) * limit;

    const filters: unknown[] = [];
    let where = "status = 'published'";
    const q = options.q?.trim();
    if (q) {
      // LIKE is case-insensitive for ASCII in SQLite (ILIKE-equivalent).
      // User wildcards are escaped so the term stays a contains-match.
      const term = `%${q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
      where +=
        " AND (name LIKE ? ESCAPE '\\' OR role LIKE ? ESCAPE '\\' OR skills LIKE ? ESCAPE '\\')";
      filters.push(term, term, term);
    }

    const rows = await this.db.queryAll<CollectiveMemberRow>(
      `SELECT ${MEMBER_COLUMNS} FROM collective_members WHERE ${where} ` +
        'ORDER BY display_order ASC, created_at DESC LIMIT ? OFFSET ?',
      [...filters, limit, offset],
    );
    const countRow = await this.db.queryOne<{ total: number }>(
      `SELECT COUNT(*) AS total FROM collective_members WHERE ${where}`,
      filters,
    );

    return new PaginatedCollectiveResponseDto({
      items: rows.map(toCollectiveMemberResponse),
      page,
      limit,
      total: countRow?.total ?? 0,
    });
  }

  async getDetailBySlug(slug: string): Promise<CollectiveMemberDetailDto> {
    const row = await this.db.queryOne<CollectiveMemberRow>(
      `SELECT ${MEMBER_COLUMNS} FROM collective_members WHERE slug = ? AND status = 'published'`,
      [slug],
    );
    if (!row) {
      throw new NotFoundException('Collective member tidak ditemukan.');
    }

    // Many-to-many both ways: member → projects via project_members
    // (SCHEMA.md §53, PRD.md §61). Only published projects are exposed.
    const projects = await this.db.queryAll<ProjectCardRow>(
      `SELECT p.id, p.title, p.slug, p.type, p.summary, p.status ` +
        'FROM project_members pm INNER JOIN projects p ON p.id = pm.project_id ' +
        "WHERE pm.member_id = ? AND p.status = 'published' " +
        'ORDER BY p.created_at DESC',
      [row.id],
    );

    return toCollectiveMemberDetail(
      row,
      projects.map(toProjectCard),
    );
  }

  async create(
    actorUserId: string,
    dto: CreateCollectiveMemberDto,
  ): Promise<CollectiveMemberResponseDto> {
    const taken = await this.db.queryOne(
      'SELECT id FROM collective_members WHERE slug = ?',
      [dto.slug],
    );
    if (taken) {
      throw new ConflictException('Slug collective member sudah digunakan.');
    }

    const id = randomUUID();
    await this.db.execute(
      `INSERT INTO collective_members (${MEMBER_COLUMNS}) ` +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)",
      [
        id,
        dto.name,
        dto.slug,
        dto.photo ?? null,
        dto.role,
        dto.skills.length > 0 ? dto.skills.join(',') : null,
        dto.bio ?? null,
        dto.socialLinks ? JSON.stringify(dto.socialLinks) : null,
        dto.displayOrder ?? 0,
        new Date().toISOString(),
      ],
    );
    await this.audit.record(actorUserId, 'create', 'collective_member', id, {
      slug: dto.slug,
    });

    return this.getById(id);
  }

  async update(
    actorUserId: string,
    id: string,
    dto: UpdateCollectiveMemberDto,
  ): Promise<CollectiveMemberResponseDto> {
    await this.getById(id);

    if (dto.slug !== undefined) {
      const taken = await this.db.queryOne(
        'SELECT id FROM collective_members WHERE slug = ? AND id != ?',
        [dto.slug, id],
      );
      if (taken) {
        throw new ConflictException('Slug collective member sudah digunakan.');
      }
    }

    const assignments: string[] = [];
    const params: unknown[] = [];
    if (dto.name !== undefined) {
      assignments.push('name = ?');
      params.push(dto.name);
    }
    if (dto.slug !== undefined) {
      assignments.push('slug = ?');
      params.push(dto.slug);
    }
    if (dto.photo !== undefined) {
      assignments.push('photo = ?');
      params.push(dto.photo);
    }
    if (dto.role !== undefined) {
      assignments.push('role = ?');
      params.push(dto.role);
    }
    if (dto.skills !== undefined) {
      assignments.push('skills = ?');
      params.push(dto.skills.length > 0 ? dto.skills.join(',') : null);
    }
    if (dto.bio !== undefined) {
      assignments.push('bio = ?');
      params.push(dto.bio);
    }
    if (dto.socialLinks !== undefined) {
      assignments.push('social_links = ?');
      params.push(
        dto.socialLinks.length > 0 ? JSON.stringify(dto.socialLinks) : null,
      );
    }
    if (dto.displayOrder !== undefined) {
      assignments.push('display_order = ?');
      params.push(dto.displayOrder);
    }

    if (assignments.length > 0) {
      params.push(id);
      await this.db.execute(
        `UPDATE collective_members SET ${assignments.join(', ')} WHERE id = ?`,
        params,
      );
      await this.audit.record(actorUserId, 'update', 'collective_member', id, {
        fields: assignments.map((assignment) => assignment.split(' ')[0]),
      });
    }

    return this.getById(id);
  }

  async publish(
    actorUserId: string,
    id: string,
  ): Promise<CollectiveMemberResponseDto> {
    return this.setStatus(actorUserId, id, 'published', 'publish');
  }

  async unpublish(
    actorUserId: string,
    id: string,
  ): Promise<CollectiveMemberResponseDto> {
    return this.setStatus(actorUserId, id, 'draft', 'unpublish');
  }

  private async setStatus(
    actorUserId: string,
    id: string,
    status: 'draft' | 'published',
    action: 'publish' | 'unpublish',
  ): Promise<CollectiveMemberResponseDto> {
    await this.getById(id);
    await this.db.execute(
      'UPDATE collective_members SET status = ? WHERE id = ?',
      [status, id],
    );
    await this.audit.record(actorUserId, action, 'collective_member', id, {});

    return this.getById(id);
  }

  private async getById(id: string): Promise<CollectiveMemberResponseDto> {
    const row = await this.db.queryOne<CollectiveMemberRow>(
      `SELECT ${MEMBER_COLUMNS} FROM collective_members WHERE id = ?`,
      [id],
    );
    if (!row) {
      throw new NotFoundException('Collective member tidak ditemukan.');
    }
    return toCollectiveMemberResponse(row);
  }
}
