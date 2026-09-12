import { ApiProperty } from '@nestjs/swagger';
import { SafeUserDto } from './user-response.dto';

export class AuthResponseDto {
  @ApiProperty({ description: 'Short-lived JWT access token.' })
  accessToken: string;

  @ApiProperty({ description: 'Opaque refresh token for session rotation.' })
  refreshToken: string;

  @ApiProperty({ type: () => SafeUserDto })
  user: SafeUserDto;
}
