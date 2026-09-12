/** Admin projection of an attached media row (admin-only route — object key
 * is safe here; it never reaches public endpoints). */
export class ProjectMediaResponseDto {
  readonly id: string;
  readonly projectId: string;
  readonly objectKey: string;
  readonly mediaType: string;
  readonly sortOrder: number;

  constructor(partial: Partial<ProjectMediaResponseDto>) {
    Object.assign(this, partial);
  }
}
