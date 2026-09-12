import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { SanitizedText } from '../../common/sanitization/sanitized-text.decorator';

export class CreateOrderDto {
  @ApiProperty({ type: [String], description: 'Course ids to purchase (UUID v4, unique, non-empty).' })
  @IsArray({ message: 'courseIds harus berupa array.' })
  @ArrayNotEmpty({ message: 'courseIds tidak boleh kosong.' })
  @ArrayUnique({ message: 'courseIds tidak boleh berisi duplikasi course.' })
  @IsUUID('4', { each: true, message: 'Setiap courseId harus berupa UUID v4 yang valid.' })
  courseIds: string[];

  @ApiPropertyOptional({ description: 'Order notes, max 500 characters, sanitized on write.', maxLength: 500 })
  @IsOptional()
  @IsString({ message: 'notes harus berupa teks string.' })
  @MaxLength(500, { message: 'notes maksimal 500 karakter.' })
  @SanitizedText()
  notes?: string;
}
