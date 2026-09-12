import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LessonsService } from './lessons.service';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { ReorderLessonDto } from './dto/reorder-lesson.dto';
import type { LessonAdminDto } from './dto/lesson-response.dto';

/**
 * Lesson management (plan T6, SCHEMA.md §18-23). All routes are admin-only
 * mutations with audit; the public lesson listing lives in
 * CourseLessonsController under the `/courses` prefix.
 */
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @UseGuards(AuthGuard)
  @Get(':id/video-url')
  @HttpCode(HttpStatus.OK)
  async videoUrl(
    @CurrentUser('sub') userId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<{ url: string; expiresAt: string }> {
    return this.lessonsService.getVideoUrl(userId, id);
  }

  /** Admin: partial update + audit `update`. */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateLessonDto,
  ): Promise<LessonAdminDto> {
    return this.lessonsService.update(adminId, id, dto);
  }

  /** Admin: hard delete (resources cascade) + audit `delete`. */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<LessonAdminDto> {
    return this.lessonsService.remove(adminId, id);
  }

  /** Admin: write a new order_index + audit `update` (SCHEMA.md §167). */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/reorder')
  @HttpCode(HttpStatus.OK)
  async reorder(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ReorderLessonDto,
  ): Promise<LessonAdminDto> {
    return this.lessonsService.reorder(adminId, id, dto);
  }

  /** Admin: draft → published + audit `publish`. */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  async publish(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<LessonAdminDto> {
    return this.lessonsService.publish(adminId, id);
  }

  /** Admin: published → draft + audit `unpublish`. */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  async unpublish(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<LessonAdminDto> {
    return this.lessonsService.unpublish(adminId, id);
  }
}
