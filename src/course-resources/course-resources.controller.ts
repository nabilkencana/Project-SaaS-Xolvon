import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CourseResourcesService } from './course-resources.service';
import { CreateCourseResourceDto } from './dto/create-course-resource.dto';
import type { CourseResourceDto } from './dto/course-resource-response.dto';

/**
 * Course resource routes (plan T6, SCHEMA.md §24-26). Admin-only mutations
 * with audit; there is no public resource endpoint in V1 — resources reach
 * entitled users through the enrollment-gated flow (T14+).
 */
@Controller()
export class CourseResourcesController {
  constructor(private readonly courseResourcesService: CourseResourcesService) {}

  /** Admin: create a resource under an existing lesson + audit `create`. */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Post('lessons/:lessonId/resources')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser('sub') adminId: string,
    @Param('lessonId', new ParseUUIDPipe({ version: '4' })) lessonId: string,
    @Body() dto: CreateCourseResourceDto,
  ): Promise<CourseResourceDto> {
    return this.courseResourcesService.create(adminId, lessonId, dto);
  }

  /** Admin: hard delete + audit `delete`. */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('resources/:id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<CourseResourceDto> {
    return this.courseResourcesService.remove(adminId, id);
  }
}
