import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { SanitizedText } from '../../common/sanitization/sanitized-text.decorator';

export class CreateMarketplaceItemDto {
  @ApiProperty({ description: 'Item title, max 200 characters.', maxLength: 200 })
  @IsString({ message: 'title harus berupa teks string.' })
  @IsNotEmpty({ message: 'title tidak boleh kosong.' })
  @MaxLength(200, { message: 'title maksimal 200 karakter.' })
  title: string;

  @ApiProperty({ description: 'URL slug: lowercase letters, digits, hyphens. Max 120 characters.', maxLength: 120 })
  @IsString({ message: 'slug harus berupa teks string.' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.',
  })
  @MaxLength(120, { message: 'slug maksimal 120 karakter.' })
  slug: string;

  @ApiPropertyOptional({ description: 'Description, max 2000 characters, sanitized on write.', maxLength: 2000 })
  @IsOptional()
  @IsString({ message: 'description harus berupa teks string.' })
  @MaxLength(2000, { message: 'description maksimal 2000 karakter.' })
  @SanitizedText()
  description?: string;

  /**
   * Minimal validation happens in the service (valid URL parse + https-only,
   * plan T9) — the final URL governance is an OPEN DECISION (PRD §91.11,
   * SCHEMA.md §61, decision log DL-013).
   */
  @ApiProperty({ description: 'Outbound product URL, https-only, max 2048 characters.', maxLength: 2048 })
  @IsString({ message: 'externalUrl harus berupa teks string.' })
  @IsNotEmpty({ message: 'externalUrl tidak boleh kosong.' })
  @MaxLength(2048, { message: 'externalUrl maksimal 2048 karakter.' })
  externalUrl: string;

  @ApiPropertyOptional({ type: [String], description: 'Capability tags, max 20 items.', maxItems: 20 })
  @IsOptional()
  @IsArray({ message: 'capabilities harus berupa array string.' })
  @ArrayMaxSize(20, { message: 'capabilities maksimal 20 item.' })
  @IsString({ each: true, message: 'Setiap capability harus berupa teks string.' })
  capabilities?: string[];
}
