import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EnrollmentsService } from './enrollments.service';
import type { EnrollmentResponseDto } from './dto/enrollment-response.dto';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  /**
   * User: Retrieve list of enrollments belonging to the logged-in user.
   * Strictly uses `user.sub` from JWT to prevent IDOR attacks.
   */
  @UseGuards(AuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMyEnrollments(
    @CurrentUser('sub') userId: string,
  ): Promise<EnrollmentResponseDto[]> {
    return this.enrollmentsService.getUserEnrollments(userId);
  }

  /**
   * Admin-only: Revoke user enrollment by ID.
   */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeEnrollment(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<EnrollmentResponseDto> {
    return this.enrollmentsService.revokeEnrollment(adminId, id);
  }
}
