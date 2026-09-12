import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { LessonsController } from './lessons.controller';
import { CourseLessonsController } from './course-lessons.controller';
import { LessonsService } from './lessons.service';

/**
 * Lessons module (plan T6). Admin CRUD/reorder/publish transitions with
 * audit, plus the published-only public lesson list under `/courses/:slug/lessons`.
 * The signed URL flow (T14) builds on the lessons entity.
 */
@Module({
  imports: [DatabaseModule, AuthModule, AuditModule],
  controllers: [LessonsController, CourseLessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
