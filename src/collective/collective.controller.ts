import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CollectiveService } from './collective.service';
import { CollectiveListQueryDto } from './dto/collective-list-query.dto';
import { CATALOG_THROTTLE } from '../config/throttle.config';
import { CreateCollectiveMemberDto } from './dto/create-collective-member.dto';
import { UpdateCollectiveMemberDto } from './dto/update-collective-member.dto';
import type {
  CollectiveMemberDetailDto,
  CollectiveMemberResponseDto,
  PaginatedCollectiveResponseDto,
} from './dto/collective-member-response.dto';

@Controller('collective')
export class CollectiveController {
  constructor(private readonly collectiveService: CollectiveService) {}

  /**
   * Public: list published members for the /collective page and home
   * carousel (display_order ASC, created_at DESC). Never exposes
   * email/phone (SCHEMA.md §57).
   */
  @Throttle(CATALOG_THROTTLE)
  @Get()
  async listPublished(
    @Query() query: CollectiveListQueryDto,
  ): Promise<PaginatedCollectiveResponseDto> {
    return this.collectiveService.listPublished({
      q: query.q,
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * Public: member detail with related published projects, read both ways
   * via project_members (PRD.md §61).
   */
  @Get(':slug')
  async getBySlug(@Param('slug') slug: string): Promise<CollectiveMemberDetailDto> {
    return this.collectiveService.getDetailBySlug(slug);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser('sub') adminId: string,
    @Body() dto: CreateCollectiveMemberDto,
  ): Promise<CollectiveMemberResponseDto> {
    return this.collectiveService.create(adminId, dto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id')
  async update(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateCollectiveMemberDto,
  ): Promise<CollectiveMemberResponseDto> {
    return this.collectiveService.update(adminId, id, dto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  async publish(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<CollectiveMemberResponseDto> {
    return this.collectiveService.publish(adminId, id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  async unpublish(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<CollectiveMemberResponseDto> {
    return this.collectiveService.unpublish(adminId, id);
  }
}
