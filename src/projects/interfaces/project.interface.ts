export type ProjectStatus = 'draft' | 'published';

export interface ProjectRow {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly type: string | null;
  readonly summary: string | null;
  readonly problem: string | null;
  readonly solution: string | null;
  readonly tech_stack: string | null;
  readonly result: string | null;
  readonly status: ProjectStatus;
  readonly created_at: string | null;
  readonly updated_at: string | null;
}

export interface ProjectMediaRow {
  readonly id: string;
  readonly project_id: string;
  readonly object_key: string | null;
  readonly media_type: string | null;
  readonly sort_order: number | null;
}

/** Joined row: project_members ⋈ collective_members (SCHEMA.md §51-53). */
export interface ProjectMemberDetailRow {
  readonly member_id: string;
  readonly name: string;
  readonly role: string | null;
}
