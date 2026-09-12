import { ApiProperty } from '@nestjs/swagger';

/**
 * Public collective contract (SCHEMA.md §55-56). This class is the privacy
 * boundary: its field list is the exact whitelist of what may ever be
 * serialized for a member — personal email/phone (SCHEMA.md §57) have no
 * property here, so they cannot leak through the mapper.
 */
export class SocialLinkDto {
  @ApiProperty()
  readonly platform: string;

  @ApiProperty()
  readonly url: string;
}

export class CollectiveMemberResponseDto {
  @ApiProperty({ description: 'Member id (UUID v4).' })
  readonly id: string;

  @ApiProperty()
  readonly name: string;

  @ApiProperty()
  readonly slug: string;

  @ApiProperty({ type: String, nullable: true })
  readonly photo: string | null;

  @ApiProperty()
  readonly role: string;

  @ApiProperty({ type: [String] })
  readonly skills: string[];

  @ApiProperty({ type: String, nullable: true })
  readonly bio: string | null;

  @ApiProperty({ type: () => [SocialLinkDto] })
  readonly socialLinks: SocialLinkDto[];

  @ApiProperty({ enum: ['draft', 'published'] })
  readonly status: 'draft' | 'published';

  constructor(partial: Partial<CollectiveMemberResponseDto>) {
    Object.assign(this, partial);
  }
}

export class ProjectCardDto {
  @ApiProperty({ description: 'Project id (UUID v4).' })
  readonly id: string;

  @ApiProperty()
  readonly title: string;

  @ApiProperty()
  readonly slug: string;

  @ApiProperty()
  readonly type: string;

  @ApiProperty()
  readonly summary: string;

  @ApiProperty({ enum: ['published'] })
  readonly status: 'published';

  constructor(partial: Partial<ProjectCardDto>) {
    Object.assign(this, partial);
  }
}

export class CollectiveMemberDetailDto extends CollectiveMemberResponseDto {
  @ApiProperty({ type: () => [ProjectCardDto] })
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
  @ApiProperty({ type: () => [CollectiveMemberResponseDto] })
  readonly items: CollectiveMemberResponseDto[];

  @ApiProperty()
  readonly page: number;

  @ApiProperty()
  readonly limit: number;

  @ApiProperty()
  readonly total: number;

  constructor(partial: Partial<PaginatedCollectiveResponseDto>) {
    Object.assign(this, partial);
  }
}
