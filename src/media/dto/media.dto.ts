import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export const MEDIA_PREFIXES = ['public/site', 'public/projects', 'private/projects', 'private/courses'] as const;
export const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4'] as const;

export class CreateUploadUrlDto {
  @ApiProperty({ enum: [...MEDIA_PREFIXES], description: 'Allowed storage prefix for the key.' })
  @IsIn(MEDIA_PREFIXES) prefix!: (typeof MEDIA_PREFIXES)[number];

  @ApiProperty({ enum: [...MEDIA_TYPES], description: 'MIME type of the file being uploaded.' })
  @IsIn(MEDIA_TYPES) contentType!: (typeof MEDIA_TYPES)[number];

  @ApiProperty({ description: 'File size in bytes, 1-524288000.', minimum: 1, maximum: 524288000 })
  @IsInt() @Min(1) @Max(524288000) size!: number;

  @ApiProperty({ description: 'Original file name.' })
  @IsString() @IsNotEmpty() filename!: string;
}

export class ConfirmMediaDto {
  @ApiProperty({ description: 'Object key of the uploaded file.' })
  @IsString() @IsNotEmpty() key!: string;
}
