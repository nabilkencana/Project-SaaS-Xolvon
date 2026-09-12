import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

/**
 * Portfolio projects module (plan T7). Published-only public list/detail with
 * the SCHEMA.md §48 story order, and admin CRUD/publish transitions with
 * audit. Media attach/detach and member assign/remove live in the sibling
 * ProjectMedia/ProjectMembers modules sharing the `/projects` route prefix.
 */
@Module({
  imports: [DatabaseModule, AuthModule, AuditModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
