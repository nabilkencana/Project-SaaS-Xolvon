import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

/**
 * Courses module (plan T5). Published-only public catalog/detail with safe
 * lesson summaries, and admin CRUD/publish transitions with audit. Home
 * aggregation (T10) consumes CoursesService via the export below; Lessons
 * (T6) and the signed URL flow (T14) build on the courses entity.
 */
@Module({
  imports: [DatabaseModule, AuthModule, AuditModule],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
