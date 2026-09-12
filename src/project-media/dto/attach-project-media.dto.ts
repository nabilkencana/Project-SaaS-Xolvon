import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * `mediaType` is a controlled string, NOT a final enum — SCHEMA.md §50 forbids
 * inventing the final enumeration (open decision, decision log "Plan T7").
 * Validation is intentionally limited to basic string checks.
 */
export class AttachProjectMediaDto {
  @ApiProperty({ description: 'Object key of the uploaded file, max 500 characters.', maxLength: 500 })
  @IsString({ message: 'objectKey harus berupa teks string.' })
  @IsNotEmpty({ message: 'objectKey tidak boleh kosong.' })
  @MaxLength(500, { message: 'objectKey maksimal 500 karakter.' })
  objectKey: string;

  @ApiProperty({ description: 'Controlled media type string, max 50 characters (not a final enum).', maxLength: 50 })
  @IsString({ message: 'mediaType harus berupa teks string.' })
  @IsNotEmpty({ message: 'mediaType tidak boleh kosong.' })
  @MaxLength(50, { message: 'mediaType maksimal 50 karakter.' })
  mediaType: string;

  @ApiPropertyOptional({ description: 'Display order, min 0.', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'sortOrder harus berupa integer.' })
  @Min(0, { message: 'sortOrder minimal 0.' })
  sortOrder?: number;
}
