import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
import { ProjectsModule } from './projects/projects.module';
import { ProjectMediaModule } from './project-media/project-media.module';
import { ProjectMembersModule } from './project-members/project-members.module';
import { LessonsModule } from './lessons/lessons.module';
import { CourseResourcesModule } from './course-resources/course-resources.module';
import { AdminModule } from './admin/admin.module';
import { validateEnvironment } from './config/env.validation';
import { MediaModule } from './media/media.module';
import { ProgressModule } from './progress/progress.module';
import { SearchModule } from './search/search.module';
import { RequestIntegrityGuard } from './common/guards/request-integrity.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnvironment,
    }),
    // Global default: 100 req/min per IP per route (generous). Auth routes
    // tighten to 5/min via @Throttle in AuthController (DL-012).
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 100 }]),
    DatabaseModule,
    AuthModule,
    EnrollmentsModule,
    OrdersModule,
    CoursesModule,
    HomeModule,
    MarketplaceModule,
    AuditModule,
    CollectiveModule,
    ProjectsModule,
    ProjectMediaModule,
    ProjectMembersModule,
    LessonsModule,
    CourseResourcesModule,
    AdminModule,
    MediaModule,
    ProgressModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: RequestIntegrityGuard },
  ],
})
export class AppModule {}
