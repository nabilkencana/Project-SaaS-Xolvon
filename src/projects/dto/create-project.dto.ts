import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * `type` is a controlled string, NOT a final enum — SCHEMA.md §45 explicitly
 * forbids inventing the final enumeration (open decision, decision log
 * "Plan T7"). Same for `techStack`: stored as TEXT (comma-separated or JSON,
 * SCHEMA.md §47) and parsed into an array only at the read boundary.
 */
export class CreateProjectDto {
  @IsString({ message: 'title harus berupa teks string.' })
  @IsNotEmpty({ message: 'title tidak boleh kosong.' })
  @MaxLength(200, { message: 'title maksimal 200 karakter.' })
  title: string;

  @IsString({ message: 'slug harus berupa teks string.' })
  @IsNotEmpty({ message: 'slug tidak boleh kosong.' })
  @MaxLength(200, { message: 'slug maksimal 200 karakter.' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (kebab-case).',
  })
  slug: string;

  @IsOptional()
  @IsString({ message: 'type harus berupa teks string.' })
  @MaxLength(100, { message: 'type maksimal 100 karakter.' })
  type?: string;

  @IsOptional()
  @IsString({ message: 'summary harus berupa teks string.' })
  @MaxLength(500, { message: 'summary maksimal 500 karakter.' })
  summary?: string;

  @IsOptional()
  @IsString({ message: 'problem harus berupa teks string.' })
  @MaxLength(10000, { message: 'problem maksimal 10000 karakter.' })
  problem?: string;

  @IsOptional()
  @IsString({ message: 'solution harus berupa teks string.' })
  @MaxLength(10000, { message: 'solution maksimal 10000 karakter.' })
  solution?: string;

  @IsOptional()
  @IsString({ message: 'techStack harus berupa teks string.' })
  @MaxLength(1000, { message: 'techStack maksimal 1000 karakter.' })
  techStack?: string;

  @IsOptional()
  @IsString({ message: 'result harus berupa teks string.' })
  @MaxLength(10000, { message: 'result maksimal 10000 karakter.' })
  result?: string;
}
