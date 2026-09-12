import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProgressService } from './progress.service';
import { UpdateProgressDto } from './dto/update-progress.dto';

@Controller('progress')
@UseGuards(AuthGuard)
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Post()
  update(@CurrentUser('sub') userId: string, @Body() dto: UpdateProgressDto) {
    return this.progress.update(userId, dto);
  }

  @Get()
  list(@CurrentUser('sub') userId: string) {
    return this.progress.list(userId);
  }
}
