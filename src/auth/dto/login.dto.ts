import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({ description: 'Account email, trimmed and lowercased.', example: 'user@example.com' })
  @IsEmail({}, { message: 'A valid email address is required.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @ApiProperty({ description: 'Account password.', format: 'password' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  password: string;
}
