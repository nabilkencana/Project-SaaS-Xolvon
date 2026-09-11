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
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly description: string;
  readonly capabilities: string[];
  readonly externalUrl: string;
  readonly status: MarketplaceItemStatus;

  constructor(partial: Partial<MarketplaceItemDto>) {
    Object.assign(this, partial);
  }
}

export class MarketplaceMediaDto {
  readonly id: string;
  readonly objectKey: string;
  readonly mediaType: MarketplaceMediaType;
  readonly sortOrder: number;

  constructor(partial: Partial<MarketplaceMediaDto>) {
    Object.assign(this, partial);
  }
}

export class MarketplaceItemDetailDto extends MarketplaceItemDto {
  readonly media: MarketplaceMediaDto[];

  constructor(partial: Partial<MarketplaceItemDetailDto>) {
    super(partial);
    // Assigned here, not via Object.assign in super(): the `media` field
    // declaration re-initializes after super() and would wipe the value.
    this.media = partial.media ?? [];
  }
}
