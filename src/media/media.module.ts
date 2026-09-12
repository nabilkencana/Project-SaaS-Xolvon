import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { LocalTestStorageService } from './local-test-storage.service';
import { R2StorageService } from './r2-storage.service';
import { STORAGE_PORT } from './storage.port';

@Module({
  imports: [ConfigModule, AuthModule], controllers: [MediaController], providers: [MediaService, LocalTestStorageService,
    { provide: STORAGE_PORT, inject: [ConfigService, LocalTestStorageService], useFactory: (config: ConfigService, local: LocalTestStorageService) => config.get('STORAGE_DRIVER') === 'r2' ? new R2StorageService(config) : local },],
})
export class MediaModule {}
