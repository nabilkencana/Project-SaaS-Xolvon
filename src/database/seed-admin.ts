import './seed-admin-preflight';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PasswordService } from '../auth/password.service';
import { DatabaseService } from './database.service';
import { runMigrations } from './migrate';
import { bootstrapAdmin } from './admin-bootstrap';

const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;

async function main(): Promise<void> {
  if (!email || !password) {
    throw new Error('ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD must be set for this command');
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const db = app.get(DatabaseService);
  try {
    await runMigrations(db);
    const result = await bootstrapAdmin(db, app.get(PasswordService), { email, password });
    process.stdout.write(`Admin bootstrap ${result}.\n`);
  } finally {
    if (db instanceof DatabaseService) db.close();
    await app.close();
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/seed-admin.ts')) {
  // BUG-seed-opaque: surface the underlying failure message (Nest/D1 errors
  // are name-only for secrets; the message itself never contains values).
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Admin bootstrap failed: ${message}\n`);
    process.exitCode = 1;
  });
}
