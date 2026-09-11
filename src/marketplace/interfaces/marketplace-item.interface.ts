/** DB row shape for `marketplace_items` (migration 0005_marketplace.sql). */
export interface MarketplaceItemRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  /** Stored as comma-separated TEXT (plan T9); parsed to string[] at the API boundary. */
  capabilities: string | null;
  external_url: string;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}

/** DB row shape for `marketplace_media` (migration 0005_marketplace.sql). */
export interface MarketplaceMediaRow {
  id: string;
  marketplace_id: string;
  object_key: string | null;
  media_type: string | null;
  sort_order: number | null;
}

/**
 * Lifecycle status constrained by the migration CHECK. Kept as a union type
 * for response DTOs; raw rows are validated implicitly by the database.
 */
export type MarketplaceItemStatus = 'draft' | 'published';

/**
 * Media kinds required by PRD §54 (Image/Video/Deck). SCHEMA.md §63 leaves the
 * exact final enum to the implementation decision — V1 fixes these three and
 * enforces them at the DTO boundary only (the column stays unconstrained TEXT).
 */
export type MarketplaceMediaType = 'image' | 'video' | 'deck';
