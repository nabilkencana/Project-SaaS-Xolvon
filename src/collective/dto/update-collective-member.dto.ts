import { ApiPropertyOptional } from '@nestjs/swagger';
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
import { SocialLinkInputDto } from './create-collective-member.dto';
import { SanitizedText } from '../../common/sanitization/sanitized-text.decorator';

/**
 * Hand-written partial of CreateCollectiveMemberDto. @nestjs/swagger's
 * PartialType is not a dependency of this repo, so the optional fields are
 * declared explicitly to keep validation identical to the create path.
 */
export class UpdateCollectiveMemberDto {
  @ApiPropertyOptional({ description: 'Member name, max 120 characters.', maxLength: 120 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ description: 'URL slug: lowercase letters, digits, hyphens. Max 120 characters.', maxLength: 120 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.',
  })
  slug?: string;

  @ApiPropertyOptional({ description: 'Profile photo URL, max 2048 characters.', maxLength: 2048 })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  photo?: string;

  @ApiPropertyOptional({ description: 'Specialist role label, max 120 characters.', maxLength: 120 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  role?: string;

  @ApiPropertyOptional({ type: [String], description: 'Skill tags, max 50 items, none empty.' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  skills?: string[];

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
