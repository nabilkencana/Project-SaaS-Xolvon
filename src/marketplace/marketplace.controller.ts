import {
  Body,
  Controller,
  Delete,
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
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MarketplaceService } from './marketplace.service';
import { CreateMarketplaceItemDto } from './dto/create-marketplace-item.dto';
import { UpdateMarketplaceItemDto } from './dto/update-marketplace-item.dto';
import { ListMarketplaceQueryDto } from './dto/list-marketplace-query.dto';
import { AttachMarketplaceMediaDto } from './dto/attach-marketplace-media.dto';
import type {
  MarketplaceItemDetailDto,
  MarketplaceItemDto,
  MarketplaceMediaDto,
} from './dto/marketplace-item-response.dto';

/**
 * Marketplace showcase (PRD §53-55): public catalog reads + admin listing
 * management. There is NO checkout, purchase, or payment route — the only
 * commerce surface is `externalUrl` returned to the client (SCHEMA.md §60).
 */
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  /** Public: published listings with ?q=, ?sort=, and DL-011 pagination. */
  @Get()
  async listPublished(
    @Query() query: ListMarketplaceQueryDto,
  ): Promise<{
    items: MarketplaceItemDto[];
    page: number;
    limit: number;
    total: number;
  }> {
    return this.marketplaceService.listPublished(query);
  }

  /** Public: published detail by slug with media sorted by sort_order. */
  @Get(':slug')
  async getPublishedBySlug(@Param('slug') slug: string): Promise<MarketplaceItemDetailDto> {
    return this.marketplaceService.getPublishedBySlug(slug);
  }

  /** Admin: create a draft listing + audit `create`. */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser('sub') adminId: string,
    @Body() dto: CreateMarketplaceItemDto,
  ): Promise<MarketplaceItemDto> {
    return this.marketplaceService.create(adminId, dto);
  }

  /** Admin: partial update + audit `update`. */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateMarketplaceItemDto,
  ): Promise<MarketplaceItemDto> {
    return this.marketplaceService.update(adminId, id, dto);
  }

  /** Admin: publish (draft → published) + audit `publish`. */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  async publish(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<MarketplaceItemDto> {
    return this.marketplaceService.publish(adminId, id);
  }

  /** Admin: unpublish (published → draft) + audit `unpublish`. */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  async unpublish(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<MarketplaceItemDto> {
    return this.marketplaceService.unpublish(adminId, id);
  }

  /** Admin: attach media to a listing + audit. */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/media')
  @HttpCode(HttpStatus.CREATED)
  async attachMedia(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: AttachMarketplaceMediaDto,
  ): Promise<MarketplaceMediaDto> {
    return this.marketplaceService.attachMedia(adminId, id, dto);
  }

  /** Admin: detach media from a listing + audit. */
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id/media/:mediaId')
  @HttpCode(HttpStatus.OK)
  async detachMedia(
    @CurrentUser('sub') adminId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('mediaId', new ParseUUIDPipe({ version: '4' })) mediaId: string,
  ): Promise<{ message: string }> {
    return this.marketplaceService.detachMedia(adminId, id, mediaId);
  }
}
