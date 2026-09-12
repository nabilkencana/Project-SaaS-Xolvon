import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Public list query. Pagination follows the locked contract DL-011:
 * `?page=` 1-based, `?limit=` default 20 maximum 100.
 */
export class CollectiveListQueryDto {
  @ApiPropertyOptional({ description: 'Keyword matched against name/role/skills. Max 200 characters.', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ description: '1-based page number.', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Page size, default 20, max 100.', minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
