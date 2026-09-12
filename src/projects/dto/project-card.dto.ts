/**
 * Public card contract — SCHEMA.md §46.
 * Field order follows the contract: id, title, slug, type, summary, status.
 */
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
