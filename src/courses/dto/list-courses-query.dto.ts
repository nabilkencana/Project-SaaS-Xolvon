import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Public list query. Pagination follows the locked contract DL-011:
 * `?page=` 1-based, `?limit=` default 20 max 100, response
 * `{items, page, limit, total, query}`. `?sort=` latest (default) | oldest;
 * `?q=` searches the course title.
 */
export class ListCoursesQueryDto {
  @ApiPropertyOptional({ description: 'Keyword matched against the course title. Max 200 characters.', maxLength: 200 })
  @IsOptional()
  @IsString({ message: 'q harus berupa teks string.' })
  @MaxLength(200, { message: 'q maksimal 200 karakter.' })
  q?: string;

  @ApiPropertyOptional({ description: 'Sort direction. Default latest.', enum: ['latest', 'oldest'] })
  @IsOptional()
  @IsIn(['latest', 'oldest'], {
    message: 'sort hanya menerima nilai latest atau oldest.',
  })
  sort?: 'latest' | 'oldest';

  @ApiPropertyOptional({ description: '1-based page number.', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page harus berupa integer.' })
  @Min(1, { message: 'page minimal 1.' })
  page?: number;

  @ApiPropertyOptional({ description: 'Page size, default 20, max 100.', minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit harus berupa integer.' })
  @Min(1, { message: 'limit minimal 1.' })
  @Max(100, { message: 'limit maksimal 100.' })
  limit?: number;
}
