import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SanitizedText } from '../../common/sanitization/sanitized-text.decorator';

export class SocialLinkInputDto {
  @ApiProperty({ description: 'Social platform name, max 120 characters.' })
  @IsString()
  @IsNotEmpty()
  platform: string;

  @ApiProperty({ description: 'Profile URL, max 2048 characters.', maxLength: 2048 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  url: string;
}

export class CreateCollectiveMemberDto {
  @ApiProperty({ description: 'Member name, max 120 characters.', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ description: 'URL slug: lowercase letters, digits, hyphens. Max 120 characters.', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.',
  })
  slug: string;

  @ApiPropertyOptional({ description: 'Profile photo URL, max 2048 characters.', maxLength: 2048 })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  photo?: string;

  @ApiProperty({ description: 'Specialist role label, max 120 characters.', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  role: string;

  @ApiProperty({ type: [String], description: 'Skill tags, max 50 items, none empty.' })
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  skills: string[];

  @ApiPropertyOptional({ description: 'Short biography, max 2000 characters, sanitized on write.', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @SanitizedText()
  bio?: string;

  @ApiPropertyOptional({ type: () => [SocialLinkInputDto], description: 'Social links, max 20 items.' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SocialLinkInputDto)
  socialLinks?: SocialLinkInputDto[];

  @ApiPropertyOptional({ description: 'Carousel ordering position, min 0.', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
