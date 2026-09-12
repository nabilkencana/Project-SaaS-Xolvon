import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { StoragePort } from './storage.port';
import { STORAGE_PORT } from './storage.port';
import { MEDIA_PREFIXES, type CreateUploadUrlDto } from './dto/media.dto';

@Injectable()
export class MediaService {
  constructor(@Inject(STORAGE_PORT) private readonly storage: StoragePort) {}

  async createUploadUrl(dto: CreateUploadUrlDto) {
    if (!MEDIA_PREFIXES.includes(dto.prefix)) throw new BadRequestException('Invalid media prefix.');
    const extension = dto.filename.includes('.') ? dto.filename.slice(dto.filename.lastIndexOf('.') + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : 'bin';
    const key = `${dto.prefix}/${randomUUID()}.${extension}`;
    return { key, uploadUrl: await this.storage.createUploadUrl({ key, contentType: dto.contentType, contentLength: dto.size }), expiresIn: 3600 };
  }

  async confirm(key: string) {
    if (!this.isServerKey(key)) throw new BadRequestException('Invalid media key.');
    await this.storage.confirmUpload(key);
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
