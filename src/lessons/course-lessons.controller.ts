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
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import type { LessonAdminDto, LessonSummaryDto } from './dto/lesson-response.dto';

/**
 * Lesson routes that hang off the `/courses` prefix: the public lesson list
 * of a course (SCHEMA.md §21) and the admin create-under-course endpoint
 * (plan T6). Registered alongside CoursesController's own `courses` routes —
 * the method/path pairs never overlap.
 */
@Controller('courses')
export class CourseLessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  /** Public: published lessons of a published course, ordered by order_index. */
  @Public()
  @Get(':slug/lessons')
  async listPublishedByCourseSlug(
    @Param('slug') slug: string,
  ): Promise<LessonSummaryDto[]> {
    return this.lessonsService.listPublishedByCourseSlug(slug);
  }

  /** Admin: create a draft lesson under an existing course + audit `create`. */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
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
