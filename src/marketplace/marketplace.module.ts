import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';

/**
 * Marketplace showcase module (plan T9). Published-only public reads, admin
 * CRUD/publish with audit, and media attach/detach. Deliberately imports no
 * orders/enrollments dependency: the marketplace is showcase-only, with no
 * transaction logic (SCHEMA.md §60). Home aggregation (T10) consumes
 * MarketplaceService via the export below.
 */
@Module({
  imports: [DatabaseModule, AuthModule, AuditModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
