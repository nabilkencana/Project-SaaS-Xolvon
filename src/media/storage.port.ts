export const STORAGE_PORT = Symbol('STORAGE_PORT');

export interface StorageUploadRequest {
  key: string;
  contentType: string;
  contentLength: number;
}

export interface StoragePort {
  createUploadUrl(request: StorageUploadRequest): Promise<string>;
  createReadUrl(key: string, expiresIn?: number): Promise<string>;
  confirmUpload(key: string): Promise<void>;
}
