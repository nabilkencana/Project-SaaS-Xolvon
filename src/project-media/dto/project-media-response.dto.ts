import { ApiProperty } from '@nestjs/swagger';

/** Admin projection of an attached media row (admin-only route — object key
 * is safe here; it never reaches public endpoints). */
export class ProjectMediaResponseDto {
  @ApiProperty({ description: 'Media row id (UUID v4).' })
  readonly id: string;

  @ApiProperty({ description: 'Owning project id (UUID v4).' })
  readonly projectId: string;

  @ApiProperty()
  readonly objectKey: string;

  @ApiProperty()
  readonly mediaType: string;

  @ApiProperty()
  readonly sortOrder: number;

  constructor(partial: Partial<ProjectMediaResponseDto>) {
    Object.assign(this, partial);
  }
}
