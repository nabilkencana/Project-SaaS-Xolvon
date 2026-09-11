import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import type {
  MarketplaceItemRow,
  MarketplaceMediaRow,
} from './interfaces/marketplace-item.interface';
import type { CreateMarketplaceItemDto } from './dto/create-marketplace-item.dto';
import type { UpdateMarketplaceItemDto } from './dto/update-marketplace-item.dto';
import type { ListMarketplaceQueryDto } from './dto/list-marketplace-query.dto';
import type { AttachMarketplaceMediaDto } from './dto/attach-marketplace-media.dto';
import {
  MarketplaceItemDetailDto,
  MarketplaceItemDto,
  MarketplaceMediaDto,
} from './dto/marketplace-item-response.dto';
import {
  toMarketplaceItemDto,
  toMarketplaceMediaDto,
} from './mappers/marketplace.mapper';

/** DL-011 pagination contract: ?limit= defaults to 20, maximum 100. */
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function joinCapabilities(capabilities: string[] | undefined): string | null {
  if (!capabilities) return null;
  const joined = capabilities
    .map((c) => c.trim())
    .filter((c) => c.length > 0)
    .join(',');
  return joined.length > 0 ? joined : null;
}

/**
 * Marketplace showcase service (SCHEMA.md §58-63, PRD §53-57).
 *
 * STRICT SCOPE: the marketplace is a SHOWCASE, not a transaction entity
 * (SCHEMA.md §60) — this service contains no price, order, checkout, or
 * payment logic of any kind. The only commerce surface is `external_url`,
 * which points visitors to the external SaaS website.
 */
@Injectable()
export class MarketplaceService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Public list: published items only, optional `?q=` search over
   * title/description, `?sort=` latest (default) | oldest, DL-011 pagination.
   */
  async listPublished(
    query: ListMarketplaceQueryDto,
  ): Promise<{
    items: MarketplaceItemDto[];
    page: number;
    limit: number;
    total: number;
  }> {
    // Service-level clamp so non-HTTP callers cannot bypass the DL-011 maximum.
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
    const offset = (page - 1) * limit;
    const direction = query.sort === 'oldest' ? 'ASC' : 'DESC';

    const params: unknown[] = [];
    let where = "status = 'published'";
    if (query.q) {
      // Escape LIKE wildcards so the visitor query matches literally.
      const pattern = query.q
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
      where += ` AND (title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')`;
      params.push(pattern, pattern);
    }

    const rows = await this.db.queryAll<MarketplaceItemRow>(
      `SELECT * FROM marketplace_items WHERE ${where} ` +
        `ORDER BY created_at ${direction}, id ${direction} LIMIT ? OFFSET ?;`,
      [...params, limit, offset],
    );
    const countRow = await this.db.queryOne<{ total: number }>(
      `SELECT COUNT(*) AS total FROM marketplace_items WHERE ${where};`,
      params,
    );

    return {
      items: rows.map(toMarketplaceItemDto),
      page,
      limit,
      total: countRow?.total ?? 0,
    };
  }

  /**
   * Public detail by slug: published-only lookup (a draft slug is
   * indistinguishable from a missing one — both 404), with media sorted by
   * `sort_order` and parsed capabilities.
   */
  async getPublishedBySlug(slug: string): Promise<MarketplaceItemDetailDto> {
    const row = await this.db.queryOne<MarketplaceItemRow>(
      `SELECT * FROM marketplace_items WHERE slug = ? LIMIT 1;`,
      [slug],
    );

    // Published-only guard in code: draft rows 404 exactly like missing ones.
    if (!row || row.status !== 'published') {
      throw new NotFoundException('Item marketplace tidak ditemukan.');
    }

    const media = await this.db.queryAll<MarketplaceMediaRow>(
      `SELECT * FROM marketplace_media WHERE marketplace_id = ? ` +
        `ORDER BY sort_order ASC, id ASC;`,
      [row.id],
    );

    return new MarketplaceItemDetailDto({
      ...toMarketplaceItemDto(row),
      media: media.map(toMarketplaceMediaDto),
    });
  }

  /**
   * Admin: create a showcase listing in `draft` status. Validates the
   * external URL (valid parse + https-only) and enforces slug uniqueness.
   * Audits action `create`.
   */
  async create(adminId: string, dto: CreateMarketplaceItemDto): Promise<MarketplaceItemDto> {
    const externalUrl = this.assertHttpsUrl(dto.externalUrl);
    const slug = await this.assertSlugAvailable(dto.slug);

    const id = randomUUID();
    const now = new Date().toISOString();
    const description = dto.description ?? null;
    const capabilities = joinCapabilities(dto.capabilities);

    await this.db.execute(
      `INSERT INTO marketplace_items ` +
        `(id, title, slug, description, capabilities, external_url, status, created_at, updated_at) ` +
        `VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?);`,
      [id, dto.title, slug, description, capabilities, externalUrl, now, now],
    );

    await this.audit.record(adminId, 'create', 'marketplace_item', id, { slug });

    return toMarketplaceItemDto({
      id,
      title: dto.title,
      slug,
      description,
      capabilities,
      external_url: externalUrl,
      status: 'draft',
      created_at: now,
      updated_at: now,
    });
  }

  /**
   * Admin: partial update. Only provided fields are written; the external URL
   * is revalidated and a changed slug is re-checked for uniqueness. Audits
   * action `update` only when something actually changed.
   */
  async update(
    adminId: string,
    id: string,
    dto: UpdateMarketplaceItemDto,
  ): Promise<MarketplaceItemDto> {
    const row = await this.getItemOrThrow(id);

    const changed: Partial<MarketplaceItemRow> = {};
    if (dto.title !== undefined) changed.title = dto.title;
    if (dto.description !== undefined) changed.description = dto.description;
    if (dto.externalUrl !== undefined) {
      changed.external_url = this.assertHttpsUrl(dto.externalUrl);
    }
    if (dto.capabilities !== undefined) {
      changed.capabilities = joinCapabilities(dto.capabilities);
    }
    // Re-sending the current slug is a no-op; a new slug must be free.
    if (dto.slug !== undefined && dto.slug !== row.slug) {
      await this.assertSlugAvailable(dto.slug);
      changed.slug = dto.slug;
    }

    const changedKeys = Object.keys(changed) as (keyof MarketplaceItemRow)[];
    if (changedKeys.length === 0) {
      return toMarketplaceItemDto(row);
    }

    const now = new Date().toISOString();
    const sets = changedKeys.map((key) => `${key} = ?`);
    const params: unknown[] = changedKeys.map((key) => changed[key]);
    sets.push('updated_at = ?');
    params.push(now, id);

    await this.db.execute(
      `UPDATE marketplace_items SET ${sets.join(', ')} WHERE id = ?;`,
      params,
    );

    await this.audit.record(adminId, 'update', 'marketplace_item', id, {
      fields: changedKeys,
    });

    return toMarketplaceItemDto({ ...row, ...changed, updated_at: now });
  }

  /**
   * Admin: strict transition draft → published. Audits action `publish`;
   * every publish audit therefore corresponds to a real transition.
   */
  async publish(adminId: string, id: string): Promise<MarketplaceItemDto> {
    const row = await this.getItemOrThrow(id);

    if (row.status === 'published') {
      throw new BadRequestException('Item sudah berstatus published.');
    }

    const now = new Date().toISOString();
    await this.db.execute(
      `UPDATE marketplace_items SET status = 'published', updated_at = ? WHERE id = ?;`,
      [now, id],
    );

    await this.audit.record(adminId, 'publish', 'marketplace_item', id, {
      slug: row.slug,
    });

    return toMarketplaceItemDto({ ...row, status: 'published', updated_at: now });
  }

  /**
   * Admin: strict transition published → draft. Audits action `unpublish`.
   */
  async unpublish(adminId: string, id: string): Promise<MarketplaceItemDto> {
    const row = await this.getItemOrThrow(id);

    if (row.status === 'draft') {
      throw new BadRequestException('Item sudah berstatus draft.');
    }

    const now = new Date().toISOString();
    await this.db.execute(
      `UPDATE marketplace_items SET status = 'draft', updated_at = ? WHERE id = ?;`,
      [now, id],
    );

    await this.audit.record(adminId, 'unpublish', 'marketplace_item', id, {
      slug: row.slug,
    });

    return toMarketplaceItemDto({ ...row, status: 'draft', updated_at: now });
  }

  /**
   * Admin: attach media (object key from the R2 upload flow) to an item.
   * Audits action `create` on `marketplace_media`.
   */
  async attachMedia(
    adminId: string,
    itemId: string,
    dto: AttachMarketplaceMediaDto,
  ): Promise<MarketplaceMediaDto> {
    await this.getItemOrThrow(itemId);

    const id = randomUUID();
    const sortOrder = dto.sortOrder ?? 0;

    await this.db.execute(
      `INSERT INTO marketplace_media (id, marketplace_id, object_key, media_type, sort_order) ` +
        `VALUES (?, ?, ?, ?, ?);`,
      [id, itemId, dto.objectKey, dto.mediaType, sortOrder],
    );

    await this.audit.record(adminId, 'create', 'marketplace_media', id, {
      marketplaceItemId: itemId,
    });

    return new MarketplaceMediaDto({
      id,
      objectKey: dto.objectKey,
      mediaType: dto.mediaType,
      sortOrder,
    });
  }

  /**
   * Admin: detach media scoped to the item (cross-item ids are 404).
   * Audits action `delete` on `marketplace_media`.
   */
  async detachMedia(
    adminId: string,
    itemId: string,
    mediaId: string,
  ): Promise<{ message: string }> {
    await this.getItemOrThrow(itemId);

    const media = await this.db.queryOne<{ id: string }>(
      `SELECT id FROM marketplace_media WHERE id = ? AND marketplace_id = ? LIMIT 1;`,
      [mediaId, itemId],
    );

    if (!media) {
      throw new NotFoundException(
        'Media tidak ditemukan untuk item marketplace ini.',
      );
    }

    await this.db.execute(
      `DELETE FROM marketplace_media WHERE id = ? AND marketplace_id = ?;`,
      [mediaId, itemId],
    );

    await this.audit.record(adminId, 'delete', 'marketplace_media', mediaId, {
      marketplaceItemId: itemId,
    });

    return { message: 'Media berhasil dilepas dari item marketplace.' };
  }

  private async getItemOrThrow(id: string): Promise<MarketplaceItemRow> {
    const row = await this.db.queryOne<MarketplaceItemRow>(
      `SELECT * FROM marketplace_items WHERE id = ? LIMIT 1;`,
      [id],
    );
    if (!row) {
      throw new NotFoundException('Item marketplace tidak ditemukan.');
    }
    return row;
  }

  private async assertSlugAvailable(slug: string): Promise<string> {
    const existing = await this.db.queryOne<{ id: string }>(
      `SELECT id FROM marketplace_items WHERE slug = ? LIMIT 1;`,
      [slug],
    );
    if (existing) {
      throw new ConflictException('Slug sudah digunakan.');
    }
    return slug;
  }

  /**
   * Minimal external URL validation adopted for V1 (plan T9):
   * - must parse as an absolute URL (rejects non-URL strings);
   * - must be https (rejects http — the CTA redirects visitors off-site, so
   *   an insecure target would be a redirection-security hole).
   *
   * OPEN DECISION (PRD §91.11, SCHEMA.md §61, decision log DL-013): the final
   * URL approval/allowlist/management governance is NOT implemented here —
   * do not build additional business logic on top of this assumption.
   */
  private assertHttpsUrl(raw: string): string {
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      throw new BadRequestException('external_url harus URL yang valid.');
    }
    if (parsed.protocol !== 'https:') {
      throw new BadRequestException(
        'external_url harus menggunakan protokol https.',
      );
    }
    return raw;
  }
}
