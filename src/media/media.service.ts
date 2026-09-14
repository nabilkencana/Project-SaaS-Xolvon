import { BadRequestException, Inject, Injectable, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { StoragePort } from './storage.port';
import { STORAGE_PORT } from './storage.port';
import { MEDIA_PREFIXES, type CreateUploadUrlDto } from './dto/media.dto';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class MediaService {
  constructor(
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    private readonly audit: AuditService,
    @Optional() private readonly db?: DatabaseService,
  ) {}

  async createUploadUrl(dto: CreateUploadUrlDto, adminId: string) {
    if (!MEDIA_PREFIXES.includes(dto.prefix)) throw new BadRequestException('Invalid media prefix.');
    const extension = dto.filename.includes('.') ? dto.filename.slice(dto.filename.lastIndexOf('.') + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : 'bin';
    const key = `${dto.prefix}/${randomUUID()}.${extension}`;
    const uploadUrl = await this.storage.createUploadUrl({ key, contentType: dto.contentType, contentLength: dto.size });
    // BUG-audit-media (handbook §7): minting an upload slot is an admin action.
    await this.audit.record(adminId, 'create', 'media-upload', key, { key });
    if (this.db) {
      const now = new Date().toISOString();
      await this.db.execute(
        `INSERT INTO media_objects (id, key, uploaded_by, content_type, size_bytes, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'issued', ?)
         ON CONFLICT(key) DO NOTHING;`,
        [randomUUID(), key, adminId, dto.contentType, dto.size, now],
      );
    }
    return { key, uploadUrl, expiresIn: 3600 };
  }

  async confirm(key: string, adminId: string) {
    if (!this.isServerKey(key)) throw new BadRequestException('Invalid media key.');
    await this.storage.confirmUpload(key);
    await this.audit.record(adminId, 'update', 'media-upload', key, { key });
    if (this.db) {
      const now = new Date().toISOString();
      await this.db.execute(
        `INSERT INTO media_objects (id, key, uploaded_by, status, created_at, confirmed_at)
         VALUES (?, ?, ?, 'confirmed', ?, ?)
         ON CONFLICT(key) DO UPDATE SET status = 'confirmed', confirmed_at = ?;`,
        [randomUUID(), key, adminId, now, now, now],
      );
    }
    return { key, confirmed: true };
  }

  async readUrl(key: string) {
    if (!this.isServerKey(key)) throw new BadRequestException('Invalid media key.');
    return { readUrl: await this.storage.createReadUrl(key), expiresIn: 300 };
  }

  private isServerKey(key: string): boolean {
    return MEDIA_PREFIXES.some((prefix) =>
      key.startsWith(`${prefix}/`) && !key.includes('..') && !key.includes('\\'),
    );
  }
}
