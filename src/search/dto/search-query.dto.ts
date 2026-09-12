import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SearchQueryDto {
  @IsOptional()
  @IsString({ message: 'q harus berupa teks string.' })
  @MaxLength(200, { message: 'q maksimal 200 karakter.' })
  q?: string;

  @IsOptional()
  @IsIn(['course', 'project', 'marketplace'], {
    message: 'type hanya menerima course, project, atau marketplace.',
  })
  type?: 'course' | 'project' | 'marketplace';

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page harus berupa integer.' })
  @Min(1, { message: 'page minimal 1.' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit harus berupa integer.' })
  @Min(1, { message: 'limit minimal 1.' })
  @Max(100, { message: 'limit maksimal 100.' })
  limit?: number;
}
