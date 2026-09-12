import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { ProjectMembersController } from './project-members.controller';
import { ProjectMembersService } from './project-members.service';

/**
 * Project members module (plan T7): admin assign/remove of the Project ↔
 * Collective Member many-to-many relation under the shared
 * `/projects/:id/members` routes. Role attribution is mandatory and explicit
 * (SCHEMA.md §51-53); the "Built by" public projection is served by
 * ProjectsService detail.
 */
@Module({
  imports: [DatabaseModule, AuthModule, AuditModule],
  controllers: [ProjectMembersController],
  providers: [ProjectMembersService],
})
export class ProjectMembersModule {}
