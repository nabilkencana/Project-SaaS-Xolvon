import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';
import { HEALTH_SKIP_THROTTLE } from './config/throttle.config';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @SkipThrottle(HEALTH_SKIP_THROTTLE)
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
