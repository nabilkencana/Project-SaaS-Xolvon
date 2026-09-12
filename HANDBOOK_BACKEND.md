# HANDBOOK BACKEND XOLVON.COM

**Versi:** 1.1
**Tanggal:** 7 September 2026
**Penyusun:** Database and Storage Engineering
**Status:** Wajib dibaca oleh Tim Backend (BE)

---

## 1. Pendahuluan

### 1.1 Tujuan
Dokumen ini merupakan panduan teknis resmi bagi Tim Backend (BE) dalam mengelola API, Autentikasi, Transaksi, dan Integrasi Database pada proyek Xolvon.com. Seluruh contoh kode disesuaikan dengan NestJS, mencakup Controller, Service, Module, dan Guard.

### 1.2 Prinsip Utama
> **"Server owns trust."**

Seluruh akses data sensitif (payment, enrollment, password, media premium) wajib divalidasi di sisi server, bukan pada client atau browser.

---

## 2. Status Saat Ini (Local Mode)

### 2.1 Kondisi Local
Karena kendala akses email untuk login Cloudflare, seluruh proses development saat ini berjalan pada local environment menggunakan **better-sqlite3**.

### 2.2 DatabaseService (NestJS)

```typescript
// src/database/database.service.ts
import { Injectable } from '@nestjs/common';
import Database = require('better-sqlite3');
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class DatabaseService {
  private db: any;

  constructor() {
    const dbPath = path.join(process.cwd(), 'local.db');

    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, '');
    }

    this.db = new Database(dbPath);
    this.db.pragma('foreign_keys = ON');
  }

  async queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...params) as T[];
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  async execute(sql: string, params: any[] = []): Promise<void> {
    this.db.prepare(sql).run(...params);
  }
}
```

---

## 3. Struktur Tabel (Skema V2)

### 3.1 Konvensi Tipe Data

| Konsep | Tipe di D1 | Contoh |
|--------|-----------|--------|
| Primary Key / ID | TEXT (UUID v4) | `9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d` |
| Timestamp | TEXT ISO 8601 | `2026-09-01T10:00:00.000Z` |
| Boolean | INTEGER 0/1 | `is_preview = 1` |
| Uang (Rupiah) | INTEGER | `price = 150000` |
| Enum / Status | TEXT + CHECK | `role IN ('user','admin')` |
| JSON | TEXT | `skills = ["Next.js", "AI"]` |
| Foreign Key | TEXT REFERENCES | `user_id REFERENCES users(id)` |

### 3.2 Tabel dan Domain

| Domain | Tabel | Fungsi |
|--------|-------|--------|
| User and Auth | `users`, `sessions` | Akun, role, sesi login |
| Course | `courses`, `lessons`, `course_resources`, `course_tags` | Master course, materi, resource |
| Transaksi | `orders`, `order_items`, `payment_proofs` | Pembayaran manual, bukti transfer |
| Hak Akses | `enrollments` | Kontrol akses premium (paling kritis) |
| Learning | `progress` | Progress belajar user |
| Portfolio | `projects`, `project_media`, `project_tags` | Data project dan media |
| Collective | `collective_members`, `project_members` | Data member dan relasi project |
| Marketplace | `marketplace_items`, `marketplace_media` | Katalog SaaS |
| Keamanan | `admin_audit_logs` | Jejak aktivitas admin |

### 3.2.1 Catatan Kolom Tambahan (Penting untuk Migrasi)

Beberapa kolom berikut belum tercantum eksplisit pada tabel di atas, tetapi wajib ada karena sudah dipakai pada kode dan query di dokumen ini.

| Tabel | Kolom | Keterangan |
|-------|-------|------------|
| `sessions` | `refresh_token` | Dipakai saat membuat session baru pada proses login. Tipe TEXT. |
| `sessions` | `expires_at` | Dipakai untuk mengecek masa berlaku session pada `getSession()`. Tipe TEXT ISO 8601. |
| `collective_members` | `display_order` | Dipakai untuk mengurutkan tampilan member pada query halaman home. Tipe INTEGER. |

### 3.3 Relasi Paling Kritis

- **`enrollments`** (`user_id` + `course_id`): UNIQUE, untuk mencegah double enrollment.
- **`orders`** (`user_id` + `status`): digunakan untuk flow payment manual.
- **`project_members`** (`project_id` + `member_id`): relasi many-to-many antara Portfolio dan Collective.
- **`payment_proofs`** (`order_id`): menyimpan bukti transfer pembayaran.

### 3.4 Status Orders (Final)

| Status | Makna |
|--------|-------|
| `pending` | User sudah order, tapi belum bayar |
| `paid` | Admin sudah verifikasi pembayaran |
| `cancelled` | Order dibatalkan |

> **Catatan:** tidak ada status `"awaiting_verification"`. Status tersebut sudah digabungkan ke dalam status `pending`.

---

## 4. Panduan Query dan Best Practices

### 4.1 Prepared Statements (Wajib)

Seluruh query yang mengandung input dari user wajib menggunakan binding parameter.

**Benar** (menggunakan parameter binding):
```typescript
const user = await this.db.queryOne(
  "SELECT * FROM users WHERE email = ?",
  [email]
);
```

**Salah** (rentan terhadap SQL Injection):
```typescript
const user = await this.db.queryOne(
  `SELECT * FROM users WHERE email = '${email}'`
);
```

### 4.2 Index dan Optimasi

- Tambahkan index pada kolom yang sering difilter: `status`, `slug`, `user_id`, `course_id`.
- Hindari penggunaan `LIKE '%term%'` pada skala besar. Gunakan FTS5 (`course_fts`, `project_fts`, `marketplace_fts`).

### 4.3 Data Integrity

- Gunakan `CHECK` constraint untuk mencegah data yang tidak valid.
- Gunakan `UNIQUE` constraint untuk mencegah data ganda.
- Gunakan Foreign Key dengan `ON DELETE CASCADE` untuk menjaga relasi antar tabel.

---

## 5. Modul Backend (Flow Logika)

### 5.1 Modul Auth (Login dan Register)

**Flow Login:**
1. User mengisi email dan password.
2. Server melakukan query ke tabel `users`.
3. Server memverifikasi `password_hash`.
4. Server membuat session baru di tabel `sessions`.
5. Redirect ke dashboard.

```typescript
@Post('login')
async login(@Body() body: { email: string; password: string }) {
  const user = await this.db.queryOne(
    "SELECT id, name, email, phone, role, status, password_hash FROM users WHERE email = ?",
    [body.email]
  );

  if (!user) {
    throw new UnauthorizedException('Email tidak ditemukan');
  }

  const isValid = await this.authService.verifyPassword(body.password, user.password_hash);
  if (!isValid) {
    throw new UnauthorizedException('Password salah');
  }

  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await this.db.execute(
    `INSERT INTO sessions (id, user_id, refresh_token, expires_at)
     VALUES (?, ?, ?, ?)`,
    [sessionId, user.id, crypto.randomUUID(), expiresAt]
  );

  return {
    success: true,
    data: {
      id: user.id,
      role: user.role,
      sessionToken: sessionId,
    },
  };
}
```

**Flow Register:**
1. User mengisi email, phone, dan password.
2. Server melakukan pengecekan duplikasi email/phone menggunakan try-catch.
3. Server melakukan INSERT ke tabel users dengan role = `'user'`.
4. Redirect ke halaman login.

```typescript
@Post('register')
async register(@Body() body: { name: string; email: string; phone: string; password: string }) {
  try {
    const id = crypto.randomUUID();
    const hashedPassword = await this.authService.hashPassword(body.password);

    await this.db.execute(
      `INSERT INTO users (id, name, email, phone, password_hash, role)
       VALUES (?, ?, ?, ?, ?, 'user')`,
      [id, body.name, body.email, body.phone, hashedPassword]
    );

    return { success: true, data: { id } };
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new ConflictException('Email atau phone sudah digunakan');
    }
    throw error;
  }
}
```

### 5.2 Modul Orders (Pembayaran Manual)

**Flow:**
1. User menekan tombol "Beli Course".
2. Server memeriksa session user.
3. Server melakukan INSERT ke tabel orders dengan status = `'pending'`.
4. Server melakukan INSERT ke tabel order_items.
5. Menampilkan halaman checkout (QR atau instruksi pembayaran).
6. User melakukan transfer, lalu menghubungi admin melalui WhatsApp.
7. Admin melihat order pada dashboard.
8. Admin memverifikasi transfer.
9. Server melakukan UPDATE pada tabel orders (status = `'paid'`, `verified_by`, `verified_at`).
10. Server melakukan INSERT ke tabel enrollments dengan status = `'active'`.
11. Server melakukan INSERT ke tabel admin_audit_logs.

**Create Order:**
```typescript
async createOrder(userId: string, courseId: string, price: number) {
  const orderId = crypto.randomUUID();
  await this.db.execute(
    `INSERT INTO orders (id, user_id, status, amount)
     VALUES (?, ?, 'pending', ?)`,
    [orderId, userId, price]
  );

  await this.db.execute(
    `INSERT INTO order_items (id, order_id, course_id, price)
     VALUES (?, ?, ?, ?)`,
    [crypto.randomUUID(), orderId, courseId, price]
  );

  return orderId;
}
```

**Verify Order (Admin):**
```typescript
async verifyOrder(orderId: string, adminId: string) {
  await this.db.execute(
    `UPDATE orders SET status = 'paid', verified_by = ?, verified_at = ?
     WHERE id = ?`,
    [adminId, new Date().toISOString(), orderId]
  );

  await this.db.execute(
    `INSERT INTO admin_audit_logs (id, actor_user_id, action, entity_type, entity_id)
     VALUES (?, ?, 'verify', 'order', ?)`,
    [crypto.randomUUID(), adminId, orderId]
  );
}
```

### 5.3 Modul Enrollments (Hak Akses Premium)

**Flow:**
1. User membuka lesson.
2. Server memeriksa session user.
3. Server melakukan query ke tabel enrollments dengan status = `'active'`.
4. Jika tidak ditemukan, tampilkan pesan "Anda belum memiliki akses".
5. Jika ditemukan, server membuat Signed URL pada R2.
6. Browser memutar video.

**Cek Akses:**
```typescript
async isUserEntitled(userId: string, courseId: string) {
  const result = await this.db.queryOne(
    "SELECT * FROM enrollments WHERE user_id = ? AND course_id = ? AND status = 'active'",
    [userId, courseId]
  );
  return !!result;
}
```

**Activate Enrollment (Admin — idempotent):**
```typescript
async activateEnrollment(userId: string, courseId: string, orderId: string, adminId: string) {
  const existing = await this.db.queryOne(
    "SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?",
    [userId, courseId]
  );

  if (existing) {
    await this.db.execute(
      `UPDATE enrollments SET status = 'active', granted_by = ?
       WHERE id = ?`,
      [adminId, existing.id]
    );
  } else {
    const id = crypto.randomUUID();
    await this.db.execute(
      `INSERT INTO enrollments (id, user_id, course_id, order_id, status, granted_by)
       VALUES (?, ?, ?, ?, 'active', ?)`,
      [id, userId, courseId, orderId, adminId]
    );
  }
}
```

### 5.4 Modul Admin (Overview dan Audit)

```typescript
async getOverview() {
  const userCount = await this.db.queryOne(
    "SELECT COUNT(*) AS count FROM users WHERE role = 'user'"
  );

  const pendingOrders = await this.db.queryOne(
    "SELECT COUNT(*) AS count FROM orders WHERE status = 'pending'"
  );

  const activeEnrollments = await this.db.queryOne(
    "SELECT COUNT(*) AS count FROM enrollments WHERE status = 'active'"
  );

  return {
    success: true,
    data: {
      userCount: userCount?.count ?? 0,
      pendingOrders: pendingOrders?.count ?? 0,
      activeEnrollments: activeEnrollments?.count ?? 0,
    },
  };
}
```

### 5.5 Guard Role Admin (Wajib)

```typescript
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['authorization']?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedException('Session token tidak ditemukan');
    }

    const session = await this.authService.getSession(token);
    if (!session || session.role !== 'admin') {
      throw new UnauthorizedException('Anda bukan admin');
    }

    request.user = session;
    return true;
  }
}
```

---

## 6. Storage (R2): Upload dan Akses Premium

### 6.1 Upload (Admin) — StorageService
```typescript
async createUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: 'xolvon-storage',
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(this.r2Client, command, { expiresIn: 3600 });
}
```

### 6.2 Akses Premium (User) — StorageService
```typescript
async createPrivateReadUrl(key: string, expiresIn = 300): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: 'xolvon-storage',
    Key: key,
  });
  return getSignedUrl(this.r2Client, command, { expiresIn });
}
```

---

## 7. Catatan Penting (Jangan Dilanggar)

### Larangan
- ❌ Jangan mengekspos `password_hash` ke client.
- ❌ Jangan menerima `role` dari input user. Hanya server yang menentukan role.

### Kewajiban
- ✅ Wajib menggunakan prepared statements (`bind`) pada semua query.
- ✅ Wajib mencatat setiap aksi admin ke tabel `admin_audit_logs`.
- ✅ Wajib memeriksa enrollment aktif sebelum memberikan akses video premium.
- ✅ Wajib menggunakan format ISO 8601 untuk timestamp, yaitu `new Date().toISOString()`.
- ✅ Wajib menggunakan guard role admin pada seluruh route `/admin/*`.
- ✅ Wajib memeriksa `expires_at` lebih besar dari waktu saat ini pada `getSession()` sebelum mengizinkan akses.

---

## 8. Prosedur Migrasi ke Cloudflare (Setelah Email Aktif)

### 8.1 Kapan Migrasi Dilakukan
- Ketika email sudah dapat digunakan untuk login.
- Ketika tim sudah siap untuk deploy ke production.

### 8.2 Langkah-Langkah

**Langkah 1:** Login ke Cloudflare
```bash
npx wrangler login
```

**Langkah 2:** Buat Database D1 Production
```bash
npx wrangler d1 create xolvon-db
```
Hasil: akan diperoleh `database_id` baru. Salin ID tersebut.

**Langkah 3:** Buat Bucket R2 Production
```bash
npx wrangler r2 bucket create xolvon-storage
```

**Langkah 4:** Update `wrangler.jsonc`
```json
{
  "name": "xolvon",
  "compatibility_date": "2026-08-27",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "xolvon-db",
      "database_id": "YOUR_NEW_DATABASE_ID"
    }
  ],
  "r2_buckets": [
    {
      "binding": "BUCKET",
      "bucket_name": "xolvon-storage"
    }
  ]
}
```

**Langkah 5:** Jalankan Migrasi ke Production
```bash
npx wrangler d1 migrations apply xolvon-db --remote
```

**Langkah 6:** Ganti DatabaseService ke D1Database
```typescript
// src/database/database.service.ts (versi Cloudflare)
import { Injectable } from '@nestjs/common';
import { D1Database } from '@cloudflare/workers-types';

@Injectable()
export class DatabaseService {
  private db: D1Database;

  constructor() {
    this.db = (globalThis as any).env.DB;
  }

  async queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    const result = params.length > 0 ? stmt.bind(...params) : stmt;
    return (await result.all()).results as T[];
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const stmt = this.db.prepare(sql);
    const result = params.length > 0 ? stmt.bind(...params) : stmt;
    return await result.first() as T | undefined;
  }

  async execute(sql: string, params: any[] = []): Promise<void> {
    const stmt = this.db.prepare(sql);
    if (params.length > 0) {
      await stmt.bind(...params).run();
    } else {
      await stmt.run();
    }
  }
}
```

**Langkah 7:** Ganti StorageService ke Versi Cloudflare
```typescript
// src/storage/storage.service.ts (versi Cloudflare)
import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private r2Client: S3Client;

  constructor() {
    this.r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }

  async createUploadUrl(key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: 'xolvon-storage',
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.r2Client, command, { expiresIn: 3600 });
  }

  async createPrivateReadUrl(key: string, expiresIn = 300): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: 'xolvon-storage',
      Key: key,
    });
    return getSignedUrl(this.r2Client, command, { expiresIn });
  }
}
```

**Langkah 8:** Deploy ke Cloudflare
```bash
npx vinext build
npx @vinext/cloudflare deploy
```

---

## 9. Kriteria Keberhasilan (Definition of Done)

| Kriteria | Status |
|----------|--------|
| Auth dual-role berjalan | Selesai |
| Modul Orders berjalan (checkout, verify, activate) | Selesai |
| Modul Enrollments berjalan (cek akses, revoke) | Selesai |
| Seluruh query menggunakan prepared statements | Selesai |
| R2 credentials tidak diekspos ke browser | Selesai |
| Video premium hanya dapat diakses melalui Signed URL | Selesai |
| Audit log wajib dicatat untuk aksi admin | Selesai |
| Guard role admin di semua route `/admin/*` | Selesai |
| Format timestamp ISO 8601 (`new Date().toISOString()`) | Selesai |
| Session expired diperiksa pada `getSession()` | Selesai |

---

> **Kesimpulan:** Seluruh struktur database dan storage telah siap. Tim BE dapat langsung mengimplementasikan API menggunakan panduan ini, baik pada Local Mode maupun Cloudflare Mode.