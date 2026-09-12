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

### Courses (`src/courses/courses.controller.ts`)

| Method | Path | Auth | Role | Status | Deskripsi | Request | Response |
|---|---|---|---|---|---|---|---|
| GET | `/api/courses` | Public | - | aktif | Katalog published-only, `?q=` contains pada title (LIKE, wildcard di-escape), `?sort=latest\|oldest` (default latest), pagination DL-011 | - | `{items: CourseCardDto[], page, limit, total, query}` (200) |
| GET | `/api/courses/:slug` | Public | - | aktif | Detail published-only (draft → 404) + `lessons` terurut `order_index` ASC — ringkasan aman tanpa `content`/`video_object_key`/signed URL (SCHEMA.md §17) | - | `CourseDetailDto` (200) / 404 |
| POST | `/api/courses` | Bearer JWT | admin | aktif | Buat course (status awal `draft`, UUID server-generated) + audit `create`; slug unik | `CreateCourseDto` | `CourseCardDto` (201) |
| PATCH | `/api/courses/:id` | Bearer JWT | admin | aktif | Update parsial + audit `update`; slug baru dicek unik | `UpdateCourseDto` | `CourseCardDto` (200) |
| POST | `/api/courses/:id/publish` | Bearer JWT | admin | aktif | Transisi ketat draft → published, gate field wajib (description, price) + audit `publish` | - | `CourseCardDto` (200) |
| POST | `/api/courses/:id/unpublish` | Bearer JWT | admin | aktif | Transisi ketat published → draft + audit `unpublish` | - | `CourseCardDto` (200) |

`CourseCardDto` (SCHEMA.md §16): `{id, title, slug, description, price,
thumbnailUrl, status}`. `CourseDetailDto` menambahkan `lessons:
LessonSummaryDto[]` dengan `LessonSummaryDto = {id, title, orderIndex,
status}`.

### Collective (`src/collective/collective.controller.ts`)

| Method | Path | Auth | Role | Status | Deskripsi | Request | Response |
|---|---|---|---|---|---|---|---|
| GET | `/api/collective` | Public | - | aktif | Member published-only, `?q=` (LIKE name/role/skills), pagination DL-011, urut `display_order` ASC lalu `created_at` DESC | - | `PaginatedCollectiveResponseDto {items, page, limit, total}` (200) |
| GET | `/api/collective/:slug` | Public | - | aktif | Detail member + `relatedProjects` via `project_members` (published); TIDAK pernah memuat email/telepon (SCHEMA.md §57) | - | `CollectiveMemberDetailDto` (200) / 404 |
| POST | `/api/collective` | Bearer JWT | admin | aktif | Buat member (status awal `draft`) + audit `create` | `CreateCollectiveMemberDto` | `CollectiveMemberResponseDto` (201) |
| PATCH | `/api/collective/:id` | Bearer JWT | admin | aktif | Ubah member + audit `update` | `UpdateCollectiveMemberDto` | `CollectiveMemberResponseDto` (200) |
| POST | `/api/collective/:id/publish` | Bearer JWT | admin | aktif | Set status `published` + audit `publish` | - | `CollectiveMemberResponseDto` (200) |
| POST | `/api/collective/:id/unpublish` | Bearer JWT | admin | aktif | Set status `draft` + audit `unpublish` | - | `CollectiveMemberResponseDto` (200) |

### Projects (`src/projects/projects.controller.ts`, `src/project-media/`, `src/project-members/`)

| Method | Path | Auth | Role | Status | Deskripsi | Request | Response |
|---|---|---|---|---|---|---|---|
| GET | `/api/projects` | Public | - | aktif | Portfolio published-only, `?q=` contains pada title/summary, `?sort=latest\|oldest` (default latest), pagination DL-011 | - | `{items: ProjectCardDto[], page, limit, total}` (200) |
| GET | `/api/projects/:slug` | Public | - | aktif | Detail published-only (draft → 404, sama seperti slug tak dikenal); urutan cerita Problem→Solution→Tech Stack→Result→Media (`sort_order` ASC, video dan object key dieksklusi) → `members[].role` dari JOIN `collective_members` (SCHEMA.md §47-48) | - | `ProjectDetailDto` (200) / 404 |
| POST | `/api/projects` | Bearer JWT | admin | aktif | Buat project (status awal `draft`) + audit `create`; slug unik; `type` string terkontrol (bukan enum final) | `CreateProjectDto` | `ProjectResponseDto` (201) |
| PATCH | `/api/projects/:id` | Bearer JWT | admin | aktif | Update parsial + audit `update`; slug baru dicek unik | `UpdateProjectDto` | `ProjectResponseDto` (200) |
| POST | `/api/projects/:id/publish` | Bearer JWT | admin | aktif | Transisi ketat draft → published, gate field wajib (title, slug, type, summary, problem, solution) + audit `publish` | - | `ProjectResponseDto` (200) |
| POST | `/api/projects/:id/unpublish` | Bearer JWT | admin | aktif | Transisi ketat published → draft + audit `unpublish` | - | `ProjectResponseDto` (200) |
| POST | `/api/projects/:id/media` | Bearer JWT | admin | aktif | Attach media (objectKey, `mediaType` string terkontrol — enum final open decision DL-014, `sortOrder`) + audit `create` | `AttachProjectMediaDto` | `ProjectMediaResponseDto` (201) |
| DELETE | `/api/projects/:id/media/:mediaId` | Bearer JWT | admin | aktif | Detach media ter-scope ke project (lintas project → 404) + audit `delete` | - | `{message}` (200) |
| POST | `/api/projects/:id/members` | Bearer JWT | admin | aktif | Assign collective member dengan role eksplisit (upsert `ON CONFLICT(project_id, member_id)`); `role` string terkontrol (bukan enum final) + audit `create` | `AssignProjectMemberDto` | `{projectId, memberId, role}` (201) |
| DELETE | `/api/projects/:id/members/:memberId` | Bearer JWT | admin | aktif | Remove assignment member ter-scope ke project + audit `delete` | - | `{message}` (200) |

`ProjectCardDto` (SCHEMA.md §46): `{id, title, slug, type, summary, status}`.
`ProjectDetailDto` (§47, urutan cerita §48): `{id, title, slug, type, summary,
problem, solution, techStack: string[], result, media: {id, mediaType,
sortOrder}[], members: {memberId, name, role}[], status}` — media publik
tanpa `objectKey`, video dieksklusi (butuh signed private access, T13/T14).

### Admin — belum ada

`AdminModule` berupa stub tanpa endpoint. Endpoint admin (`GET /admin/users`,
`GET /admin/orders`, `GET /admin/overview`) direncanakan di T12 dan akan
ditambahkan ke dokumen ini saat aktif. Semua route `/admin/*` menolak
non-admin dengan 403 server-side.

---

## Endpoint planned (didefinisikan plan, belum ada)

Bagian kosong per modul baru. Path di bawah diambil dari plan; status tetap
`planned` sampai modul terkait selesai dan barisnya pindah ke tabel aktif.

### Courses — aktif (T5)

Endpoint sudah pindah ke tabel aktif di atas. `status` tidak pernah diterima
dari input (DTO tidak memilikinya; global `ValidationPipe`
`forbidNonWhitelisted` menolak field di luar DTO) — transisi status hanya via
endpoint publish/unpublish.

### Lessons & Course Resources — planned (T6)

Belum ada endpoint. CRUD admin untuk lesson (`order_index`, draft/published)
dan resource `pdf|resource|assignment`; summary publik tanpa field privat.

### Projects / Project Media / Project Members — aktif (T7)

Endpoint sudah pindah ke tabel aktif di atas. `type` (project), `mediaType`
(media), dan `role` (member) divalidasi sebagai string terkontrol dengan
batas panjang — BUKAN enum final (SCHEMA.md §45/§50/§52; open decision
DL-014). Object key media privat tidak pernah muncul di respons publik.

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
