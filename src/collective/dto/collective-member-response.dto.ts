/**
 * Public collective contract (SCHEMA.md §55-56). This class is the privacy
 * boundary: its field list is the exact whitelist of what may ever be
 * serialized for a member — personal email/phone (SCHEMA.md §57) have no
 * property here, so they cannot leak through the mapper.
 */
export class SocialLinkDto {
  readonly platform: string;
  readonly url: string;
}

export class CollectiveMemberResponseDto {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly photo: string | null;
  readonly role: string;
  readonly skills: string[];
  readonly bio: string | null;
  readonly socialLinks: SocialLinkDto[];
  readonly status: 'draft' | 'published';

  constructor(partial: Partial<CollectiveMemberResponseDto>) {
    Object.assign(this, partial);
  }
}

export class ProjectCardDto {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly type: string;
  readonly summary: string;
  readonly status: 'published';

  constructor(partial: Partial<ProjectCardDto>) {
    Object.assign(this, partial);
  }
}

export class CollectiveMemberDetailDto extends CollectiveMemberResponseDto {
  readonly relatedProjects: ProjectCardDto[];

  constructor(
    partial: Partial<CollectiveMemberResponseDto> &
      Partial<Pick<CollectiveMemberDetailDto, 'relatedProjects'>>,
  ) {
    super(partial);
    this.relatedProjects = partial.relatedProjects ?? [];
  }
}

export class PaginatedCollectiveResponseDto {
  readonly items: CollectiveMemberResponseDto[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;

  constructor(partial: Partial<PaginatedCollectiveResponseDto>) {
    Object.assign(this, partial);
  }
}
