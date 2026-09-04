import { Module } from '@nestjs/common';
import { D1Module } from '../database/d1.module';
import { AuthModule } from '../auth/auth.module';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';

@Module({
  imports: [D1Module, AuthModule],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
