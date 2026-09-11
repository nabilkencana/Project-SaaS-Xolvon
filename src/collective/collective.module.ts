import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { CollectiveController } from './collective.controller';
import { CollectiveService } from './collective.service';

/**
 * Collective member profiles (SCHEMA.md §54-57). Public routes serve
 * published members through the privacy whitelist mapper; admin mutations
 * are guarded and audited.
 */
@Module({
  imports: [DatabaseModule, AuthModule, AuditModule],
  controllers: [CollectiveController],
  providers: [CollectiveService],
  exports: [CollectiveService],
})
export class CollectiveModule {}
