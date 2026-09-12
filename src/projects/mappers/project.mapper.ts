import type { ProjectMediaRow, ProjectMemberDetailRow, ProjectRow } from '../interfaces/project.interface';
import { ProjectCardDto } from '../dto/project-card.dto';
import { ProjectDetailDto, ProjectMediaPublicDto, ProjectMemberDto } from '../dto/project-detail.dto';
import { ProjectResponseDto } from '../dto/project-response.dto';

/**
 * Parses the `tech_stack` TEXT column into a string array (SCHEMA.md §47 note:
 * representation follows the final database implementation). Supports both
 * storage choices: a JSON array string or a comma-separated list.
 */
export function parseTechStack(raw: string | null | undefined): string[] {
  if (!raw) {
    return [];
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter((value) => value.length > 0);
      }
    } catch {
      // Not valid JSON — fall through to comma-separated parsing.
    }
  }

  return trimmed
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

/** Public card — SCHEMA.md §46 field order. */
export function toProjectCard(row: ProjectRow): ProjectCardDto {
  return new ProjectCardDto({
    id: row.id,
    title: row.title,
    slug: row.slug,
    type: row.type ?? '',
    summary: row.summary ?? '',
    status: 'published',
  });
}

/**
 * Public detail — SCHEMA.md §47 contract with the §48 story order:
 * Problem → Solution → Tech Stack → Result → Media → "Built by" members.
 * Media items never expose `object_key`; video rows are already excluded by
 * the service query (private storage, no public video serving in V1).
 */
export function toProjectDetail(
  row: ProjectRow,
  media: ProjectMediaRow[],
  members: ProjectMemberDetailRow[],
): ProjectDetailDto {
  return new ProjectDetailDto({
    id: row.id,
    title: row.title,
    slug: row.slug,
    type: row.type ?? '',
    summary: row.summary ?? '',
    problem: row.problem ?? '',
    solution: row.solution ?? '',
    techStack: parseTechStack(row.tech_stack),
    result: row.result ?? null,
    media: media.map(
      (item) =>
        new ProjectMediaPublicDto({
          id: item.id,
          mediaType: item.media_type ?? '',
          sortOrder: item.sort_order ?? 0,
        }),
    ),
    members: members.map(
      (member) =>
        new ProjectMemberDto({
          memberId: member.member_id,
          name: member.name,
          role: member.role ?? '',
        }),
    ),
    status: 'published',
  });
}

/** Admin projection (admin-only routes). */
export function toProjectResponse(row: ProjectRow): ProjectResponseDto {
  return new ProjectResponseDto({
    id: row.id,
    title: row.title,
    slug: row.slug,
    type: row.type,
    summary: row.summary,
    problem: row.problem,
    solution: row.solution,
    techStack: parseTechStack(row.tech_stack),
    result: row.result,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
