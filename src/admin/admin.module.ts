import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

/**
 * Admin module (plan T12). Operational read endpoints over users/orders/
 * enrollments behind the class-level admin guard. No exports — nothing
 * consumes AdminService; mutations (verify/activate/revoke/cancel, T15)
 * stay in their own modules and write audit trail entries.
 */
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
