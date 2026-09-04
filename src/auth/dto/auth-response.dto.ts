import type { SafeUserDto } from './user-response.dto';

export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: SafeUserDto;
}
