import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** List query following the locked pagination contract DL-011:
 * `?page=` 1-based, `?limit=` default 20 max 100, response {items,page,limit,total}. */
export class ListProjectsQueryDto {
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

  @IsOptional()
  @IsString({ message: 'q harus berupa teks string.' })
  @MaxLength(200, { message: 'q maksimal 200 karakter.' })
  q?: string;

  @IsOptional()
  @IsIn(['latest', 'oldest'], { message: 'sort hanya boleh latest atau oldest.' })
  sort?: 'latest' | 'oldest';
}
