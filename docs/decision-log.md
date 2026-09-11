# Decision Log — Backend xolvon.com

Format entri mengikuti `PRD.md` §92 (Open Decision Protocol) dan aturan `RULES.md` §84: setiap keputusan memiliki **Owner, Options, Decision, Date, Impact** — tidak ada keputusan yang diselesaikan diam-diam.

- Tanggal dokumen dibuat: 2026-09-12 (plan T4, `.omo/plans/xolvon-backend-build.md`).
- Entri `DL-001`–`DL-010` adalah keputusan owner yang terkunci (draft `.omo/drafts/xolvon-backend-build.md` bagian "Keputusan owner (LOCKED oleh user)").
- Entri `DL-011`–`DL-012` adalah default yang diadopsi backend dan menunggu tanda tangan owner.
- Konflik antar-dokumen dicatat di bagian [Konflik dokumen](#konflik-dokumen--tercatat--resolusinya).
- Item yang masih terbuka diindeks di bagian [Keputusan masih terbuka](#keputusan-masih-terbuka) tanpa entri final.

---

## Keputusan terkunci owner (LOCKED)

### DL-001 — Lapisan database

```text
Problem:
Repo memakai D1Service.query() langsung (D1 REST) sehingga pengembangan lokal
butuh kredensial Cloudflare; handbook menetapkan DatabaseService + better-sqlite3
untuk lokal dan jalur migrasi ke D1 untuk production.

Existing Requirement:
HANDBOOK_BACKEND.md §2:27-63 dan §8:484-518; draft keputusan owner #1.

Options:
- Tetap memakai D1Service langsung di semua environment.
- DatabaseService better-sqlite3 (local.db) untuk lokal + adapter D1 di balik kontrak yang sama.

Owner:
Founder/BE Lead

Decision:
Ikuti handbook — DatabaseService berbasis better-sqlite3 (local.db) untuk
development lokal; D1 REST dipertahankan hanya sebagai adapter di balik token
DatabaseService saat DB_DRIVER=d1. Diimplementasikan di T1/T3.

Date:
2026-09-12

Impact:
Semua modul meng-inject token DatabaseService (bukan D1Service langsung);
bootstrap lokal sukses tanpa kredensial Cloudflare; src/database/d1.service.ts
tidak diubah sehingga invarian hardening (commit 0c83956) tetap terjaga.
```

### DL-002 — Status order final

```text
Problem:
Repo memiliki status keempat awaiting_verification, sementara handbook §3.4
FINAL dan SCHEMA.md §33 menetapkan hanya tiga status.

Existing Requirement:
HANDBOOK_BACKEND.md §3.4:112-120; SCHEMA.md §33; draft keputusan owner #2.

Options:
- Pertahankan awaiting_verification sebagai status terpisah.
- Collapse ke 3 status handbook (pending | paid | cancelled).

Owner:
Founder/BE Lead

Decision:
Status order FINAL: pending | paid | cancelled. awaiting_verification dihapus;
submit payment proof tetap diizinkan dan mempertahankan status pending.
Rekonsiliasi service, interface, migrasi, tes, dan tabel admin dikerjakan di T3.

Date:
2026-09-12

Impact:
verifyOrder hanya menerima order pending lalu menyetel paid; tes lama yang
memakai awaiting_verification diperbarui eksplisit; SCHEMA.md §33 tidak berubah
karena sudah final.
```

### DL-003 — Model sesi

```text
Problem:
Handbook §5.1/§5.5 memakai model session-token getSession(); repo memakai JWT
access + refresh token berbasis tabel sessions. Perlu satu model yang dikunci.

Existing Requirement:
HANDBOOK_BACKEND.md §5.1:160-233, §5.5; draft keputusan owner #3.

Options:
- Session-token model handbook (getSession()).
- Cookie httpOnly.
- Pertahankan JWT + refresh token milik repo.

Owner:
Founder/BE Lead

Decision:
Pertahankan model JWT + refresh token milik repo. Deviasi dari handbook
getSession() didokumentasikan lewat entri ini.

Date:
2026-09-12

Impact:
AuthGuard tetap membaca Authorization: Bearer; kolom sessions.refresh_token dan
sessions.expires_at wajib ada di skema (DL-004); hardening expiry/refresh
eksplisit dan pesan generik dikerjakan di T17.
```

### DL-004 — Adopsi Schema V2

```text
Problem:
Kode repo meng-query kolom yang tidak ada di SCHEMA.md maupun migrasi repo
(users.status/email_verified/phone_verified, sessions.refresh_token/expires_at,
courses.price); handbook §3 menambah tabel dan kolom V2 yang belum diadopsi.

Existing Requirement:
HANDBOOK_BACKEND.md §3:67-154; SCHEMA.md §28, §125-128; draft keputusan owner #4.

Options:
- Kembalikan kode ke skema lama.
- Adopsi Schema V2 penuh + sinkronisasi SCHEMA.md.

Owner:
Founder/BE Lead

Decision:
Adopsi Schema V2: tabel course_tags, project_tags, dan FTS5 (course_fts,
project_fts, marketplace_fts); kolom sessions.refresh_token/expires_at/
ip_address/user_agent, users.status/email_verified/phone_verified, courses.price,
collective_members.display_order. Status enrollment FINAL active|revoked —
expired dihapus, kolom expires_at dipertahankan dan ditegakkan di query.
SCHEMA.md disinkronkan melalui proses perubahan skema eksplisit (T2).

Date:
2026-09-12

Impact:
Migrasi V2 19 tabel + index + FTS5 idempoten; SCHEMA.md menjadi sumber
kebenaran tunggal; entity/field/enum baru di luar kontrak wajib memperbarui
SCHEMA.md + entri decision log sebelum implementasi.
```

### DL-005 — Admin bootstrap

```text
Problem:
PRD §91.8 — mekanisme membuat admin pertama belum final; route registrasi
admin publik dilarang.

Existing Requirement:
PRD §91.8, §44; HANDBOOK_BACKEND.md §7; ARCHITECTURE.md §165; draft keputusan owner #5.

Options:
- Route registrasi admin publik.
- Seed script server-side terkontrol.

Owner:
Founder/BE Lead

Decision:
Bootstrap admin via seed script server-side (dijalankan terkontrol di T19).
Tidak ada route publik yang membuat admin; role tidak pernah diterima dari
input user.

Date:
2026-09-12

Impact:
Delete dan role-change tidak memiliki endpoint di V1 (PRD §44 view-only);
keadaan ini dicatat resmi di sini, bukan diselesaikan diam-diam. Endpoint
admin (T12) murni read + aksi transisi status.
```

### DL-006 — Ratifikasi payment_proofs

```text
Problem:
PRD §91.6 menyatakan penyimpanan payment proof belum diputuskan, tetapi repo
sudah mengimplementasikan tabel payment_proofs + alur submit proof. Konflik
implementasi vs dokumen.

Existing Requirement:
PRD §91.6; SCHEMA.md §1023-1033 (open decision); draft keputusan owner #6.

Options:
- Hapus tabel dan alur proof.
- Ratifikasi implementasi sebagai keputusan resmi.

Owner:
Founder/BE Lead

Decision:
Tabel payment_proofs dan alur POST /orders/:id/payment-proof diratifikasi
sebagai bagian kontrak V1.

Date:
2026-09-12

Impact:
PRD §91.6 terjawab; yang disimpan adalah object key (bukan berkas); antrean
verifikasi admin memakai status order pending (DL-002).
```

### DL-007 — R2 StorageService interface-first

```text
Problem:
Modul media/R2 belum ada dan kredensial R2 production belum tentu tersedia
saat pembangunan; implementasi tidak boleh menunggu atau menebak.

Existing Requirement:
HANDBOOK_BACKEND.md §6:393-414, §8:521-559; ARCHITECTURE.md §45-48;
draft keputusan owner #7.

Options:
- Tunggu kredensial sebelum menulis kode media.
- Bangun StorageService ke interface, verifikasi menyusul.

Owner:
Founder/BE Lead

Decision:
Bangun StorageService interface-first sebagai provider yang dapat ditukar:
presigned PUT 3600s, private read URL 300s, object key digenerate server,
prefix sesuai ARCHITECTURE.md §48. Verifikasi terhadap R2 nyata menyusul saat
kredensial tersedia (T13/T19).

Date:
2026-09-12

Impact:
Konsumen (media, lesson video, proof) tidak berubah saat provider ditukar;
kredensial tidak pernah masuk kode, tes, atau respons client.
```

### DL-008 — Test runner

```text
Problem:
NestJS 12 memakai modul ESM murni sehingga runner test default tidak aktif
tanpa konfigurasi khusus; perlu keputusan runner yang stabil untuk semua todo.

Existing Requirement:
README bagian Run tests; draft keputusan owner #8.

Options:
- Migrasi ke runner/framework test lain.
- Pertahankan test:esm dan test:e2e.

Owner:
Founder/BE Lead

Decision:
Pertahankan npm run test:esm (unit/behavior) dan npm run test:e2e (harness
deterministik yang meng-override provider DatabaseService + PasswordService).

Date:
2026-09-12

Impact:
Seluruh todo plan memakai kedua runner tersebut; tidak menambah framework
test baru.
```

### DL-009 — Scope build

```text
Problem:
Cakupan build perlu dikunci agar tidak terjadi scope creep fitur V2.

Existing Requirement:
Draft keputusan owner #9; PRD §89-90; SCHEMA.md §169.

Options:
- Partial scope (modul inti saja).
- Scope penuh sampai production terverifikasi.

Owner:
Founder/BE Lead

Decision:
Scope penuh sampai deployment production terverifikasi (setara Hari 1-14
tracker BE), termasuk env/secrets/monitoring/rollback.

Date:
2026-09-12

Impact:
Fitur V2 (payment gateway otomatis, community/chat real-time, sertifikat,
review/rating, wishlist, kupon/diskon, affiliate) tetap out of scope.
```

### DL-010 — Deliverable docs

```text
Problem:
Keputusan teknis tersebar di plan/chat; RULES.md §84 mewajibkan decision log;
SCHEMA.md §95 mewajibkan kontrak pagination dikunci sebelum implementasi.

Existing Requirement:
RULES.md §84:2340-2366; SCHEMA.md §95; draft keputusan owner #10.

Options:
- Catat keputusan hanya di plan/chat.
- Deliverable docs resmi di dalam repo.

Owner:
Founder/BE Lead

Decision:
Wajib ada docs/decision-log.md (berkas ini) dan docs/api-contract.md;
api-contract.md diperbarui setiap modul baru dan disempurnakan penuh di T16.

Date:
2026-09-12

Impact:
Tidak ada keputusan yang diselesaikan diam-diam; setiap [OPEN DECISION]
memiliki entri Owner/Options/Decision/Date/Impact di berkas ini.
```

---

## Default yang diadopsi backend

Entri berikut adalah default teknis yang diadopsi backend agar implementasi
tidak terblokir. Keduanya menunggu tanda tangan owner; perubahan nilai setelah
implementasi wajib lewat entri decision log baru dengan owner manusia.

### DL-011 — Kontrak pagination

```text
Problem:
SCHEMA.md §95 — pagination behavior belum ditentukan sumber dokumen dan
DO NOT ASSUME berlaku; volume data mengharuskan pagination sehingga contract
wajib dikunci sebelum implementasi.

Existing Requirement:
SCHEMA.md §95:2287-2298; plan T4 (memblokir T5/T7/T9/T16).

Options:
- Offset-based: ?offset= & ?count=.
- Page-based: ?page= & ?limit=.

Owner:
Backend (default adopted, track owner sign-off)

Decision:
Kontrak pagination: ?page= 1-based, ?limit= default 20 maksimum 100; respons
list berbentuk {items, page, limit, total}. Berlaku untuk semua endpoint list
(courses, projects, marketplace, search, admin).

Date:
2026-09-12

Impact:
T5/T7/T9/T16 mengikuti kontrak ini; owner dapat mengganti kontrak hanya
dengan entri decision log baru sebelum T5 mulai.
```

### DL-012 — Ambang rate limit auth

```text
Problem:
PRD §104 mewajibkan pembatasan percobaan login; auth.controller.ts masih
TODO; nilai ambang belum dikunci siapa pun.

Existing Requirement:
PRD §104:2718-2753; HANDBOOK_BACKEND.md §5.1; plan T17.

Options:
- 3 percobaan per menit per IP.
- 5 percobaan per menit per IP.
- 10 percobaan per menit per IP.

Owner:
Backend (default adopted, track owner sign-off)

Decision:
Rate limit /auth/login dan /auth/register: 5 percobaan per menit per IP via
@nestjs/throttler (T17). Melebihi ambang mengembalikan HTTP 429.

Date:
2026-09-12

Impact:
Implementasi T17 memakai nilai ini; owner dapat mengganti ambang dengan
entri decision log baru sebelum T17.
```

---

## Konflik dokumen (tercatat + resolusinya)

| ID | Konflik | Resolusi |
|---|---|---|
| K-01 | Order status: repo memakai `awaiting_verification` (`0001_orders_enrollments.sql:16`, `orders.service.ts`) vs HANDBOOK_BACKEND.md §3.4 FINAL dan SCHEMA.md §33 `pending\|paid\|cancelled` | DL-002 — repo direkonsiliasi ke 3 status (T3) |
| K-02 | Enrollment status: migrasi repo mengizinkan `expired` vs SCHEMA.md §28 hanya `active\|revoked` | DL-004 — `expired` dihapus; `expires_at` dipertahankan dan ditegakkan di query |
| K-03 | Kolom ekstra: kode meng-query `users.status/email_verified/phone_verified` (`auth.service.ts:58-61`) dan `sessions.refresh_token/expires_at/ip_address/user_agent` (`auth.service.ts:150-152`) tanpa migrasi maupun entri SCHEMA.md | DL-004 — diadopsi ke Schema V2, SCHEMA.md disinkronkan (T2) |
| K-04 | Model sesi: handbook `getSession()` (session-token) vs repo JWT + refresh bearer | DL-003 — repo dipertahankan; deviasi didokumentasikan |
| K-05 | `payment_proofs` sudah terimplementasi di repo padahal PRD §91.6 dan SCHEMA.md menandainya open decision | DL-006 — diratifikasi |
| K-06 | Deployment: handbook §8 Langkah 6/8 memakai jalur `vinext`/Workers binding; repo BE memakai Node/Express (`@nestjs/platform-express`) + adapter D1 REST | Akan dicatat resmi sebagai deviasi terdokumentasi saat production (T20); BE tetap Node/Express |

---

## Keputusan masih terbuka

Indeks item PRD §91 dan plan yang **belum** diputuskan — entri final dengan
Owner/Options/Decision/Date/Impact akan ditambahkan saat masing-masing
diputuskan (tidak ada entri placeholder di log ini):

- PRD §91.1 — penempatan Solve On (`/solve-on` vs Home Section/Anchor).
- PRD §91.2 — auth library final (model sesi sudah dikunci di DL-003).
- PRD §91.3 — password hashing final disesuaikan runtime (repo saat ini: argon2).
- PRD §91.4 — runtime/adapter deployment final (dikunci di T20, lihat K-06).
- PRD §91.5 — mekanisme/provider QR atau payment.
- PRD §91.7 — assignment: resource saja vs submission workflow.
- PRD §91.9 — legal copy (Terms/Privacy/Disclaimer).
- PRD §91.10 — jumlah konten awal.
- PRD §91.12 — analytics provider pihak ketiga.
- Plan T7 — enum `type` media project.
- Plan T9 — governance `external_url` marketplace.
- Plan T12 — kolom WhatsApp/proof pada tabel admin.
