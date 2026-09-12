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
import { Throttle } from '@nestjs/throttler';
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
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { ReorderLessonDto } from './dto/reorder-lesson.dto';
import { LessonAdminDto } from './dto/lesson-response.dto';
import { SIGNED_THROTTLE } from '../config/throttle.config';
import { OPENAPI_BEARER_SCHEME } from '../openapi/openapi.config';

/**
 * Lesson management (plan T6, SCHEMA.md §18-23). All routes are admin-only
 * mutations with audit; the public lesson listing lives in
 * CourseLessonsController under the `/courses` prefix.
 */
@ApiTags('lessons')
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @UseGuards(AuthGuard)
  @Throttle(SIGNED_THROTTLE)
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'Mint a signed lesson video URL (enrollment-gated)' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Time-limited signed media URL.' },
        expiresAt: { type: 'string', description: 'ISO 8601 expiry timestamp.' },
      },
    },
  })
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
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'Update a lesson (admin)' })
  @ApiOkResponse({ type: LessonAdminDto })
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
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'Delete a lesson (admin)' })
  @ApiOkResponse({ type: LessonAdminDto })
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
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'Reorder a lesson (admin)' })
  @ApiOkResponse({ type: LessonAdminDto })
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
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'Publish a lesson (admin)' })
  @ApiOkResponse({ type: LessonAdminDto })
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
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'Unpublish a lesson (admin)' })
  @ApiOkResponse({ type: LessonAdminDto })
  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  async unpublish(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<LessonAdminDto> {
    return this.lessonsService.unpublish(adminId, id);
  }
}
