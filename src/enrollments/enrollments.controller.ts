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
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';
import { OPENAPI_BEARER_SCHEME } from '../openapi/openapi.config';

@ApiTags('enrollments')
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  /**
   * User: Retrieve list of enrollments belonging to the logged-in user.
   * Strictly uses `user.sub` from JWT to prevent IDOR attacks.
   */
  @UseGuards(AuthGuard)
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'List own enrollments' })
  @ApiOkResponse({ type: EnrollmentResponseDto, isArray: true })
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
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'Revoke an enrollment (admin)' })
  @ApiOkResponse({ type: EnrollmentResponseDto })
  @Patch(':id/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeEnrollment(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<EnrollmentResponseDto> {
    return this.enrollmentsService.revokeEnrollment(adminId, id);
  }
}
