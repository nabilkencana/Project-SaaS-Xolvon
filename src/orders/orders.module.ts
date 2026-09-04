import { Module } from '@nestjs/common';
import { D1Module } from '../database/d1.module';
import { AuthModule } from '../auth/auth.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [D1Module, AuthModule, EnrollmentsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
