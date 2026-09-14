import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, Max, Min } from 'class-validator';
import { MEDIA_TYPES } from '../../media/dto/media.dto';

export class PaymentProofUrlDto {
  @ApiProperty({
    enum: [...MEDIA_TYPES],
    description: 'MIME type of the payment proof file being uploaded.',
  })
  @IsIn(MEDIA_TYPES, { message: 'contentType tidak didukung.' })
  contentType!: (typeof MEDIA_TYPES)[number];

  @ApiProperty({
    description: 'File size in bytes, 1-524288000.',
    minimum: 1,
    maximum: 524288000,
  })
  @IsInt({ message: 'size harus berupa integer.' })
  @Min(1, { message: 'size minimal 1 byte.' })
  @Max(524288000, { message: 'size maksimal 524288000 byte.' })
  size!: number;
}
