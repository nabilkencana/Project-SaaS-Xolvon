import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SanitizedText } from '../../common/sanitization/sanitized-text.decorator';

/** Partial admin update — only the provided fields are applied. */
export class UpdateLessonDto {
  @IsOptional()
  @IsString({ message: 'title harus berupa teks string.' })
  @MaxLength(200, { message: 'title maksimal 200 karakter.' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'content harus berupa teks string.' })
  @MaxLength(20000, { message: 'content maksimal 20000 karakter.' })
  @SanitizedText()
  content?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'orderIndex harus berupa integer.' })
  @Min(0, { message: 'orderIndex minimal 0.' })
  @Max(1000000, { message: 'orderIndex terlalu besar.' })
  orderIndex?: number;
}
