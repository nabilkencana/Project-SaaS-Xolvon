import type {
  CollectiveMemberRow,
  ProjectCardRow,
} from '../interfaces/collective-member.interface';
import {
  CollectiveMemberDetailDto,
  CollectiveMemberResponseDto,
  ProjectCardDto,
} from '../dto/collective-member-response.dto';
import { parseSkills, parseSocialLinks } from './social-links.mapper';

/**
 * Whitelist mapper: the returned DTO is built field-by-field from the
 * allowed public contract (SCHEMA.md §55), so any extra column that ever
 * reaches the row — including personal email/phone (SCHEMA.md §57 privacy
 * rule) — is stripped here and cannot appear in any response.
 */
export function toCollectiveMemberResponse(
  row: CollectiveMemberRow,
): CollectiveMemberResponseDto {
  return new CollectiveMemberResponseDto({
    id: row.id,
    name: row.name,
    slug: row.slug,
    photo: row.photo ?? null,
    role: row.role ?? '',
    skills: parseSkills(row.skills),
    bio: row.bio ?? null,
    socialLinks: parseSocialLinks(row.social_links),
    status: row.status === 'published' ? 'published' : 'draft',
  });
}

export function toProjectCard(row: ProjectCardRow): ProjectCardDto {
  return new ProjectCardDto({
    id: row.id,
    title: row.title,
    slug: row.slug,
    type: row.type ?? '',
    summary: row.summary ?? '',
    status: 'published',
  });
}

export function toCollectiveMemberDetail(
  row: CollectiveMemberRow,
  relatedProjects: ProjectCardDto[],
): CollectiveMemberDetailDto {
  const member = toCollectiveMemberResponse(row);
  return new CollectiveMemberDetailDto({ ...member, relatedProjects });
}
