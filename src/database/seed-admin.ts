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
  void main().catch(() => {
    process.stderr.write('Admin bootstrap failed. Check controlled command configuration.\n');
    process.exitCode = 1;
  });
}
