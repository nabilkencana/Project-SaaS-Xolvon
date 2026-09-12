import { Injectable } from '@nestjs/common';
import type { StoragePort, StorageUploadRequest } from './storage.port';

@Injectable()
export class LocalTestStorageService implements StoragePort {
  private readonly confirmed = new Set<string>();
  async createUploadUrl(request: StorageUploadRequest): Promise<string> {
    return `http://local-storage.test/upload/${encodeURIComponent(request.key).replace(/%2F/g, '/')}`;
  }

  async createReadUrl(key: string): Promise<string> {
    return `http://local-storage.test/read/${encodeURIComponent(key).replace(/%2F/g, '/')}`;
  }

  async confirmUpload(key: string): Promise<void> { this.confirmed.add(key); }
}
