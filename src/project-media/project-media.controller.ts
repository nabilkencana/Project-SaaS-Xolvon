import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProjectMediaService } from './project-media.service';
import { AttachProjectMediaDto } from './dto/attach-project-media.dto';
import type { ProjectMediaResponseDto } from './dto/project-media-response.dto';

/**
 * Admin-only media relations for projects (SCHEMA.md §49), mounted under the
 * shared `/projects` prefix. `mediaType` stays a controlled string — the
 * final enumeration is an open decision (decision log "Plan T7").
 */
@Controller('projects')
export class ProjectMediaController {
  constructor(private readonly projectMediaService: ProjectMediaService) {}

  /** Admin: attach one media item to a project + audit `create`. */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/media')
  @HttpCode(HttpStatus.CREATED)
  async attachMedia(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: AttachProjectMediaDto,
  ): Promise<ProjectMediaResponseDto> {
    return this.projectMediaService.attachMedia(adminId, id, dto);
  }

  /** Admin: detach one media item, scoped to the project + audit `delete`. */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id/media/:mediaId')
  @HttpCode(HttpStatus.OK)
  async detachMedia(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('mediaId', new ParseUUIDPipe({ version: '4' })) mediaId: string,
  ): Promise<{ message: string }> {
    return this.projectMediaService.detachMedia(adminId, id, mediaId);
  }
}
