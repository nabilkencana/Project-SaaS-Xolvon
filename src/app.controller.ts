import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { HEALTH_SKIP_THROTTLE } from './config/throttle.config';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @SkipThrottle(HEALTH_SKIP_THROTTLE)
  @ApiOperation({ summary: 'Check API health' })
  @ApiOkResponse({ description: 'Health greeting string.' })
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
