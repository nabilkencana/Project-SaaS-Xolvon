import { BadRequestException } from '@nestjs/common';
import { MediaService } from './media.service';
import type { StoragePort } from './storage.port';
import type { AuditService } from '../audit/audit.service';
import type { CreateUploadUrlDto } from './dto/media.dto';

describe('MediaService', () => {
  let service: MediaService;
  let mockStorage: {
    createUploadUrl: jest.Mock;
    confirmUpload: jest.Mock;
    createReadUrl: jest.Mock;
  };
  let mockAudit: { record: jest.Mock };

  const dto = {
    prefix: 'private/courses',
    contentType: 'image/png',
    size: 2048,
    filename: 'slide.png',
  } as CreateUploadUrlDto;

  beforeEach(() => {
    mockStorage = {
      createUploadUrl: jest.fn().mockResolvedValue('http://storage.test/upload'),
      confirmUpload: jest.fn().mockResolvedValue(undefined),
      createReadUrl: jest.fn(),
    };
    mockAudit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new MediaService(
      mockStorage as unknown as StoragePort,
      mockAudit as unknown as AuditService,
    );
  });

  it('should record a create audit row keyed by the minted key on upload-url', async () => {
    const res = await service.createUploadUrl(dto, 'admin-1');

    expect(res.key).toMatch(/^private\/courses\/[0-9a-f-]+\.png$/);
    expect(mockAudit.record).toHaveBeenCalledWith('admin-1', 'create', 'media-upload', res.key, {
      key: res.key,
    });
  });

  it('should reject a foreign prefix without minting a URL or writing audit', async () => {
    await expect(
      service.createUploadUrl(
        { ...dto, prefix: 'private/secrets' as CreateUploadUrlDto['prefix'] },
        'admin-1',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(mockStorage.createUploadUrl).not.toHaveBeenCalled();
    expect(mockAudit.record).not.toHaveBeenCalled();
  });

  it('should record an update audit row after a successful confirm', async () => {
    const res = await service.confirm('private/courses/x.png', 'admin-1');

    expect(res).toEqual({ key: 'private/courses/x.png', confirmed: true });
    expect(mockAudit.record).toHaveBeenCalledWith(
      'admin-1',
      'update',
      'media-upload',
      'private/courses/x.png',
      { key: 'private/courses/x.png' },
    );
  });

  it('should reject a traversal key on confirm without writing audit', async () => {
    await expect(service.confirm('../etc/passwd', 'admin-1')).rejects.toThrow(
      BadRequestException,
    );

    expect(mockStorage.confirmUpload).not.toHaveBeenCalled();
    expect(mockAudit.record).not.toHaveBeenCalled();
  });

  it('should reject confirm when storage throws NotFoundException (BUG-T8-01)', async () => {
    const { NotFoundException } = await import('@nestjs/common');
    mockStorage.confirmUpload.mockRejectedValueOnce(
      new NotFoundException('Object does not exist in storage.'),
    );

    await expect(service.confirm('private/courses/missing.png', 'admin-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(mockStorage.confirmUpload).toHaveBeenCalledWith('private/courses/missing.png');
    expect(mockAudit.record).not.toHaveBeenCalled();
  });
});

