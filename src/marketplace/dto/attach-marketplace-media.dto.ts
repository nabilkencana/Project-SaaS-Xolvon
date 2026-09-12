import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import type { MarketplaceMediaType } from '../interfaces/marketplace-item.interface';

/**
 * Admin attach-media payload. `mediaType` is fixed to image|video|deck per
 * SCHEMA.md §63 (implementation decision — see interfaces/marketplace-item.interface.ts).
 * The object key is an R2 object key produced by the media upload flow (T13);
 * no URL is accepted here.
 */
export class AttachMarketplaceMediaDto {
  @ApiProperty({ description: 'R2 object key from the upload flow, max 1024 characters.', maxLength: 1024 })
  @IsString({ message: 'objectKey harus berupa teks string.' })
  @IsNotEmpty({ message: 'objectKey tidak boleh kosong.' })
  @MaxLength(1024, { message: 'objectKey maksimal 1024 karakter.' })
  objectKey: string;

  @ApiProperty({ enum: ['image', 'video', 'deck'] satisfies [MarketplaceMediaType, ...MarketplaceMediaType[]] })
  @IsIn(['image', 'video', 'deck'], {
    message: 'mediaType hanya menerima nilai image, video, atau deck.',
  })
  mediaType: MarketplaceMediaType;

  @ApiPropertyOptional({ description: 'Display order, min 0.', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'sortOrder harus berupa integer.' })
  @Min(0, { message: 'sortOrder minimal 0.' })
  sortOrder?: number;
}
