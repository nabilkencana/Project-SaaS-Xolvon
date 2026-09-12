/**
 * Public detail contract — SCHEMA.md §47, with the founder-mandated story
 * order (SCHEMA.md §48): Problem → Solution → Tech Stack → Result →
 * Screenshot/Media → "Built by" members. Property order below mirrors that
 * sequence so the serialized JSON matches the required presentation order.
 *
 * Safety: media items never carry `object_key` (private storage keys never
 * leave the API — docs/api-contract.md) and video media is excluded from the
 * public response (video requires signed private access, plan T13/T14).
 */
export class ProjectMediaPublicDto {
  readonly id: string;
  readonly mediaType: string;
  readonly sortOrder: number;

  constructor(partial: Partial<ProjectMediaPublicDto>) {
    Object.assign(this, partial);
  }
}

export class ProjectMemberDto {
  readonly memberId: string;
  readonly name: string;
  readonly role: string;

  constructor(partial: Partial<ProjectMemberDto>) {
    Object.assign(this, partial);
  }
}

export class ProjectDetailDto {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly type: string;
  readonly summary: string;
  readonly problem: string;
  readonly solution: string;
  readonly techStack: string[];
  readonly result: string | null;
  readonly media: ProjectMediaPublicDto[];
  readonly members: ProjectMemberDto[];
  readonly status: 'published';

  constructor(partial: Partial<ProjectDetailDto>) {
    Object.assign(this, partial);
  }
}
