import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordService {
  /**
   * Hashes a plaintext password using Argon2id with default recommended settings.
   */
  async hash(password: string): Promise<string> {
    return argon2.hash(password);
  }

  /**
   * Verifies a plaintext password against an Argon2 hash.
   */
  async verify(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}
