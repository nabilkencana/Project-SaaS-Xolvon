import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
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
import { CreateUploadUrlDto, ConfirmMediaDto } from './dto/media.dto';
import { MediaService } from './media.service';
import { SIGNED_THROTTLE } from '../config/throttle.config';
import { OPENAPI_BEARER_SCHEME } from '../openapi/openapi.config';

@ApiTags('media')
@Controller('admin/media')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth(OPENAPI_BEARER_SCHEME)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @ApiOperation({ summary: 'Create a presigned upload URL for private/public media (admin)' })
  @ApiCreatedResponse({
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Server-generated object key.' },
        uploadUrl: { type: 'string', description: 'Presigned PUT URL.' },
        expiresIn: { type: 'integer', description: 'URL validity in seconds.' },
      },
    },
  })
  @Throttle(SIGNED_THROTTLE)
  @Post('upload-url')
  @HttpCode(HttpStatus.CREATED)
  createUploadUrl(@Body() dto: CreateUploadUrlDto, @CurrentUser('sub') adminId: string) {
    return this.mediaService.createUploadUrl(dto, adminId);
  }

  @ApiOperation({ summary: 'Confirm a completed upload (admin, B.5 -> 201)' })
  @ApiCreatedResponse({
    schema: {
      type: 'object',
      properties: { key: { type: 'string' }, confirmed: { type: 'boolean' } },
    },
  })
  @Post('confirm')
  @HttpCode(HttpStatus.CREATED)
  confirm(@Body() dto: ConfirmMediaDto, @CurrentUser('sub') adminId: string) {
    return this.mediaService.confirm(dto.key, adminId);
  }

  @ApiOperation({ summary: 'Create a presigned read URL for private media (admin, B.5 -> 200)' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        readUrl: { type: 'string', description: 'Presigned GET URL.' },
        expiresIn: { type: 'integer', description: 'URL validity in seconds.' },
      },
    },
  })
  @Throttle(SIGNED_THROTTLE)
  @Post('read-url')
  @HttpCode(HttpStatus.OK)
  readUrl(@Body() dto: ConfirmMediaDto) {
    return this.mediaService.readUrl(dto.key);
  }
}
