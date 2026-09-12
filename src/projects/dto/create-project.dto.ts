import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { SanitizedText } from '../../common/sanitization/sanitized-text.decorator';
import { IsSafeMetadata } from '../../common/sanitization/is-safe-metadata.decorator';

/**
 * `type` is a controlled string, NOT a final enum — SCHEMA.md §45 explicitly
 * forbids inventing the final enumeration (open decision, decision log
 * "Plan T7"). Same for `techStack`: stored as TEXT (comma-separated or JSON,
 * SCHEMA.md §47) and parsed into an array only at the read boundary.
 */
export class CreateProjectDto {
  @ApiProperty({ description: 'Project title, max 200 characters.', maxLength: 200 })
  @IsString({ message: 'title harus berupa teks string.' })
  @IsNotEmpty({ message: 'title tidak boleh kosong.' })
  @MaxLength(200, { message: 'title maksimal 200 karakter.' })
  title: string;

  @ApiProperty({ description: 'URL slug: lowercase letters, digits, hyphens. Max 200 characters.', maxLength: 200 })
  @IsString({ message: 'slug harus berupa teks string.' })
  @IsNotEmpty({ message: 'slug tidak boleh kosong.' })
  @MaxLength(200, { message: 'slug maksimal 200 karakter.' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (kebab-case).',
  })
  slug: string;

  @ApiPropertyOptional({ description: 'Controlled project type string, max 100 characters (not a final enum).', maxLength: 100 })
  @IsOptional()
  @IsString({ message: 'type harus berupa teks string.' })
  @MaxLength(100, { message: 'type maksimal 100 karakter.' })
  type?: string;

  @ApiPropertyOptional({ description: 'One-line summary, max 500 characters, sanitized on write.', maxLength: 500 })
  @IsOptional()
  @IsString({ message: 'summary harus berupa teks string.' })
  @MaxLength(500, { message: 'summary maksimal 500 karakter.' })
  @SanitizedText()
  summary?: string;

  @ApiPropertyOptional({ description: 'Story section "Problem", max 10000 characters, sanitized on write.', maxLength: 10000 })
  @IsOptional()
  @IsString({ message: 'problem harus berupa teks string.' })
  @MaxLength(10000, { message: 'problem maksimal 10000 karakter.' })
  @SanitizedText()
  problem?: string;

  @ApiPropertyOptional({ description: 'Story section "Solution", max 10000 characters, sanitized on write.', maxLength: 10000 })
  @IsOptional()
  @IsString({ message: 'solution harus berupa teks string.' })
  @MaxLength(10000, { message: 'solution maksimal 10000 karakter.' })
  @SanitizedText()
  solution?: string;

  @ApiPropertyOptional({ description: 'Raw tech-stack text (parsed at read boundary), max 1000 characters.', maxLength: 1000 })
  @IsOptional()
  @IsString({ message: 'techStack harus berupa teks string.' })
  @MaxLength(1000, { message: 'techStack maksimal 1000 karakter.' })
  @IsSafeMetadata()
  techStack?: string;

  @ApiPropertyOptional({ description: 'Story section "Result", max 10000 characters, sanitized on write.', maxLength: 10000 })
  @IsOptional()
  @IsString({ message: 'result harus berupa teks string.' })
  @MaxLength(10000, { message: 'result maksimal 10000 karakter.' })
  @SanitizedText()
  result?: string;
}
