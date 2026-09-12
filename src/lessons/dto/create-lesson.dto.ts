import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SanitizedText } from '../../common/sanitization/sanitized-text.decorator';

/**
 * Admin create payload (SCHEMA.md §19). `status` is deliberately NOT accepted
 * here — every lesson starts as `draft` (SCHEMA.md §20) and moves through the
 * dedicated publish/unpublish endpoints only.
 */
export class CreateLessonDto {
  @IsString({ message: 'title harus berupa teks string.' })
  @IsNotEmpty({ message: 'title tidak boleh kosong.' })
  @MaxLength(200, { message: 'title maksimal 200 karakter.' })
  title: string;

  @IsOptional()
  @IsString({ message: 'content harus berupa teks string.' })
  @MaxLength(20000, { message: 'content maksimal 20000 karakter.' })
  @SanitizedText()
  content?: string;

  @Type(() => Number)
  @IsInt({ message: 'orderIndex harus berupa integer.' })
  @Min(0, { message: 'orderIndex minimal 0.' })
  @Max(1000000, { message: 'orderIndex terlalu besar.' })
  orderIndex: number;
}
