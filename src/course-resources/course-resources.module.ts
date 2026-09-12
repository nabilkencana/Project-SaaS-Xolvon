import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { CourseResourcesController } from './course-resources.controller';
import { CourseResourcesService } from './course-resources.service';

/**
 * Course resources module (plan T6). Admin-only create/delete of lesson
 * resources (pdf|resource|assignment) with audit. Exported so the future
 * enrollment-gated resource access flow (T14+) can consume the service.
 */
@Module({
  imports: [DatabaseModule, AuthModule, AuditModule],
  controllers: [CourseResourcesController],
  providers: [CourseResourcesService],
  exports: [CourseResourcesService],
})
export class CourseResourcesModule {}
