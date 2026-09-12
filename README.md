# 🚀 Xolvon Backend API — AI Business Collective Engine

<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="100" alt="NestJS Logo" />
</p>

<p align="center">
  <strong>Enterprise-Grade, Zero-Trust Backend Architecture for Xolvon.com</strong><br />
  Built with <em>NestJS 12</em>, <em>TypeScript (Strict ESM)</em>, <em>Cloudflare D1 / SQLite</em>, and <em>Cloudflare R2</em>.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Framework-NestJS%2012-E0234E?logo=nestjs" alt="NestJS 12" />
  <img src="https://img.shields.io/badge/Runtime-Node.js%2022%2B%20(ESM)-339933?logo=nodedotjs" alt="Node.js 22+" />
  <img src="https://img.shields.io/badge/Language-TypeScript%20Strict-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Database-SQLite%20%7C%20Cloudflare%20D1-F38020?logo=cloudflare" alt="Cloudflare D1" />
  <img src="https://img.shields.io/badge/Storage-Cloudflare%20R2%20%7C%20Local-F38020?logo=cloudflare" alt="Cloudflare R2" />
  <img src="https://img.shields.io/badge/Security-Argon2id%20%2B%20Dual--Token-blue" alt="Argon2id Security" />
  <img src="https://img.shields.io/badge/Tests-38%20Suites%20%7C%20335%20Passing-brightgreen" alt="Tests 100% Passed" />
</p>

---

## 📑 Table of Contents

1. [Executive Overview & Philosophy](#-executive-overview--philosophy)
2. [System Architecture & Request Lifecycle](#-system-architecture--request-lifecycle)
3. [Domain Workflows & Flowcharts](#-domain-workflows--flowcharts)
   - [Authentication & Session Rotation](#1-authentication--session-rotation)
   - [E-Commerce & Entitlement Lifecycle](#2-e-commerce--entitlement-lifecycle)
   - [Secure Media & Video Streaming Flow](#3-secure-media--video-streaming-flow)
4. [Entity-Relationship Diagram (ERD)](#-entity-relationship-diagram-erd)
5. [Core Modules Breakdown](#-core-modules-breakdown)
6. [API Contract & Endpoint Matrix](#-api-contract--endpoint-matrix)
7. [Environment Variables & Security Configuration](#-environment-variables--security-configuration)
8. [Installation & Local Setup](#-installation--local-setup)
9. [Testing & Quality Assurance](#-testing--quality-assurance)
10. [Postman Collection Integration](#-postman-collection-integration)
11. [Production Operations & Deployment](#-production-operations--deployment)

---

## 🏛 Executive Overview & Philosophy

The **Xolvon Backend Engine** powers the digital ecosystem of **PT Xolvon Kehidupan Cerdas Abadi** (`xolvon.com`), facilitating online courses, student enrollment entitlements, project portfolios, collective talent networks, and SaaS marketplace discovery.

### Core Architectural Axioms

1. **"Server Owns Trust"**: Client input is untrusted by default. Entitlements, payments, pricing, role elevation, and video access control are strictly determined and signed by the server.
2. **Dual-Driver Database Architecture**:
   - **Local Development**: Ultra-fast, zero-cloud dependency via `better-sqlite3` on `local.db`.
   - **Staging / Production**: Serverless edge persistence via **Cloudflare D1 REST API** with SQL transactional integrity.
3. **Dual-Driver Storage Architecture**:
   - **Local Development**: Self-contained local disk simulation via `LocalTestStorageService`.
   - **Staging / Production**: Cloudflare R2 object storage utilizing AWS S3 SDK v3 presigned URLs (PUT upload: 3600s, GET streaming: 300s).
4. **Defense in Depth**:
   - Password hashing with memory-hard **Argon2id**.
   - Session tracking with hashed refresh tokens and IP/User-Agent fingerprinting.
   - **Request Integrity Guard** enforcing cross-origin restrictions (`Sec-Fetch-Site` & `Origin`) against CSRF on state-mutating requests.
   - Strict DTO schema validation (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`).
   - Immutable audit logging (`admin_audit_logs`) for all administrative state mutations.

---

## 📐 System Architecture & Request Lifecycle

The diagram below illustrates how an incoming client request traverses through reverse proxies, security filters, guards, domain pipes, and database/storage drivers:

```mermaid
graph TD
    Client(["🌐 Client (Next.js / Mobile / Postman)"])
    
    subgraph Edge_Security ["🛡️ Edge & Gateway Protection"]
        Helmet["Helmet (HTTP Security Headers)"]
        Cors["CORS Interceptor (FRONTEND_URL strict)"]
        Throttler["ThrottlerGuard (Rate Limiting 5 req/min on Auth)"]
        ReqIntegrity["RequestIntegrityGuard (Sec-Fetch-Site / Origin check)"]
    end

    subgraph Framework_Core ["⚙️ NestJS Application Core"]
        GlobalFilter["AllExceptionsFilter (Safe Error Response, Zero Leak)"]
        GlobalPipe["ValidationPipe (Forbid Non-Whitelisted, Auto-Transform)"]
        AuthGuard["AuthGuard (JWT Bearer Token Extraction)"]
        RolesGuard["RolesGuard (RBAC: Admin / User Gating)"]
    end

    subgraph Domain_Services ["📦 Domain Business Logic"]
        AuthService["AuthService (Argon2id + Session Management)"]
        OrderService["OrdersService (Server-side Total Calculation)"]
        EnrollmentService["EnrollmentsService (Idempotent Entitlements)"]
        CourseService["CoursesService & LessonsService"]
        MediaService["MediaService (Presigned R2 URLs)"]
        SearchService["SearchService (FTS5 Full-Text Search)"]
        AuditService["AuditService (admin_audit_logs recording)"]
    end

    subgraph Persistence_Layer ["💾 Persistence & Storage Abstraction"]
        DBRouter{{"Driver Router (DB_DRIVER)"}}
        SQLite[("Local SQLite (better-sqlite3)")]
        D1[("Cloudflare D1 Database (REST API)")]
        
        StorageRouter{{"Storage Router (STORAGE_DRIVER)"}}
        LocalStorage["Local Test Storage"]
        CloudflareR2[("Cloudflare R2 Bucket (S3 API)")]
    end

    Client --> Helmet
    Helmet --> Cors
    Cors --> Throttler
    Throttler --> ReqIntegrity
    ReqIntegrity --> GlobalPipe
    GlobalPipe --> AuthGuard
    AuthGuard --> RolesGuard
    RolesGuard --> GlobalFilter

    GlobalFilter --> Domain_Services
    
    Domain_Services --> DBRouter
    DBRouter -->|local| SQLite
    DBRouter -->|staging / production| D1
    
    Domain_Services --> StorageRouter
    StorageRouter -->|local-test| LocalStorage
    StorageRouter -->|r2| CloudflareR2
```

---

## 🔄 Domain Workflows & Flowcharts

### 1. Authentication & Session Rotation

The authentication flow utilizes short-lived JWT access tokens alongside database-backed, SHA-256 hashed refresh tokens with continuous session rotation.

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Application
    participant Auth as AuthController / Service
    participant Hash as PasswordService (Argon2id)
    participant DB as Database (users & sessions)

    Note over User, DB: User Login Flow
    User->>Auth: POST /api/auth/login (email, password)
    Auth->>DB: Query user by email
    DB-->>Auth: User Record (password_hash, role, status)
    Auth->>Hash: Verify password with Argon2id
    Hash-->>Auth: Valid
    Auth->>Auth: Generate Access Token (JWT, 15m/1h)
    Auth->>Auth: Generate Cryptographic Refresh Token
    Auth->>DB: Insert sessions record (hashed_token, ip, user_agent, expires_at)
    Auth-->>User: 200 OK { accessToken, refreshToken, user }

    Note over User, DB: Access Token Refresh Flow
    User->>Auth: POST /api/auth/refresh (refreshToken)
    Auth->>DB: Lookup session by SHA-256(refreshToken)
    alt Session Not Found or Expired
        Auth-->>User: 401 Unauthorized
    else Session Valid
        Auth->>Auth: Issue new Access Token
        Auth-->>User: 200 OK { accessToken }
    end

    Note over User, DB: User Logout Flow
    User->>Auth: POST /api/auth/logout (refreshToken)
    Auth->>DB: Delete session by SHA-256(refreshToken)
    Auth-->>User: 200 OK { message: "Logout successful" }
```

---

### 2. E-Commerce & Entitlement Lifecycle

To uphold absolute integrity in commercial transactions, pricing is computed exclusively on the server, and enrollment activation requires an explicit manual payment proof workflow with admin verification.

```mermaid
stateDiagram-v2
    [*] --> OrderCreated: User POST /api/orders
    note right of OrderCreated
      Server calculates totals directly from courses table.
      Initial status: PENDING
    end note

    OrderCreated --> ProofSubmitted: User POST /api/orders/:id/payment-proof
    note right of ProofSubmitted
      Client uploads transfer receipt to R2,
      submits object key with anti-IDOR check.
    end note

    ProofSubmitted --> VerifiedPaid: Admin PATCH /api/orders/:id/verify
    note right of VerifiedPaid
      Admin validates bank receipt.
      Order status -> PAID.
      Admin mutation logged to admin_audit_logs.
    end note

    OrderCreated --> Cancelled: Admin POST /api/orders/:id/cancel
    note right of Cancelled
      Pending orders can be cancelled.
      Order status -> CANCELLED.
    end note

    VerifiedPaid --> EnrollmentActive: Admin POST /api/orders/:id/activate
    note right of EnrollmentActive
      Idempotent upsert into enrollments table.
      Enrollment status -> ACTIVE.
      Grants perpetual access to course lessons.
    end note

    EnrollmentActive --> EnrollmentRevoked: Admin PATCH /api/enrollments/:id/revoke
    note right of EnrollmentRevoked
      Access revoked if disputed or refunded.
      Status -> REVOKED.
    end note
```

---

### 3. Secure Media & Video Streaming Flow

Video content and sensitive educational materials are **never served directly** via public URLs. Instead, temporary presigned URLs are minted only after verifying valid enrollment status.

```mermaid
sequenceDiagram
    autonumber
    actor Student as Authenticated Student
    participant API as LessonsController
    participant Guard as AuthGuard
    participant DB as Database (enrollments & lessons)
    participant Storage as MediaService (Cloudflare R2)

    Student->>API: GET /api/lessons/:id/video-url
    API->>Guard: Validate Bearer JWT (Extract user.sub)
    Guard-->>API: Authorized
    API->>DB: Query lesson details (course_id, video_object_key, is_preview)
    alt Lesson is Free Preview (is_preview == 1)
        API->>Storage: Generate Presigned GET URL (TTL: 300 seconds)
        Storage-->>API: Signed URL
        API-->>Student: 200 OK { videoUrl, expiresIn: 300 }
    else Lesson is Premium
        API->>DB: Check active enrollment (user_id, course_id, status='active')
        alt No Active Enrollment Found
            API-->>Student: 403 Forbidden ("Active enrollment required")
        else Enrollment Valid
            API->>Storage: Generate Presigned GET URL (TTL: 300 seconds)
            Storage-->>API: Signed URL
            API-->>Student: 200 OK { videoUrl, expiresIn: 300 }
        end
    end
```

---

## 🗄 Entity-Relationship Diagram (ERD)

The relational schema is enforced via strict SQLite/D1 constraints, primary key UUIDs, ISO 8601 timestamps, and foreign key cascades:

```mermaid
erDiagram
    USERS ||--o{ SESSIONS : "owns"
    USERS ||--o{ ORDERS : "places"
    USERS ||--o{ ENROLLMENTS : "holds"
    USERS ||--o{ PROGRESS : "tracks"
    
    COURSES ||--o{ LESSONS : "contains"
    COURSES ||--o{ COURSE_RESOURCES : "provides"
    COURSES ||--o{ COURSE_TAGS : "tagged with"
    COURSES ||--o{ ORDER_ITEMS : "referenced in"
    COURSES ||--o{ ENROLLMENTS : "grants access to"

    ORDERS ||--o{ ORDER_ITEMS : "comprises"
    ORDERS ||--o{ PAYMENT_PROOFS : "validated by"

    PROJECTS ||--o{ PROJECT_MEDIA : "showcases"
    PROJECTS ||--o{ PROJECT_MEMBERS : "developed by"
    COLLECTIVE_MEMBERS ||--o{ PROJECT_MEMBERS : "participates in"

    MARKETPLACE_ITEMS ||--o{ MARKETPLACE_MEDIA : "attaches"

    USERS {
        text id PK "UUID v4"
        text email UK "Unique lowercase email"
        text password_hash "Argon2id Hash"
        text role "user | admin"
        text status "active | suspended"
        text created_at "ISO 8601"
    }

    SESSIONS {
        text id PK "UUID v4"
        text user_id FK "References users(id)"
        text token_hash "SHA-256 Hashed Refresh Token"
        text ip_address "Client IP"
        text user_agent "Client User Agent"
        text expires_at "ISO 8601"
    }

    COURSES {
        text id PK "UUID v4"
        text title "Course Title"
        text slug UK "Unique SEO Slug"
        text description "Markdown Overview"
        integer price "Rupiah (IDR)"
        text status "draft | published"
        text thumbnail_url "Image URL"
    }

    LESSONS {
        text id PK "UUID v4"
        text course_id FK "References courses(id)"
        text title "Lesson Title"
        integer order_index "Sequential Sorting"
        integer is_preview "0 = Premium, 1 = Free Preview"
        text video_object_key "R2 Private Object Key"
        text status "draft | published"
    }

    ORDERS {
        text id PK "UUID v4"
        text user_id FK "References users(id)"
        integer total_amount "Server-Calculated IDR"
        text status "pending | paid | cancelled"
        text created_at "ISO 8601"
    }

    ENROLLMENTS {
        text id PK "UUID v4"
        text user_id FK "References users(id)"
        text course_id FK "References courses(id)"
        text status "active | revoked"
        text activated_at "ISO 8601"
    }

    ADMIN_AUDIT_LOGS {
        text id PK "UUID v4"
        text admin_id FK "References users(id)"
        text action "create | update | verify | activate | cancel | revoke"
        text target_type "order | enrollment | course | project"
        text target_id "Target Entity ID"
        text metadata "JSON Context Snapshot"
        text created_at "ISO 8601"
    }
```

---

## 🧩 Core Modules Breakdown

| Module | Directory | Key Responsibilities |
|---|---|---|
| **AuthModule** | `src/auth/` | Registration, Argon2id hashing, dual-token JWT issuing, IP/UserAgent session auditing, refresh rotation. |
| **CoursesModule** | `src/courses/` | Course catalog, published-only public queries, draft-gated admin management, slug uniqueness guards. |
| **LessonsModule** | `src/lessons/` | Lesson ordering (`order_index`), summary public stripping, presigned video streaming URL generation. |
| **OrdersModule** | `src/orders/` | Order creation with server-computed totals, receipt proof submission with anti-IDOR, admin verification & cancellation. |
| **EnrollmentsModule** | `src/enrollments/` | Idempotent student access activation, course progress authorization, admin revocation. |
| **ProjectsModule** | `src/projects/` | Studio portfolio showcase, structured narrative formatting (Problem → Solution → Tech → Result), media attachments. |
| **CollectiveModule** | `src/collective/` | Network roster of verified developers, designers, and AI architects with role mappings. |
| **MarketplaceModule** | `src/marketplace/` | Curated showcase of AI SaaS products with validated outbound destinations. |
| **MediaModule** | `src/media/` | S3-compatible R2 abstraction, presigned PUT upload minting with MIME/size validation, presigned GET streaming. |
| **SearchModule** | `src/search/` | High-performance multi-domain full-text search (Courses, Projects, SaaS) backed by SQLite FTS5. |
| **AdminModule** | `src/admin/` | High-level metrics overview (users, pending orders, active enrollments), customer management, audit trails. |
| **DatabaseModule** | `src/database/` | Abstraction unifying `better-sqlite3` and Cloudflare D1 REST API with automated migrations. |

---

## 📡 API Contract & Endpoint Matrix

All endpoints are served under the global prefix `/api`.

### 1. Authentication & Identity (`/api/auth`)
- `POST /api/auth/register` — Public registration (Always defaults to role `user`).
- `POST /api/auth/login` — Public login returning `{ accessToken, refreshToken, user }` (Rate limited: 5 req/min).
- `POST /api/auth/refresh` — Issue a new `accessToken` from a valid `refreshToken`.
- `POST /api/auth/logout` — Revoke and delete current refresh session.
- `GET /api/auth/me` — Inspect current user token payload (Requires Bearer JWT).
- `GET /api/auth/admin` — Guard validation confirming `admin` role elevation.

### 2. Courses & Curriculum (`/api/courses`, `/api/lessons`)
- `GET /api/courses` — Paginated published course catalog with keyword search (`?q=`, `?page=`, `?limit=`).
- `GET /api/courses/:slug` — Published course details with public lesson summary (Strips private video keys).
- `POST /api/courses` — **[Admin]** Create course draft.
- `PATCH /api/courses/:id` — **[Admin]** Update course metadata.
- `POST /api/courses/:id/publish` — **[Admin]** Gate-validated state transition to `published`.
- `POST /api/courses/:id/unpublish` — **[Admin]** Revert course to `draft`.
- `GET /api/courses/:courseId/lessons` — Retrieve lesson list for a course.
- `POST /api/courses/:courseId/lessons` — **[Admin]** Append lesson to course.
- `PATCH /api/lessons/:id/reorder` — **[Admin]** Update lesson sequence index.
- `GET /api/lessons/:id/video-url` — **[Student/Admin]** Mint temporary 300s presigned video streaming URL (Gated by enrollment).

### 3. Orders & Student Learning (`/api/orders`, `/api/enrollments`, `/api/progress`)
- `POST /api/orders` — Checkout course; returns pending order with server-calculated price.
- `POST /api/orders/:id/payment-proof` — Upload proof of bank transfer receipt.
- `PATCH /api/orders/:id/verify` — **[Admin]** Verify payment receipt (`pending` → `paid`).
- `POST /api/orders/:id/activate` — **[Admin]** Idempotently activate course enrollment for student.
- `POST /api/orders/:id/cancel` — **[Admin]** Cancel an unfulfilled pending order.
- `GET /api/enrollments/me` — List all active course enrollments belonging to caller.
- `PATCH /api/enrollments/:id/revoke` — **[Admin]** Revoke course access.
- `POST /api/progress` — Update lesson completion state (`is_completed: 1`).
- `GET /api/progress` — Retrieve user's overall learning progress.

### 4. Projects & Collective (`/api/projects`, `/api/collective`)
- `GET /api/projects` — Published portfolio listings with narrative previews.
- `GET /api/projects/:slug` — Deep project view including team members and public screenshots.
- `POST /api/projects` — **[Admin]** Create new portfolio entry.
- `POST /api/projects/:id/media` — **[Admin]** Attach screenshot/diagram to project.
- `POST /api/projects/:id/members` — **[Admin]** Link a collective member with their role.
- `GET /api/collective` — List active collective members and specialist skill tags.
- `GET /api/collective/:slug` — Member profile and associated portfolio projects.

### 5. Marketplace & Search (`/api/marketplace`, `/api/search`)
- `GET /api/marketplace` — Published SaaS and AI micro-products catalog.
- `GET /api/marketplace/:slug` — Product details with capability tags and outbound link.
- `GET /api/search` — Unified FTS5 search across courses, projects, and marketplace items (`?q=term`).

### 6. Administration & Storage Operations (`/api/admin`)
- `GET /api/admin/overview` — High-level dashboard counters (Total Users, Pending Orders, Active Enrollments).
- `GET /api/admin/users` — Paginated administrative customer registry.
- `GET /api/admin/orders` — Order audit log with payment proof inspection links.
- `POST /api/admin/media/upload-url` — **[Admin]** Generate presigned R2 PUT URL with strict MIME and size rules.
- `POST /api/admin/media/confirm` — **[Admin]** Confirm successful upload and register object metadata.

---

## 🔐 Environment Variables & Security Configuration

The application implements a **fail-fast configuration validator** (`src/config/env.validation.ts`). If any required parameter is missing or malformed, bootstrap terminates immediately without leaking secrets.

Create a `.env` file in the project root based on `.env.example`:

```env
# Application Environment (local | staging | production)
APP_ENV=local
PORT=3000
FRONTEND_URL=http://localhost:3001

# Database Configuration (sqlite | d1)
DB_DRIVER=sqlite
# Cloudflare D1 Credentials (Required if DB_DRIVER=d1)
# CLOUDFLARE_ACCOUNT_ID=
# CLOUDFLARE_D1_DATABASE_ID=
# CLOUDFLARE_API_TOKEN=

# Cryptographic Keys (Minimum 32 characters)
JWT_SECRET=super_secret_cryptographic_key_minimum_32_characters_long

# Media Storage Configuration (local-test | r2)
STORAGE_DRIVER=local-test
# Cloudflare R2 Credentials (Required if STORAGE_DRIVER=r2)
# R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
# R2_BUCKET=xolvon-storage
# R2_ACCESS_KEY_ID=
# R2_SECRET_ACCESS_KEY=
```

---

## 💻 Installation & Local Setup

### 1. Prerequisites
- **Node.js**: v22.0.0 or higher
- **npm**: v10.0.0 or higher

### 2. Install Dependencies
```bash
npm install
```

### 3. Initialize Database & Run Migrations
In local mode (`DB_DRIVER=sqlite`), SQLite database migrations in `src/database/migrations/` execute automatically upon application startup.

To seed the initial Administrator account:
```bash
ADMIN_BOOTSTRAP_EMAIL="admin@xolvon.com" ADMIN_BOOTSTRAP_PASSWORD="SuperSecretPassword123!" npm run seed:admin
```

### 4. Start Development Server
```bash
# Start with hot-reload watcher
npm run start:dev

# Start in production mode
npm run start:prod
```
The API server will listen on `http://localhost:3000/api`.

---

## 🧪 Testing & Quality Assurance

Due to NestJS 12 running native ECMAScript Modules (ESM), the test runner must be executed with experimental VM module support enabled:

```bash
# Run complete unit test suite (38 suites, 335 tests)
npm run test:esm

# Run specific unit test file
npm run test:esm -- src/auth/auth.service.spec.ts

# Run end-to-end (E2E) integration tests
npm run test:e2e

# Generate test coverage report
npm run test:cov

# Run code linter (Oxlint)
npm run lint

# Format code with Prettier
npm run format
```

> **Zero Cloud Credentials in Tests**: All unit and integration tests utilize in-memory mock adapters (`LocalTestStorageService`, mock `DatabaseService`). Tests **never** contact Cloudflare or external networks during execution.

---

## 📬 Postman Collection Integration

A complete, pre-configured Postman collection is included directly in the repository: [`Xolvon-API.postman_collection.json`](Xolvon-API.postman_collection.json).

### Features:
1. **Automated Token Chaining**: Logging in via `/api/auth/login` automatically stores `accessToken` and `refreshToken` into collection variables.
2. **Organized Folders**:
   - `00. Health & Public`
   - `01. Auth`
   - `02. Courses & Lessons`
   - `03. Projects`
   - `04. Collective`
   - `05. Marketplace`
   - `06. Orders & Learning`
   - `07. Admin & Media`
3. **Environment Variables Configured**:
   - `baseUrl`: `http://localhost:3000/api`
   - `email`: `user@example.com`
   - `adminEmail`: `admin@example.com`

---

## 🚢 Production Operations & Deployment

### Cloudflare D1 Migration Execution
When operating against live Cloudflare D1 databases, execute migrations using Wrangler:
```bash
npx wrangler d1 migrations apply xolvon-course-db --remote
```

### Production Checklist
- [x] Set `APP_ENV=production` and `DB_DRIVER=d1`.
- [x] Ensure `FRONTEND_URL` strictly matches your production domain (e.g., `https://xolvon.com`).
- [x] Secure `JWT_SECRET` in deployment secret manager (Cloudflare Secrets / AWS Secrets Manager).
- [x] Provision dedicated Cloudflare R2 bucket with restrictive CORS policies.
- [x] Verify rate limiting thresholds on sensitive authentication routes.

---

## 📄 License & Organization

Copyright © 2026 **PT Xolvon Kehidupan Cerdas Abadi**. All rights reserved.  
Maintained by the **Xolvon Collective Engineering Team**.
