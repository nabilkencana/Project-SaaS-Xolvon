# API Contract — Backend xolvon.com

Daftar endpoint + kebutuhan auth. Dokumen ini bertambah setiap modul baru dan
disempurnakan penuh di T16 (`.omo/plans/xolvon-backend-build.md`).

- **Status dokumen**: skeleton per T4. Kolom status menandai `aktif` (sudah ada di repo) atau `planned` (didefinisikan plan, belum diimplementasikan).
- **Global prefix**: semua route dilayani di bawah `/api/*` (`src/main.ts`).
- **Auth**: `Authorization: Bearer <accessToken>` (JWT). Role: `user` (default) dan `admin` (`RolesGuard`).
- **Validasi**: global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) — field di luar DTO ditolak.
- **Error**: global `AllExceptionsFilter` — respons aman, tanpa stack trace/internal.
- **Pagination**: kontrak terkunci di decision log DL-011 — `?page=` 1-based, `?limit=` default 20 maks 100, respons `{items, page, limit, total}`.
- **Rate limit**: `/auth/login` + `/auth/register` 5/menit/IP (DL-012, diimplementasikan T17).
- **Audit**: mutation sensitif (verify/activate/revoke/publish/cancel) menulis `admin_audit_logs` (plan T11/T15).

---

## Endpoint aktif (sudah ada di repo)

### Auth (`src/auth/auth.controller.ts`)

| Method | Path | Auth | Role | Status | Deskripsi | Request | Response |
|---|---|---|---|---|---|---|---|
| POST | `/api/auth/register` | Public | - | aktif | Registrasi user baru; `role` tidak pernah diterima dari input (DL-005) | `RegisterDto` | `SafeUserDto` (201) |
| POST | `/api/auth/login` | Public | - | aktif | Login; mencatat IP + user agent ke sesi; rate limit menyusul (DL-012) | `LoginDto` | `AuthResponseDto` `{accessToken, refreshToken, user: SafeUserDto}` (200) |
| POST | `/api/auth/refresh` | Public | - | aktif | Terbit access token baru via refresh token | `RefreshTokenDto` | `{accessToken}` (200) |
| POST | `/api/auth/logout` | Public | - | aktif | Revoke sesi refresh token | `LogoutDto` | `{message}` (200) |
| GET | `/api/auth/me` | Bearer JWT | user | aktif | Profil user dari payload JWT sesi | - | `JwtPayload` (200) |
| GET | `/api/auth/admin` | Bearer JWT | admin | aktif | Cek akses admin | - | `{message, user}` (200) |

### Orders (`src/orders/orders.controller.ts`)

| Method | Path | Auth | Role | Status | Deskripsi | Request | Response |
|---|---|---|---|---|---|---|---|
| POST | `/api/orders` | Bearer JWT | user | aktif | Checkout; total dihitung server-side; status awal `pending` (DL-002) | `CreateOrderDto` | `OrderResponseDto` (201) |
| POST | `/api/orders/:id/payment-proof` | Bearer JWT | owner order | aktif | Submit object key bukti bayar; cek kepemilikan anti-IDOR | `SubmitPaymentProofDto` | `{message, proofId}` (201) |
| PATCH | `/api/orders/:id/verify` | Bearer JWT | admin | aktif | Verifikasi pembayaran → `paid`; setelah rekonsiliasi T3 hanya dari `pending` (DL-002) + audit | - | `OrderResponseDto` (200) |
| POST | `/api/orders/:id/activate` | Bearer JWT | admin | aktif | Aktivasi enrollment dari order `paid`; idempoten via upsert | - | `OrderActivationResponseDto` (200) |

### Enrollments (`src/enrollments/enrollments.controller.ts`)

| Method | Path | Auth | Role | Status | Deskripsi | Request | Response |
|---|---|---|---|---|---|---|---|
| GET | `/api/enrollments/me` | Bearer JWT | user | aktif | Daftar enrollment milik sesi (anti-IDOR, dari `user.sub`) | - | `EnrollmentResponseDto[]` (200) |
| PATCH | `/api/enrollments/:id/revoke` | Bearer JWT | admin | aktif | Revoke enrollment → `revoked` + audit (plan T15) | - | `EnrollmentResponseDto` (200) |

### App (`src/app.controller.ts`)

| Method | Path | Auth | Role | Status | Deskripsi | Request | Response |
|---|---|---|---|---|---|---|---|
| GET | `/api` | Public | - | aktif | Health check / hello | - | `string` (200) |

### Collective (`src/collective/collective.controller.ts`)

| Method | Path | Auth | Role | Status | Deskripsi | Request | Response |
|---|---|---|---|---|---|---|---|
| GET | `/api/collective` | Public | - | aktif | Member published-only, `?q=` (LIKE name/role/skills), pagination DL-011, urut `display_order` ASC lalu `created_at` DESC | - | `PaginatedCollectiveResponseDto {items, page, limit, total}` (200) |
| GET | `/api/collective/:slug` | Public | - | aktif | Detail member + `relatedProjects` via `project_members` (published); TIDAK pernah memuat email/telepon (SCHEMA.md §57) | - | `CollectiveMemberDetailDto` (200) / 404 |
| POST | `/api/collective` | Bearer JWT | admin | aktif | Buat member (status awal `draft`) + audit `create` | `CreateCollectiveMemberDto` | `CollectiveMemberResponseDto` (201) |
| PATCH | `/api/collective/:id` | Bearer JWT | admin | aktif | Ubah member + audit `update` | `UpdateCollectiveMemberDto` | `CollectiveMemberResponseDto` (200) |
| POST | `/api/collective/:id/publish` | Bearer JWT | admin | aktif | Set status `published` + audit `publish` | - | `CollectiveMemberResponseDto` (200) |
| POST | `/api/collective/:id/unpublish` | Bearer JWT | admin | aktif | Set status `draft` + audit `unpublish` | - | `CollectiveMemberResponseDto` (200) |

### Admin — belum ada

`AdminModule` berupa stub tanpa endpoint. Endpoint admin (`GET /admin/users`,
`GET /admin/orders`, `GET /admin/overview`) direncanakan di T12 dan akan
ditambahkan ke dokumen ini saat aktif. Semua route `/admin/*` menolak
non-admin dengan 403 server-side.

---

## Endpoint planned (didefinisikan plan, belum ada)

Bagian kosong per modul baru. Path di bawah diambil dari plan; status tetap
`planned` sampai modul terkait selesai dan barisnya pindah ke tabel aktif.

### Courses — planned (T5)

| Method | Path | Auth | Role | Deskripsi |
|---|---|---|---|---|
| GET | `/api/courses` | Public | - | Katalog published-only, `?q=&sort=&page=` (kontrak pagination DL-011) |
| GET | `/api/courses/:slug` | Public | - | Detail aman, tanpa object key/signed URL; draft → 404 |
| POST | `/api/courses` | Bearer JWT | admin | Buat course (draft) + audit |
| PATCH | `/api/courses/:id` | Bearer JWT | admin | Ubah course + audit |
| POST | `/api/courses/:id/publish` | Bearer JWT | admin | Publish course + audit |

### Lessons & Course Resources — planned (T6)

Belum ada endpoint. CRUD admin untuk lesson (`order_index`, draft/published)
dan resource `pdf|resource|assignment`; summary publik tanpa field privat.

### Projects / Project Media / Project Members — planned (T7)

Belum ada endpoint. Portfolio published-only + search/filter; detail
Problem→Solution→Tech Stack→Result→Screenshot + "Built by"; admin CRUD/attach/
detach/assign + audit.

### Collective — aktif (T8)

Endpoint sudah pindah ke tabel aktif di atas. `skills` disimpan comma-separated
TEXT dan `social_links` sebagai JSON array TEXT (SCHEMA.md §56); keduanya
diparse di mapper menjadi `string[]` / `SocialLink[]` yang tidak pernah null.

### Marketplace & Marketplace Media (T9, `src/marketplace/`)

Showcase murni — tidak ada logika transaksi/checkout (SCHEMA.md §60); satu-
satunya permukaan komersial adalah `externalUrl` (validasi minimal https,
DL-013; governance tetap OPEN — PRD §91.11).

| Method | Path | Auth | Role | Status | Deskripsi | Request | Response |
|---|---|---|---|---|---|---|---|
| GET | `/api/marketplace` | Public | - | aktif | Listing published-only, `?q=` (LIKE title/description, wildcard di-escape), `?sort=latest\|oldest` (default latest), pagination DL-011 | - | `{items: MarketplaceItemDto[], page, limit, total}` (200) |
| GET | `/api/marketplace/:slug` | Public | - | aktif | Detail published-only (draft → 404); media urut `sort_order` ASC; capabilities diparse dari comma-separated TEXT | - | `MarketplaceItemDetailDto` (200) / 404 |
| POST | `/api/marketplace` | Bearer JWT | admin | aktif | Buat listing (status awal `draft`) + audit `create`; `externalUrl` wajib https valid | `CreateMarketplaceItemDto` | `MarketplaceItemDto` (201) |
| PATCH | `/api/marketplace/:id` | Bearer JWT | admin | aktif | Update parsial + audit `update`; slug baru dicek unik; `externalUrl` divalidasi ulang | `UpdateMarketplaceItemDto` | `MarketplaceItemDto` (200) |
| POST | `/api/marketplace/:id/publish` | Bearer JWT | admin | aktif | Transisi ketat draft → published + audit `publish` | - | `MarketplaceItemDto` (200) |
| POST | `/api/marketplace/:id/unpublish` | Bearer JWT | admin | aktif | Transisi ketat published → draft + audit `unpublish` | - | `MarketplaceItemDto` (200) |
| POST | `/api/marketplace/:id/media` | Bearer JWT | admin | aktif | Attach media (objectKey R2, `mediaType` image\|video\|deck per SCHEMA.md §63) + audit `create` | `AttachMarketplaceMediaDto` | `MarketplaceMediaDto` (201) |
| DELETE | `/api/marketplace/:id/media/:mediaId` | Bearer JWT | admin | aktif | Detach media ter-scope ke item (lintas item → 404) + audit `delete` | - | `{message}` (200) |

`MarketplaceItemDto` (SCHEMA.md §59): `{id, title, slug, description,
capabilities: string[], externalUrl, status}`.

### Home — planned (T10)

Belum ada endpoint. Agregasi published-only (featured courses, projects,
marketplace, collective) tanpa N+1.

### Audit — planned (T11)

Belum ada endpoint — dan tidak akan punya endpoint publik. `record()` internal
untuk modul lain; `metadata` tidak pernah keluar ke API publik/user.

### Admin — planned (T12)

| Method | Path | Auth | Role | Deskripsi |
|---|---|---|---|---|
| GET | `/api/admin/users` | Bearer JWT | admin | Tabel users |
| GET | `/api/admin/orders` | Bearer JWT | admin | Tabel orders (kolom per PRD §45) |
| GET | `/api/admin/overview` | Bearer JWT | admin | userCount / pendingOrders / activeEnrollments |

### Media (R2) — planned (T13)

| Method | Path | Auth | Role | Deskripsi |
|---|---|---|---|---|
| POST | `/api/admin/media/upload-url` | Bearer JWT | admin | Presigned PUT 3600s; MIME/size/prefix divalidasi; key server-generated |
| POST | `/api/admin/media/confirm` | Bearer JWT | admin | Konfirmasi upload |

### Lessons video & Progress — planned (T14)

| Method | Path | Auth | Role | Deskripsi |
|---|---|---|---|---|
| GET | `/api/lessons/:id/video-url` | Bearer JWT | user aktif | Signed URL 300s; wajib enrollment aktif + lesson milik course (anti-IDOR) |
| POST | `/api/progress` | Bearer JWT | user aktif | Tulis progress; ownership dari sesi, bukan body |

### Orders (tambahan) — planned (T15)

| Method | Path | Auth | Role | Deskripsi |
|---|---|---|---|---|
| POST | `/api/admin/orders/:id/cancel` | Bearer JWT | admin | Cancel order, hanya dari `pending` → `cancelled` + audit |

### Search — planned (T16)

Belum ada endpoint. Pencarian lintas entitas published-only via FTS5, mengikuti
kontrak pagination DL-011.

---

## Catatan kontrak lintas-endpoint

- **Status order**: `pending | paid | cancelled` (DL-002); **status enrollment**: `active | revoked` (DL-004).
- **Tidak ada endpoint delete / role-change di V1** (DL-005, PRD §44 view-only).
- Tidak ada endpoint yang menerima `role` dari input user; tidak ada registrasi admin publik.
- Respons tidak pernah memuat `password_hash`, `refresh_token`, object key privat, kredensial R2, atau stack trace.
- Semua endpoint list (aktif maupun planned) mengikuti kontrak pagination DL-011.
