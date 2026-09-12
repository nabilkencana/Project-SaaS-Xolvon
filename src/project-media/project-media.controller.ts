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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProjectMediaService } from './project-media.service';
import { AttachProjectMediaDto } from './dto/attach-project-media.dto';
import { ProjectMediaResponseDto } from './dto/project-media-response.dto';
import { OPENAPI_BEARER_SCHEME } from '../openapi/openapi.config';

/**
 * Admin-only media relations for projects (SCHEMA.md §49), mounted under the
 * shared `/projects` prefix. `mediaType` stays a controlled string — the
 * final enumeration is an open decision (decision log "Plan T7").
 */
@ApiTags('projects')
@Controller('projects')
export class ProjectMediaController {
  constructor(private readonly projectMediaService: ProjectMediaService) {}

  /** Admin: attach one media item to a project + audit `create`. */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'Attach media to a project (admin)' })
  @ApiCreatedResponse({ type: ProjectMediaResponseDto })
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
  @ApiBearerAuth(OPENAPI_BEARER_SCHEME)
  @ApiOperation({ summary: 'Detach media from a project (admin)' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { message: { type: 'string' } },
      required: ['message'],
    },
  })
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
