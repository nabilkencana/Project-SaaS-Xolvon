import type { MarketplaceItemRow, MarketplaceMediaRow } from '../interfaces/marketplace-item.interface';
import type { MarketplaceItemStatus } from '../interfaces/marketplace-item.interface';
import {
  MarketplaceItemDto,
  MarketplaceMediaDto,
} from '../dto/marketplace-item-response.dto';

/**
 * Parses the comma-separated TEXT column into string[] (plan T9). Empty and
 * whitespace-only fragments are dropped; a NULL column maps to [].
 */
export function parseCapabilities(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

export function toMarketplaceItemDto(row: MarketplaceItemRow): MarketplaceItemDto {
  return new MarketplaceItemDto({
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description ?? '',
    capabilities: parseCapabilities(row.capabilities),
    externalUrl: row.external_url,
    status: row.status as MarketplaceItemStatus,
  });
}

export function toMarketplaceMediaDto(row: MarketplaceMediaRow): MarketplaceMediaDto {
  return new MarketplaceMediaDto({
    id: row.id,
    objectKey: row.object_key ?? '',
    mediaType: (row.media_type ?? 'image') as MarketplaceMediaDto['mediaType'],
    sortOrder: row.sort_order ?? 0,
  });
}
