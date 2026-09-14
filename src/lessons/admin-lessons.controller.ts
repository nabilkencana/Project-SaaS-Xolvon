import {
  Body,
  Controller,
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
import { LessonsService } from './lessons.service';
import { AttachLessonVideoDto } from './dto/attach-lesson-video.dto';
import { LessonAdminDto } from './dto/lesson-response.dto';
import { OPENAPI_BEARER_SCHEME } from '../openapi/openapi.config';

/**
 * Admin Lesson Operations (B.1 addendum: PATCH /admin/lessons/:id/video).
 */
@ApiTags('admin/lessons')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth(OPENAPI_BEARER_SCHEME)
@Controller('admin/lessons')
export class AdminLessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @ApiOperation({ summary: 'Attach confirmed video to a lesson (admin, B.1)' })
  @ApiOkResponse({ type: LessonAdminDto })
  @Patch(':id/video')
  @HttpCode(HttpStatus.OK)
  async attachVideo(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: AttachLessonVideoDto,
  ): Promise<LessonAdminDto> {
    return this.lessonsService.attachVideo(adminId, id, dto.objectKey);
  }
}
