import { Injectable, NotFoundException } from '@nestjs/common';
import type { StoragePort, StorageUploadRequest } from './storage.port';

@Injectable()
export class LocalTestStorageService implements StoragePort {
  private readonly staged = new Set<string>();
  private readonly confirmed = new Set<string>();

  async createUploadUrl(request: StorageUploadRequest): Promise<string> {
    this.staged.add(request.key);
    return `http://local-storage.test/upload/${encodeURIComponent(request.key).replace(/%2F/g, '/')}`;
  }

  async createReadUrl(key: string): Promise<string> {
    return `http://local-storage.test/read/${encodeURIComponent(key).replace(/%2F/g, '/')}`;
  }

  async confirmUpload(key: string): Promise<void> {
    if (!this.staged.has(key)) {
      throw new NotFoundException('Object does not exist in storage.');
    }
    this.confirmed.add(key);
  }
}
