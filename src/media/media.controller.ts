import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateUploadUrlDto, ConfirmMediaDto } from './dto/media.dto';
import { MediaService } from './media.service';

@Controller('admin/media')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}
  @Post('upload-url') createUploadUrl(@Body() dto: CreateUploadUrlDto) { return this.mediaService.createUploadUrl(dto); }
  @Post('confirm') confirm(@Body() dto: ConfirmMediaDto) { return this.mediaService.confirm(dto.key); }
  @Post('read-url') readUrl(@Body() dto: ConfirmMediaDto) { return this.mediaService.readUrl(dto.key); }
}
