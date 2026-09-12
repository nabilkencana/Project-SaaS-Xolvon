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
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.',
  })
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  photo?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  role?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  skills?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @SanitizedText()
  bio?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SocialLinkInputDto)
  socialLinks?: SocialLinkInputDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
