import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @ApiProperty({ description: 'Display name, max 100 characters.', maxLength: 100 })
  @IsString()
  @IsNotEmpty({ message: 'Name is required.' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiProperty({ description: 'Email address, trimmed and lowercased.', example: 'user@example.com' })
  @IsEmail({}, { message: 'A valid email address is required.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @ApiProperty({ description: 'Phone number, 8-20 characters.' })
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required.' })
  @Matches(/^[+]?[0-9\s\-()]{8,20}$/, {
    message: 'Phone number format is invalid.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  phone: string;

  @ApiProperty({ description: 'Password, at least 8 characters.', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password: string;
}
