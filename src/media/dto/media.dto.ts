import { IsIn, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export const MEDIA_PREFIXES = ['public/site', 'public/projects', 'private/projects', 'private/courses'] as const;
export const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4'] as const;

export class CreateUploadUrlDto {
  @IsIn(MEDIA_PREFIXES) prefix!: (typeof MEDIA_PREFIXES)[number];
  @IsIn(MEDIA_TYPES) contentType!: (typeof MEDIA_TYPES)[number];
  @IsInt() @Min(1) @Max(524288000) size!: number;
  @IsString() @IsNotEmpty() filename!: string;
}

export class ConfirmMediaDto {
  @IsString() @IsNotEmpty() key!: string;
}
