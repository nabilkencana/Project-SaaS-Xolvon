import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuditService } from './audit.service';

/**
 * Provides the immutable audit trail helper for other modules (orders,
 * enrollments, courses, marketplace, admin). Deliberately registers no
 * controller: audit logs are write-only and never exposed over HTTP
 * (SCHEMA.md §64-66, HANDBOOK_BACKEND.md §7).
 */
@Module({
  imports: [DatabaseModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
