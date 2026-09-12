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
  @IsArray({ message: 'courseIds harus berupa array.' })
  @ArrayNotEmpty({ message: 'courseIds tidak boleh kosong.' })
  @ArrayUnique({ message: 'courseIds tidak boleh berisi duplikasi course.' })
  @IsUUID('4', { each: true, message: 'Setiap courseId harus berupa UUID v4 yang valid.' })
  courseIds: string[];

  @IsOptional()
  @IsString({ message: 'notes harus berupa teks string.' })
  @MaxLength(500, { message: 'notes maksimal 500 karakter.' })
  @SanitizedText()
  notes?: string;
}
