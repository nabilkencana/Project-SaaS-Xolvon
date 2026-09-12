import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { ProjectMediaController } from './project-media.controller';
import { ProjectMediaService } from './project-media.service';

/**
 * Project media module (plan T7): admin attach/detach of `project_media`
 * rows under the shared `/projects/:id/media` routes. Presentation order is
 * owned by `sort_order` (SCHEMA.md §166); public serving excludes video and
 * object keys (ProjectsService detail query).
 */
@Module({
  imports: [DatabaseModule, AuthModule, AuditModule],
  controllers: [ProjectMediaController],
  providers: [ProjectMediaService],
})
export class ProjectMediaModule {}
