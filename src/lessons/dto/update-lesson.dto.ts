import { ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiPropertyOptional({ description: 'Lesson title, max 200 characters.', maxLength: 200 })
  @IsOptional()
  @IsString({ message: 'title harus berupa teks string.' })
  @MaxLength(200, { message: 'title maksimal 200 karakter.' })
  title?: string;

  @ApiPropertyOptional({ description: 'Lesson content, max 20000 characters, sanitized on write.', maxLength: 20000 })
  @IsOptional()
  @IsString({ message: 'content harus berupa teks string.' })
  @MaxLength(20000, { message: 'content maksimal 20000 karakter.' })
  @SanitizedText()
  content?: string;

  @ApiPropertyOptional({ description: 'Sequence position, 0-1000000.', minimum: 0, maximum: 1000000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'orderIndex harus berupa integer.' })
  @Min(0, { message: 'orderIndex minimal 0.' })
  @Max(1000000, { message: 'orderIndex terlalu besar.' })
  orderIndex?: number;
}
