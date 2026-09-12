import { ApiProperty } from '@nestjs/swagger';
import type {
  MarketplaceItemStatus,
  MarketplaceMediaType,
} from '../interfaces/marketplace-item.interface';

/**
 * Public item contract (SCHEMA.md §59). `capabilities` is parsed from the
 * comma-separated TEXT column into a string[]; `externalUrl` is the only
 * commerce-related field — the item is a SHOWCASE entry (SCHEMA.md §60),
 * there is no price, order, or checkout data on this DTO by design.
 */
export class MarketplaceItemDto {
  @ApiProperty({ description: 'Item id (UUID v4).' })
  readonly id: string;

  @ApiProperty()
  readonly title: string;

  @ApiProperty()
  readonly slug: string;

  @ApiProperty()
  readonly description: string;

  @ApiProperty({ type: [String] })
  readonly capabilities: string[];

  @ApiProperty({ description: 'Outbound https product URL.' })
  readonly externalUrl: string;

  @ApiProperty({ enum: ['draft', 'published'] satisfies [MarketplaceItemStatus, ...MarketplaceItemStatus[]] })
  readonly status: MarketplaceItemStatus;

  constructor(partial: Partial<MarketplaceItemDto>) {
    Object.assign(this, partial);
  }
}

export class MarketplaceMediaDto {
  @ApiProperty({ description: 'Media id (UUID v4).' })
  readonly id: string;

  @ApiProperty()
  readonly objectKey: string;

  @ApiProperty({ enum: ['image', 'video', 'deck'] satisfies [MarketplaceMediaType, ...MarketplaceMediaType[]] })
  readonly mediaType: MarketplaceMediaType;

  @ApiProperty()
  readonly sortOrder: number;

  constructor(partial: Partial<MarketplaceMediaDto>) {
    Object.assign(this, partial);
  }
}

export class MarketplaceItemDetailDto extends MarketplaceItemDto {
  @ApiProperty({ type: () => [MarketplaceMediaDto] })
  readonly media: MarketplaceMediaDto[];

  constructor(partial: Partial<MarketplaceItemDetailDto>) {
    super(partial);
    // Assigned here, not via Object.assign in super(): the `media` field
    // declaration re-initializes after super() and would wipe the value.
    this.media = partial.media ?? [];
  }
}
