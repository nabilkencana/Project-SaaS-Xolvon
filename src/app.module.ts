import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { OrdersModule } from './orders/orders.module';
import { CoursesModule } from './courses/courses.module';
import { CollectiveModule } from './collective/collective.module';
import { AuditModule } from './audit/audit.module';
import { HomeModule } from './home/home.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { validateEnvironment } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnvironment,
    }),
    DatabaseModule,
    AuthModule,
    EnrollmentsModule,
    OrdersModule,
    CoursesModule,
    HomeModule,
    MarketplaceModule,
    AuditModule,
    CollectiveModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
