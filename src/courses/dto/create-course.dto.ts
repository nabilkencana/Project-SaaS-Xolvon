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
  @IsString({ message: 'title harus berupa teks string.' })
  @IsNotEmpty({ message: 'title tidak boleh kosong.' })
  @MaxLength(200, { message: 'title maksimal 200 karakter.' })
  title: string;

  @IsString({ message: 'slug harus berupa teks string.' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.',
  })
  @MaxLength(120, { message: 'slug maksimal 120 karakter.' })
  slug: string;

  @IsString({ message: 'description harus berupa teks string.' })
  @IsNotEmpty({ message: 'description tidak boleh kosong.' })
  @MaxLength(5000, { message: 'description maksimal 5000 karakter.' })
  @SanitizedText()
  description: string;

  @Type(() => Number)
  @IsInt({ message: 'price harus berupa integer.' })
  @Min(0, { message: 'price minimal 0.' })
  @Max(1000000000, { message: 'price terlalu besar.' })
  price: number;

  @IsOptional()
  @IsString({ message: 'thumbnailUrl harus berupa teks string.' })
  @MaxLength(2048, { message: 'thumbnailUrl maksimal 2048 karakter.' })
  thumbnailUrl?: string;
}
