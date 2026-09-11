import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';

/**
 * Public home aggregation (plan T10). Read-only: no admin routes, no audit
 * writes, no exports — nothing outside this module consumes HomeService.
 */
@Module({
  imports: [DatabaseModule],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
