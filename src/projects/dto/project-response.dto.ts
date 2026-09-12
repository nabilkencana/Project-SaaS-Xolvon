/** Admin projection of a project row (admin-only routes). `techStack` is
 * parsed from the TEXT column into a string array (SCHEMA.md §47 note). */
export class ProjectResponseDto {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly type: string | null;
  readonly summary: string | null;
  readonly problem: string | null;
  readonly solution: string | null;
  readonly techStack: string[];
  readonly result: string | null;
  readonly status: 'draft' | 'published';
  readonly createdAt: string | null;
  readonly updatedAt: string | null;

  constructor(partial: Partial<ProjectResponseDto>) {
    Object.assign(this, partial);
  }
}
