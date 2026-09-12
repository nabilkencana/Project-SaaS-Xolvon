import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import {
  LessonAdminDto,
  LessonSummaryDto,
} from './dto/lesson-response.dto';
import { OPENAPI_BEARER_SCHEME } from '../openapi/openapi.config';

/**
 * Lesson routes that hang off the `/courses` prefix: the public lesson list
 * of a course (SCHEMA.md §21) and the admin create-under-course endpoint
 * (plan T6). Registered alongside CoursesController's own `courses` routes —
 * the method/path pairs never overlap.
 */
@ApiTags('courses')
@Controller('courses')
export class CourseLessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  /** Public: published lessons of a published course, ordered by order_index. */
  @Public()
  @ApiOperation({ summary: 'List published lessons of a course' })
  @ApiOkResponse({ type: LessonSummaryDto, isArray: true })
  @Get(':slug/lessons')
  async listPublishedByCourseSlug(
    @Param('slug') slug: string,
  ): Promise<LessonSummaryDto[]> {
    return this.lessonsService.listPublishedByCourseSlug(slug);
  }

  /** Admin: create a draft lesson under an existing course + audit `create`. */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'Create a draft lesson under a course (admin)' })
  @ApiCreatedResponse({ type: LessonAdminDto })
  @Post(':courseId/lessons')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser('sub') adminId: string,
    @Param('courseId', new ParseUUIDPipe({ version: '4' })) courseId: string,
    @Body() dto: CreateLessonDto,
  ): Promise<LessonAdminDto> {
    return this.lessonsService.create(adminId, courseId, dto);
  }
}
