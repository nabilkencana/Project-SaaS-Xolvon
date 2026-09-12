import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProgressService } from './progress.service';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { OPENAPI_BEARER_SCHEME } from '../openapi/openapi.config';

const PROGRESS_SCHEMA = {
  type: 'object',
  properties: {
    lessonId: { type: 'string' },
    completed: { type: 'boolean' },
    completedAt: { type: 'string', nullable: true },
    updatedAt: { type: 'string' },
  },
};

@ApiTags('progress')
@Controller('progress')
@UseGuards(AuthGuard)
@ApiBearerAuth(OPENAPI_BEARER_SCHEME)
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @ApiOperation({ summary: 'Write lesson progress for the caller' })
  @ApiOkResponse({ schema: PROGRESS_SCHEMA })
  @Post()
  update(@CurrentUser('sub') userId: string, @Body() dto: UpdateProgressDto) {
    return this.progress.update(userId, dto);
  }

  @ApiOperation({ summary: 'List lesson progress of the caller' })
  @ApiOkResponse({ schema: { type: 'array', items: PROGRESS_SCHEMA } })
  @Get()
  list(@CurrentUser('sub') userId: string) {
    return this.progress.list(userId);
  }
}
