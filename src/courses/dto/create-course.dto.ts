import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SanitizedText } from '../../common/sanitization/sanitized-text.decorator';

/**
 * Admin create payload (SCHEMA.md §14). `status` is deliberately NOT
 * accepted here — every course starts as `draft` (SCHEMA.md §15) and moves
 * through the dedicated publish/unpublish endpoints only.
 */
export class CreateCourseDto {
  @ApiProperty({ description: 'Course title, max 200 characters.', maxLength: 200 })
  @IsString({ message: 'title harus berupa teks string.' })
  @IsNotEmpty({ message: 'title tidak boleh kosong.' })
  @MaxLength(200, { message: 'title maksimal 200 karakter.' })
  title: string;

  @ApiProperty({
    description: 'URL slug: lowercase letters, digits, hyphens. Max 120 characters.',
    maxLength: 120,
  })
  @IsString({ message: 'slug harus berupa teks string.' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.',
  })
  @MaxLength(120, { message: 'slug maksimal 120 karakter.' })
  slug: string;

  @ApiProperty({ description: 'Description, max 5000 characters, sanitized on write.', maxLength: 5000 })
  @IsString({ message: 'description harus berupa teks string.' })
  @IsNotEmpty({ message: 'description tidak boleh kosong.' })
  @MaxLength(5000, { message: 'description maksimal 5000 karakter.' })
  @SanitizedText()
  description: string;

  @ApiProperty({ description: 'Price in IDR, 0-1000000000.', minimum: 0, maximum: 1000000000 })
  @Type(() => Number)
  @IsInt({ message: 'price harus berupa integer.' })
  @Min(0, { message: 'price minimal 0.' })
  @Max(1000000000, { message: 'price terlalu besar.' })
  price: number;

  @ApiPropertyOptional({ description: 'Thumbnail URL, max 2048 characters.', maxLength: 2048 })
  @IsOptional()
  @IsString({ message: 'thumbnailUrl harus berupa teks string.' })
  @MaxLength(2048, { message: 'thumbnailUrl maksimal 2048 karakter.' })
  thumbnailUrl?: string;
}
