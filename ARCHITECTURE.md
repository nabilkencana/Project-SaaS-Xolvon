# ARCHITECTURE.md

# XOLVON.COM

## FRONTEND + APPLICATION ARCHITECTURE

**Project:** Xolvon.com
**Organization:** PT Xolvon Kehidupan Cerdas Abadi
**Product:** AI Business Collective
**Document Type:** Application Architecture & Engineering Contract
**Status:** Mandatory
**Version:** V1
**Primary Consumers:** Frontend, Backend, Database, Security, QA, DevOps, AI Coding Agent

---

# 0. PURPOSE

`ARCHITECTURE.md` adalah kontrak mengenai:

> **BAGAIMANA XOLVON.COM DIBANGUN.**

Dokumen ini menjelaskan boundary antara:

```text id="u34h9e"
Browser
↓
Next.js Application
↓
Server Logic
↓
D1
↓
R2
↓
External Services
```

Tujuan utamanya adalah memastikan seluruh developer dan AI Coding Agent membangun aplikasi menggunakan model arsitektur yang sama.

---

# 1. ARCHITECTURE OBJECTIVES

Architecture harus mengoptimalkan:

```text id="rc6nzm"
Security
Maintainability
Performance
Simplicity
Consistency
Scalability
Debuggability
Deployment Reliability
```

Urutan prioritas:

```text id="q9g0xv"
Security
>
Correctness
>
Maintainability
>
Performance
>
Developer Convenience
```

Developer convenience tidak boleh mengalahkan security atau correctness.

---

# 2. ARCHITECTURE PRINCIPLE

Xolvon menggunakan prinsip:

> **Server owns trust. Client owns interaction.**

Artinya:

### Server

Memiliki authority untuk:

* authentication,
* authorization,
* database access,
* storage authorization,
* premium entitlement,
* payment state,
* enrollment state,
* admin permission,
* sensitive mutation.

### Client

Bertanggung jawab terutama untuk:

* rendering,
* user interaction,
* local UI state,
* browser APIs,
* optimistic presentation bila aman,
* animation,
* responsive behavior.

---

# 3. HIGH-LEVEL ARCHITECTURE

```text id="9z0p7n"
                         ┌───────────────────────┐
                         │       BROWSER         │
                         │                       │
                         │ React / Client UI     │
                         │ Server-rendered UI    │
                         └───────────┬───────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │   NEXT.JS APP LAYER   │
                         │                       │
                         │ Routes                │
                         │ Components            │
                         │ Server Actions / API  │
                         └───────────┬───────────┘
                                     │
                  ┌──────────────────┼──────────────────┐
                  │                  │                  │
                  ▼                  ▼                  ▼
          ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
          │ Auth /      │    │ Application │    │ Validation  │
          │ Permission  │    │ Services    │    │             │
          └──────┬──────┘    └──────┬──────┘    └─────────────┘
                 │                  │
                 └──────────┬───────┘
                            │
               ┌────────────┴────────────┐
               │                         │
               ▼                         ▼
        ┌──────────────┐         ┌──────────────┐
        │ Cloudflare   │         │ Cloudflare   │
        │ D1           │         │ R2           │
        │ Database     │         │ Object Store │
        └──────────────┘         └──────────────┘
```

---

# 4. TECHNICAL BASELINE

Baseline frontend/application stack:

```text id="y6m3q8"
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
Cloudflare
D1
R2
```

Master PRD menetapkan Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, Cloudflare Workers/Pages, D1, dan R2 sebagai baseline teknis.

---

# 5. CLOUD PROVIDER RULE

Xolvon menggunakan:

```text id="k3f2ps"
Cloudflare D1
Cloudflare R2
Cloudflare runtime/deployment
```

Supabase bukan baseline.

Master PRD secara eksplisit menetapkan D1/R2 dan menggantikan Supabase.

---

# 6. RUNTIME / ADAPTER STATUS

## [OPEN DECISION]

Final runtime/adapter deployment belum boleh diasumsikan.

Decision harus mencakup:

```text id="j8y4tz"
Runtime
Adapter / deployment framework
D1 bindings
R2 bindings
Auth/session compatibility
Server Action compatibility
Local/Stage/Production parity
```

Handbook menyatakan WebDev Lead perlu mengunci keputusan tersebut berdasarkan kebutuhan aplikasi.

---

# 7. CURRENT DEPLOYMENT CONSTRAINT

Xolvon bukan static website.

Application membutuhkan:

```text id="gkql8a"
Authentication
Authorization
Server-side logic
D1
R2
Protected routes
Protected media
Signed URLs
Admin mutations
```

Karena itu deployment architecture harus mendukung full-stack behavior.

---

# 8. ARCHITECTURE LAYERS

Xolvon menggunakan conceptual layers:

```text id="7g9sl7"
1. Presentation Layer
2. Route Layer
3. Application Layer
4. Security Layer
5. Data Access Layer
6. Storage Layer
7. Infrastructure Layer
```

---

# 9. PRESENTATION LAYER

Responsibilities:

```text id="cfc8k9"
UI
Rendering
Interaction
Responsive behavior
Accessibility
Visual state
```

Contoh:

```text id="9q8gc8"
components/
├── ui/
├── home/
├── course/
├── marketplace/
├── portfolio/
├── collective/
└── admin/
```

---

# 10. PRESENTATION MUST NOT

Presentation layer tidak boleh secara langsung:

```text id="wx8r4z"
query D1
access R2 credentials
verify security entitlement
change user role
activate enrollment
publish content
```

Presentation meminta operation melalui application/server boundary.

---

# 11. ROUTE LAYER

Route layer bertanggung jawab atas:

```text id="0e4tme"
route resolution
page composition
route-level access boundary
metadata
navigation
```

Contoh:

```text id="r0q4pw"
app/
├── (public)/
├── (auth)/
├── (user)/
└── (admin)/
```

---

# 12. APPLICATION LAYER

Application layer bertanggung jawab atas:

```text id="61g6wc"
business operation
use case
orchestration
validation flow
data coordination
```

Contoh:

```text id="6tgs4u"
Create Course
Publish Course
Activate Enrollment
Revoke Enrollment
Generate Signed Media URL
Update Progress
Create Project
Create Marketplace Item
```

---

# 13. SECURITY LAYER

Security layer bertanggung jawab atas:

```text id="pmlv4p"
Authentication
Authorization
Role Check
Ownership Check
Enrollment Check
Request Integrity
Session Validation
```

Security layer bukan optional.

---

# 14. DATA ACCESS LAYER

Data access layer bertanggung jawab atas:

```text id="ep7kqq"
D1 queries
prepared statements
transactions where necessary
relationship fetching
data mapping
```

Frontend tidak boleh melakukan raw D1 access.

---

# 15. STORAGE LAYER

Storage layer bertanggung jawab atas:

```text id="cs4o1j"
R2 object access
presigned URL generation
upload authorization
object validation
object metadata
public/private visibility
```

---

# 16. INFRASTRUCTURE LAYER

Infrastructure layer bertanggung jawab atas:

```text id="2uf6b9"
Cloudflare runtime
D1 binding
R2 binding
environment
secrets
deployment
observability
```

---

# 17. REPOSITORY STRUCTURE

Recommended baseline:

```text id="nv88o1"
xolvon.com/
│
├── .ai/
│   ├── RULES.md
│   ├── PRD.md
│   ├── SCHEMA.md
│   ├── DESIGN.md
│   └── ARCHITECTURE.md
│
├── app/
│   ├── (public)/
│   │   ├── page.tsx
│   │   ├── solve-on/
│   │   ├── about/
│   │   ├── portfolio/
│   │   │   └── [slug]/
│   │   ├── course/
│   │   │   └── [slug]/
│   │   ├── marketplace/
│   │   │   └── [slug]/
│   │   └── collective/
│   │       └── [slug]/
│   │
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   │
│   ├── (user)/
│   │   ├── dashboard/
│   │   └── learn/
│   │       └── [courseSlug]/
│   │           └── [lessonId]/
│   │
│   └── (admin)/
│       ├── admin/
│       │   ├── login/
│       │   └── ...
│       └── 67/
│
├── components/
│   ├── ui/
│   ├── home/
│   ├── course/
│   ├── marketplace/
│   ├── portfolio/
│   ├── collective/
│   └── admin/
│
├── lib/
│   ├── auth/
│   ├── db/
│   ├── r2/
│   ├── permissions/
│   ├── validation/
│   └── analytics/
│
├── db/
│   └── migrations/
│
├── public/
│
├── tests/
│
├── wrangler.jsonc
│
└── package.json
```

Handbook menetapkan prinsip yang sama: pisahkan public pages, authenticated user pages, admin pages, dan server-only libraries.

---

# 18. APP ROUTER STRUCTURE

Use Next.js App Router.

Route groups boleh digunakan untuk separation:

```text id="0n6zq8"
(public)
(auth)
(user)
(admin)
```

Route group tidak selalu memengaruhi URL public.

---

# 19. ROUTE ACCESS CLASSIFICATION

## Public

```text id="9c0v5x"
/
 /solve-on
 /about
 /portfolio
 /portfolio/[slug]
 /course
 /course/[slug]
 /marketplace
 /marketplace/[slug]
 /collective
 /collective/[slug]
 /register
 /login
```

## User Protected

```text id="tqz5nt"
/dashboard
/learn/[courseSlug]/[lessonId]
```

## Admin

```text id="xwt0k4"
/67
/admin/login
/admin
```

---

# 20. ROUTE PROTECTION

Protected route flow:

```text id="bt4s0q"
Request
↓
Session Validation
↓
Role / Entitlement Validation
↓
Allow
or
Reject
```

Frontend hiding alone tidak cukup.

---

# 21. PUBLIC ROUTE RULE

Public route hanya boleh menampilkan:

```text id="9nco6o"
published
publicly eligible
```

content.

Draft/internal content tidak boleh accidentally muncul melalui public route.

---

# 22. USER ROUTE RULE

User route harus memverifikasi:

```text id="0j7c8n"
authentication
```

dan bila course-specific:

```text id="7x4m9p"
active enrollment
```

---

# 23. ADMIN ROUTE RULE

Admin route harus memverifikasi:

```text id="z7t7hf"
authentication
+
role = admin
```

server-side.

---

# 24. /67 ARCHITECTURE

`/67` adalah internal entry point.

Flow:

```text id="i5vv1r"
/67
↓
Admin Login
↓
Session
↓
Admin Role Check
↓
Admin Dashboard
```

Mengetahui `/67` tidak memberikan authorization.

---

# 25. SERVER COMPONENT DEFAULT

Server Components adalah default untuk page-level rendering ketika client interactivity tidak dibutuhkan.

Gunakan Server Component untuk:

```text id="5m6orq"
data fetching
SEO metadata
server-safe composition
public content rendering
protected server-side data resolution
```

---

# 26. CLIENT COMPONENT USAGE

Gunakan Client Component jika diperlukan oleh:

```text id="7gl01v"
useState
useEffect
event handlers
browser APIs
interactive form
modal state
carousel interaction
client-side animation
```

Jangan menggunakan `"use client"` hanya karena file merupakan frontend component.

---

# 27. CLIENT COMPONENT MUST NOT

Client Component tidak boleh langsung:

```text id="v0sl8o"
query D1
access R2 credentials
access private secrets
perform server authorization
generate secure signed credentials
mutate protected DB state directly
```

---

# 28. SERVER COMPONENT + CLIENT COMPONENT PATTERN

Default:

```text id="2g7cp5"
Server Page
│
├── Server Data
│
└── Client Interactive Component
```

Contoh:

```text id="jm1vb9"
Course Page
│
├── Course Data
│
├── Course Content
│
└── Checkout Button [Client]
```

---

# 29. DATA FETCHING PRINCIPLE

Data fetching harus sedekat mungkin dengan server boundary.

Pattern:

```text id="m6nrby"
Page
↓
Server Service
↓
Data Access
↓
D1
```

bukan:

```text id="g0u2p1"
Browser
↓
fetch internal database
```

---

# 30. SERVICE LAYER

Business operation yang digunakan lebih dari satu route sebaiknya memiliki service/use-case layer.

Conceptual examples:

```text id="m9x7yn"
courseService
enrollmentService
orderService
projectService
marketplaceService
collectiveService
mediaService
```

Exact naming dapat mengikuti implementation team.

---

# 31. DATA ACCESS SERVICE

Service tidak boleh mengandung UI logic.

Contoh:

```text id="xy1kdy"
courseService
→ retrieve published courses

courseService
→ retrieve course detail

enrollmentService
→ check access

mediaService
→ generate signed URL
```

---

# 32. UI LOGIC VS BUSINESS LOGIC

UI logic:

```text id="r8x7yk"
open modal
close menu
active tab
carousel index
```

Business logic:

```text id="chkd5f"
can access course
can publish
can activate
can revoke
is payment verified
```

Business logic harus berada di server/application boundary.

---

# 33. AUTHENTICATION ARCHITECTURE

Conceptual:

```text id="xsq8rf"
Browser
↓
Login
↓
Credential Validation
↓
Password Hash Verification
↓
Session Creation
↓
HTTP-only Secure Cookie
↓
Authenticated Request
```

Final auth library masih merupakan open decision pada source.

---

# 34. SESSION RULE

Session implementation harus menggunakan secure pattern yang kompatibel dengan runtime.

Baseline recommendation:

```text id="2d3vko"
HTTP-only
Secure
SameSite
Session Expiry
Logout
```

Handbook menetapkan baseline tersebut.

---

# 35. PASSWORD RULE

Password:

```text id="9cjm8m"
NEVER store plaintext
```

Database:

```text id="p5z1b8"
password_hash
```

Hash strategy/library final harus kompatibel dengan deployment runtime.

---

# 36. ROLE AUTHORIZATION

Roles:

```text id="l5ap7i"
user
admin
```

Server check:

```text id="w8ifpa"
authenticated?
↓
role permitted?
↓
ownership permitted?
↓
entitlement permitted?
↓
execute
```

---

# 37. OWNERSHIP CHECK

Authenticated user tidak otomatis boleh membaca semua resource.

Server harus mempertimbangkan:

```text id="l5qk1w"
Who owns this resource?
```

Contoh:

```text id="0q2p5g"
User A
→
User A's Orders
```

bukan:

```text id="6s5fw9"
User A
→
All Orders
```

---

# 38. ENTITLEMENT CHECK

Course access:

```text id="xl71s6"
User
+
Course
+
Active Enrollment
=
Entitled
```

---

# 39. PREMIUM MEDIA ARCHITECTURE

Flow:

```text id="kqxy6a"
User opens Lesson
↓
Authentication
↓
Enrollment Check
↓
Lesson belongs to Course?
↓
Server generates short-lived signed URL
↓
Browser receives URL
↓
Browser plays media
```

Premium video harus private.

Handbook menetapkan signed URL untuk protected R2 media.

---

# 40. SIGNED URL RULE

Signed URL:

```text id="2m0hhg"
short-lived
server-generated
authorization-dependent
```

Jangan:

```text id="k6r1u3"
store permanent public URL
```

---

# 41. SIGNED URL FAILURE

Jika:

```text id="kuun10"
signed URL expired
```

server dapat membuat URL baru hanya jika:

```text id="ypdaas"
entitlement masih aktif
```

---

# 42. R2 ARCHITECTURE

R2 digunakan untuk:

```text id="7ra96d"
video
PDF
resource
thumbnail
project media
marketplace media
```

dengan public/private distinction.

---

# 43. R2 PUBLIC OBJECT

Public assets dapat menggunakan public visibility ketika memang diperlukan.

Contoh:

```text id="h6jqqy"
marketing image
public project media
public thumbnail
```

---

# 44. R2 PRIVATE OBJECT

Private assets:

```text id="8hb4uk"
premium course video
protected course resource
```

tidak menggunakan direct public URL.

---

# 45. R2 UPLOAD ARCHITECTURE

Admin upload:

```text id="6xy5ll"
Admin
↓
Server authorization
↓
Metadata validation
↓
MIME validation
↓
Size validation
↓
Generated object key
↓
Short-lived presigned PUT URL
↓
Browser uploads directly to R2
↓
Server confirms upload
↓
D1 metadata persistence
```

Handbook menetapkan direct-to-R2 upload melalui short-lived presigned URL agar Worker tidak menjadi byte-transfer bottleneck.

---

# 46. R2 CREDENTIAL RULE

Browser tidak pernah menerima:

```text id="p72jv2"
R2 credentials
```

Browser hanya menerima:

```text id="y0tfj6"
short-lived signed URL
```

---

# 47. OBJECT KEY RULE

Object key dibuat server.

Jangan menjadikan:

```text id="p5mofx"
raw user filename
```

sebagai security/path authority.

---

# 48. R2 OBJECT PREFIX

Baseline:

```text id="c3wc22"
public/site/{asset-id}/{filename}

public/projects/{project-id}/{filename}

private/courses/{course-id}/lessons/{lesson-id}/video/{asset-id}.{ext}

private/courses/{course-id}/lessons/{lesson-id}/resources/{asset-id}.{ext}

private/projects/{project-id}/{filename}
```

---

# 49. D1 ARCHITECTURE

D1 merupakan relational source of truth.

Canonical conceptual entities:

```text id="vf2z4g"
users
courses
lessons
course_resources
enrollments
orders
order_items
progress
projects
project_media
project_members
collective_members
marketplace_items
marketplace_media
admin_audit_logs
```

---

# 50. D1 ACCESS RULE

Browser:

```text id="ny6bqn"
NO DIRECT D1
```

Server:

```text id="5y8bxo"
AUTHORIZED D1 ACCESS
```

---

# 51. D1 QUERY SAFETY

Semua user-controlled input untuk query harus menggunakan:

```text id="j74y8x"
prepared statements
bind parameters
```

Tidak boleh:

```text id="p4r8sj"
SQL string concatenation
```

Handbook menetapkan prepared statements/bind parameters untuk input user-controlled.

---

# 52. D1 MIGRATION RULE

Schema change:

```text id="v4ueoi"
Migration file
```

bukan:

```text id="n0ujqy"
random production SQL
```

Schema change harus mengikuti `SCHEMA.md`.

---

# 53. D1 RELATIONSHIP RULE

Important foreign keys dan unique constraints harus dipertahankan.

Contoh:

```text id="h1j8xv"
enrollments.user_id
→ users.id

enrollments.course_id
→ courses.id
```

dan:

```sql id="9y3x4r"
UNIQUE(user_id, course_id)
```

untuk enrollment uniqueness.

---

# 54. DATABASE TRANSACTION RULE

Operation yang membutuhkan consistency antar-record harus mempertimbangkan transactional behavior.

Contoh:

```text id="zk0rcx"
Activation
Order state change
Enrollment creation/update
```

Exact transaction implementation berada di database/application implementation.

---

# 55. ENROLLMENT ARCHITECTURE

Activation:

```text id="mgk6nw"
Admin
↓
Authorization
↓
Order Validation
↓
Course/User Validation
↓
Enrollment Mutation
↓
Audit Log
```

---

# 56. IDEMPOTENCY

Activation harus idempotent.

Concept:

```text id="ntd3qy"
Activate
+
Activate again
=
same intended enrollment state
```

bukan duplicate enrollment.

Handbook menetapkan activation idempotency sebagai operational guardrail.

---

# 57. REVOCATION ARCHITECTURE

Revoke:

```text id="h2qj8m"
Admin
↓
Authorization
↓
Target Enrollment
↓
Set Revoked
↓
Record revocation
↓
Future premium access denied
```

---

# 58. ORDER ARCHITECTURE

Order lifecycle:

```text id="p8ax7e"
Create Order
↓
PENDING
↓
Payment Verification
↓
PAID / VERIFIED
↓
Admin Activation
↓
ACTIVE Enrollment
```

Order dan enrollment merupakan concept terpisah.

---

# 59. PAYMENT ARCHITECTURE

V1 payment:

```text id="n07mpy"
User
↓
Checkout
↓
Payment Instruction
↓
Manual Payment
↓
WhatsApp Admin
↓
Admin Verification
↓
Admin Activation
```

Automated payment settlement tidak menjadi architecture assumption V1.

---

# 60. ADMIN MUTATION ARCHITECTURE

Semua sensitive mutation:

```text id="t9r8n0"
Request
↓
Authentication
↓
Authorization
↓
Input Validation
↓
Business Validation
↓
Mutation
↓
Audit
↓
Safe Response
```

---

# 61. PUBLIC READ ARCHITECTURE

Public read:

```text id="gk1x8z"
Public Request
↓
Route
↓
Server Data Access
↓
Published/Public Filter
↓
DTO
↓
UI
```

---

# 62. USER READ ARCHITECTURE

Protected read:

```text id="l1xq1m"
Request
↓
Session
↓
User identity
↓
Ownership / Enrollment
↓
Data access
↓
Safe DTO
↓
UI
```

---

# 63. ADMIN READ ARCHITECTURE

```text id="e8u33j"
Request
↓
Session
↓
Admin Role
↓
Permission
↓
Operational Data
↓
Admin DTO
↓
UI
```

---

# 64. API / SERVER ACTION RULE

Endpoint/server action names boleh dipilih implementor.

Yang wajib konsisten:

```text id="l4ng2p"
input contract
auth requirement
authorization requirement
validation
error behavior
return contract
audit requirement
```

Handbook menekankan mutation contract server-side yang jelas untuk action relevan.

---

# 65. SERVER ACTION EXAMPLE CONTRACT

Conceptual:

```text id="wsh3nm"
publishCourse(input)
```

must perform:

```text id="h6vydi"
authenticate
→ authorize admin
→ validate input
→ validate course
→ update status
→ audit
→ return safe result
```

---

# 66. SERVER ACTION RESPONSE

Return:

```text id="g5ml5b"
safe data
```

Not:

```text id="v9jwd3"
full database row
+
password hash
+
internal metadata
```

---

# 67. ERROR HANDLING ARCHITECTURE

Error layers:

```text id="0j3qjv"
Database / Infrastructure
↓
Application
↓
API / Server Action
↓
UI
```

Each layer translates errors appropriately.

---

# 68. DATABASE ERROR

Do not expose raw database error to end user.

Bad:

```text id="xyyq5l"
SQLITE_CONSTRAINT: UNIQUE constraint failed...
```

Better:

```text id="2cvxxo"
The requested record already exists.
```

when that meaning is safe.

---

# 69. STORAGE ERROR

Do not expose raw R2 internal error.

Bad:

```text id="s9o4t7"
bucket access denied at internal endpoint...
```

Better:

```text id="swr2ai"
Unable to load this media. Please try again.
```

---

# 70. SECURITY ERROR

Don't tell an unauthorized user details that help enumeration.

Example:

Instead of revealing:

```text id="1enl3a"
"This course belongs to User X and your enrollment was revoked at..."
```

use only what the product UX requires.

---

# 71. 404 ARCHITECTURE

404 should originate from the route/data resolution layer.

No fake fallback record.

---

# 72. 401 ARCHITECTURE

Unauthenticated protected access:

```text id="0eqoxf"
Session missing/invalid
→
login redirect or unauthorized
```

---

# 73. 403 ARCHITECTURE

Authenticated but unauthorized:

```text id="p7j3bd"
authenticated
+
not permitted
→
403 / access denied
```

---

# 74. INPUT VALIDATION

Validation harus dilakukan server-side.

Frontend validation:

```text id="3j1b5y"
UX convenience
```

Server validation:

```text id="q2c3us"
Security / correctness
```

Frontend validation tidak menggantikan server validation.

---

# 75. DOUBLE SUBMISSION

Sensitive operation harus mencegah accidental duplication pada:

```text id="lf8x52"
checkout
activation
publish
upload confirmation
save mutation
```

Server idempotency merupakan authority.

UI loading state hanya secondary protection.

---

# 76. AUTHORIZATION != UI VISIBILITY

Tidak valid:

```text id="x2qy9n"
if admin:
  show button
```

lalu menganggap operation secure.

Valid:

```text id="gqmy3a"
button visible
+
server authorizes mutation
```

---

# 77. IDOR PROTECTION

Setiap protected resource request harus mempertimbangkan:

```text id="3fsajp"
Who is requesting?
Which resource?
Does requester own it?
Does requester have entitlement?
```

User tidak boleh mengakses data user lain hanya dengan mengganti ID/slug.

---

# 78. REQUEST INTEGRITY

Authentication dan authorization tidak otomatis menghilangkan semua request attacks.

Implementasi harus mempertimbangkan appropriate request-integrity/CSRF strategy berdasarkan auth/session architecture.

Handbook secara eksplisit menyebut SameSite saja tidak boleh dianggap selalu cukup.

---

# 79. ENVIRONMENT ARCHITECTURE

Environment:

```text id="ykyctd"
LOCAL
STAGING
PRODUCTION
```

Masing-masing mempunyai:

```text id="r9icaf"
configuration
database binding
storage binding
secrets
domain/origin
```

---

# 80. ENVIRONMENT PARITY

Ideal:

```text id="9htx89"
same application architecture
+
different environment values
```

bukan:

```text id="4k4tja"
different architecture per environment
```

---

# 81. LOCAL

Local harus dapat menjalankan core flows:

```text id="l3g9gh"
auth
course
lesson
dashboard
admin
database migrations
mock/test data
```

sesuai implementation stage.

---

# 82. STAGING

Staging digunakan untuk:

```text id="l4v8nq"
Cloudflare runtime
D1
R2
Auth
Upload
Protected media
SEO
Integration
```

---

# 83. PRODUCTION

Production membutuhkan verifikasi:

```text id="6f3h34"
custom domain
HTTPS
D1
R2
secrets
SEO
canonical
analytics
monitoring
rollback
```

Handbook menetapkan local → staging → production validation tersebut.

---

# 84. SECRET ARCHITECTURE

Secrets hanya berada:

```text id="x0stha"
server-side environment/secret storage
```

Tidak:

```text id="yjo0js"
Git
browser bundle
public env
screenshots
logs
```

---

# 85. PUBLIC ENV RULE

Variable yang diekspos ke browser harus dianggap public.

Jangan menaruh:

```text id="qpn2ux"
private credentials
session secret
R2 credentials
database credentials
```

dalam browser-exposed env.

---

# 86. BINDING CONSISTENCY

Cloudflare bindings harus konsisten antara:

```text id="k6h6oi"
code
Wrangler config
environment
documentation
```

Handbook secara eksplisit meminta nama binding konsisten.

---

# 87. CACHING PRINCIPLE

Caching harus mengikuti data nature.

Public immutable-ish content:

```text id="2j3e6n"
can be cached
```

User-specific/private content:

```text id="2d8r8r"
must not accidentally become shared cache
```

Admin data:

```text id="lwxw0g"
no public cache
```

---

# 88. PUBLIC DATA CACHING

Candidate:

```text id="b7p6kr"
published courses
published portfolio
published marketplace
published collective
```

dapat menggunakan caching/revalidation strategy yang sesuai runtime.

Exact implementation berada pada application architecture.

---

# 89. PRIVATE DATA CACHING

Jangan membagikan response user-specific melalui cache shared.

Contoh:

```text id="7m1v1f"
User A dashboard
```

tidak boleh accidentally ditampilkan sebagai:

```text id="5sf20k"
User B dashboard
```

---

# 90. AUTH DATA CACHE

Authentication-dependent data harus memiliki cache isolation yang benar.

Session identity harus dipertimbangkan ketika menentukan cache key/strategy.

---

# 91. SEO ARCHITECTURE

Public page:

```text id="be4m81"
server-renderable
metadata-capable
indexable if published
```

Private routes:

```text id="nra2eu"
non-public
non-indexable
```

---

# 92. SITEMAP ARCHITECTURE

Sitemap hanya memasukkan:

```text id="hp4c7m"
public
published
indexable
```

content.

Jangan memasukkan:

```text id="c9st9x"
/admin
/dashboard
/learn
draft
unpublished
private
```

---

# 93. CANONICAL URL ARCHITECTURE

Public detail content harus memiliki canonical URL yang stabil.

Slug merupakan public identifier.

---

# 94. SOCIAL METADATA

Public detail pages dapat menyediakan:

```text id="4zv8xq"
title
description
image
canonical
```

berdasarkan public-safe data.

---

# 95. ANALYTICS ARCHITECTURE

Operational analytics dapat membaca events/metrics dari application layer.

Minimum focus:

```text id="k8q8c3"
registered users
pending activation
active enrollment
course views
checkout starts
confirmed payments
activated users
top courses
portfolio views
marketplace views
CTA clicks
errors
failed uploads
```

Handbook menetapkan metric tersebut untuk Admin Dashboard.

---

# 96. ANALYTICS PRIVACY

Jika third-party analytics digunakan:

```text id="tb7j3o"
privacy/cookie/legal behavior
```

harus konsisten dengan legal policy.

Jangan mengatakan:

```text id="8v3byw"
"No data collected"
```

sementara telemetry pihak ketiga mengumpulkan data.

---

# 97. OBSERVABILITY

Minimum observability:

```text id="q8r77g"
application errors
failed uploads
critical mutation failures
runtime errors
```

Jangan melakukan excessive surveillance terhadap user.

---

# 98. LOGGING ARCHITECTURE

Log harus:

```text id="w2k9r8"
structured
safe
useful
```

Jangan log:

```text id="2dt7ie"
password
session secret
R2 credential
private token
sensitive internal data
```

---

# 99. AUDIT LOG ARCHITECTURE

Operationally important actions:

```text id="xgzjyn"
activate
revoke
publish
delete
role change
```

dapat menghasilkan audit log.

---

# 100. AUDIT LOG DATA

Conceptual:

```text id="4p2a4n"
actor
action
entity type
entity ID
metadata
created at
```

---

# 101. FEATURE FOLDER ARCHITECTURE

Feature-specific code dikelompokkan.

Contoh:

```text id="w8t6m0"
components/course/
components/portfolio/
components/marketplace/
components/collective/
components/admin/
```

Jangan menaruh semua component dalam satu folder:

```text id="j5s22x"
components/
  Button
  Card
  Course
  Project
  Modal
  ...
```

tanpa feature separation.

---

# 102. SHARED UI ARCHITECTURE

Reusable primitives:

```text id="s25c3j"
components/ui/
```

Contoh:

```text id="d6w8pi"
Button
Card
Input
Dialog
Badge
Dropdown
Skeleton
Table
Tabs
Toast
```

---

# 103. FEATURE COMPONENT ARCHITECTURE

Domain components:

```text id="xjd6sv"
CourseCard
ProjectCard
MarketplaceCard
MemberCard
CourseProgress
AdminUserTable
OrderTable
```

berada di feature area.

---

# 104. UTILITY ARCHITECTURE

General utilities:

```text id="n1b5i8"
lib/
```

Contoh:

```text id="k3x8so"
validation
formatting
permissions
data mapping
```

Jangan memasukkan database access ke generic UI utils.

---

# 105. AUTH LIB ARCHITECTURE

```text id="9al5dx"
lib/auth/
```

menjadi lokasi authentication-related logic.

UI login tetap berada di route/component layer.

---

# 106. PERMISSION ARCHITECTURE

```text id="hrcw4e"
lib/permissions/
```

menjadi lokasi permission/authorization helpers bila digunakan.

Authorization tetap harus dijalankan server-side.

---

# 107. DATABASE ARCHITECTURE

```text id="7x5d7h"
lib/db/
```

menjadi boundary D1 access.

UI tidak boleh meng-import database module.

---

# 108. R2 ARCHITECTURE

```text id="fq9lya"
lib/r2/
```

menjadi boundary storage logic.

Contoh responsibility:

```text id="t2jb9h"
generateUploadUrl
confirmUpload
generateSignedReadUrl
validateObject
```

---

# 109. VALIDATION ARCHITECTURE

```text id="u8b3xo"
lib/validation/
```

menjadi tempat schema/input validation helpers.

Validation harus digunakan pada server untuk sensitive mutations.

---

# 110. ANALYTICS ARCHITECTURE

```text id="n1tp8f"
lib/analytics/
```

menjadi tempat analytics abstraction jika diperlukan.

Jangan menyebarkan vendor-specific analytics code ke seluruh component.

---

# 111. ROUTE → SERVICE → DATA PATTERN

Recommended:

```text id="p7jhb5"
Page / Action
↓
Application Service
↓
Permission / Validation
↓
Data Access
↓
D1 / R2
```

---

# 112. DO NOT USE PAGE AS SERVICE

Page tidak boleh menjadi giant file berisi:

```text id="3xg1a7"
database query
business logic
authorization
form validation
UI
```

semuanya sekaligus.

---

# 113. DO NOT USE COMPONENT AS DATABASE LAYER

Component tidak boleh menjalankan raw database logic.

Buruk:

```text id="8er2y3"
CourseCard
↓
D1 query
```

Benar:

```text id="j8q3c6"
Page
↓
Course Service
↓
Course Data
↓
CourseCard
```

---

# 114. SERVER-ONLY MODULE RULE

Server-only modules harus jelas terpisah.

Conceptual:

```text id="opz6qi"
lib/db
lib/r2
lib/auth server logic
lib/permissions server logic
```

jangan accidentally imported into client bundle.

---

# 115. BOUNDARY VIOLATION EXAMPLE

Invalid:

```text id="aw1dyz"
"use client"

import db from "@/lib/db"
```

Client tidak boleh membawa database boundary.

---

# 116. SAFE CLIENT DATA

Client menerima:

```text id="s65xwi"
public DTO
user-safe DTO
admin-safe DTO
```

sesuai permission.

---

# 117. DATA TRANSFORMATION

Mapping:

```text id="w4p8h4"
Database Row
↓
Domain/Application Model
↓
DTO
↓
UI View Model
```

boleh dilakukan untuk menjaga boundaries.

---

# 118. DB MODEL ≠ DTO

Jangan selalu return full database row.

Contoh:

```text id="f5vp2o"
users
```

memiliki sensitive fields.

Public UI membutuhkan jauh lebih sedikit.

---

# 119. API CONTRACT ARCHITECTURE

Contract harus menjelaskan:

```text id="q7x4w5"
Request
Authentication
Authorization
Input
Output
Errors
Side effects
Audit requirement
```

---

# 120. MUTATION CATEGORIES

Xolvon mutations:

```text id="c7n1kp"
Auth
Course
Lesson
Media
Enrollment
Orders
Portfolio
Marketplace
Collective
Analytics
```

Setiap mutation menentukan server authority.

---

# 121. COURSE MUTATION FLOW

```text id="6v0yq3"
Create
↓
Validate
↓
Persist
↓
Return safe DTO
```

---

# 122. PUBLISH MUTATION FLOW

```text id="5f9s4l"
Admin
↓
Authenticate
↓
Authorize
↓
Validate required fields
↓
Validate media where required
↓
Publish
↓
Audit
```

---

# 123. UPLOAD MUTATION FLOW

```text id="8kx5m9"
Admin
↓
Authorize
↓
Validate metadata
↓
Generate signed PUT
↓
Client uploads
↓
Confirm
↓
Persist metadata
```

---

# 124. ACTIVATION MUTATION FLOW

```text id="1xepmf"
Admin
↓
Authorize
↓
Validate User
↓
Validate Course
↓
Validate Order
↓
Check current Enrollment
↓
Activate
↓
Audit
```

---

# 125. REVOKE MUTATION FLOW

```text id="8mq8f0"
Admin
↓
Authorize
↓
Find enrollment
↓
Set revoked
↓
Record revocation
↓
Audit
```

---

# 126. PROGRESS MUTATION FLOW

```text id="d3j2a3"
User
↓
Authenticate
↓
Validate enrollment
↓
Validate lesson ↔ course
↓
Update progress
```

---

# 127. PROJECT MUTATION FLOW

```text id="f5ggz1"
Admin
↓
Authorize
↓
Validate Project
↓
Persist
↓
Assign Team
↓
Publish if requested
↓
Audit
```

---

# 128. MARKETPLACE MUTATION FLOW

```text id="qf0xgo"
Admin
↓
Authorize
↓
Validate Listing
↓
Validate External URL
↓
Persist
↓
Publish
↓
Audit
```

External URL governance remains an open product/technical decision.

---

# 129. COLLECTIVE MUTATION FLOW

```text id="i70pab"
Admin
↓
Authorize
↓
Validate Member
↓
Persist
↓
Assign Projects
↓
Publish
↓
Audit
```

---

# 130. REQUEST FLOW — PUBLIC COURSE

```text id="6k4t2o"
Browser
↓
GET /course
↓
Route
↓
Course Service
↓
Published Query
↓
Public DTO
↓
Server Render
↓
Browser
```

---

# 131. REQUEST FLOW — COURSE DETAIL

```text id="ew6xnc"
Browser
↓
/course/[slug]
↓
Resolve slug
↓
Published course lookup
↓
Safe public data
↓
Render detail
```

---

# 132. REQUEST FLOW — DASHBOARD

```text id="6gl5sg"
Browser
↓
/dashboard
↓
Session
↓
User Identity
↓
User Dashboard Service
↓
User-owned data
↓
Dashboard DTO
↓
Render
```

---

# 133. REQUEST FLOW — PREMIUM LESSON

```text id="qjo4pm"
Browser
↓
Lesson Route
↓
Session
↓
Enrollment Check
↓
Lesson Relationship Check
↓
Lesson Data
↓
Signed Media URL Request
↓
Temporary URL
↓
Browser Playback
```

---

# 134. REQUEST FLOW — ADMIN

```text id="8o80f0"
Browser
↓
/admin
↓
Session
↓
Role Check
↓
Admin Service
↓
Operational Data
↓
Admin DTO
↓
UI
```

---

# 135. CLIENT STATE ARCHITECTURE

Client state harus dibatasi pada:

```text id="elr96u"
interaction state
temporary UI state
form state
view state
```

Examples:

```text id="1zk7j7"
menuOpen
modalOpen
selectedTab
carouselIndex
searchInput
```

---

# 136. SERVER STATE

Server state:

```text id="7n9q1a"
users
courses
lessons
orders
enrollments
progress
projects
marketplace
collective
```

tidak boleh diperlakukan sebagai authoritative local state.

---

# 137. LOCAL STORAGE RULE

`localStorage` tidak boleh menjadi source of truth untuk:

```text id="ij2h04"
role
permissions
enrollment
payment
premium access
account identity
```

---

# 138. URL STATE

URL boleh digunakan untuk:

```text id="0pohh8"
search query
filter
sort
public navigation state
```

sesuai PRD.

Contoh:

```text id="f6fvsv"
/course?q=automation
/portfolio?q=ai&sort=latest
/marketplace?q=crm&sort=latest
```

---

# 139. FORM STATE

Form state dapat berada di client selama:

```text id="8r33lk"
final validation
+
mutation authority
```

berada di server.

---

# 140. OPTIMISTIC UI

Optimistic UI hanya digunakan apabila:

```text id="ybnyqd"
safe
reversible
does not violate business state
```

Jangan optimistically menganggap:

```text id="3qknc5"
payment verified
enrollment active
admin authorization
```

tanpa server confirmation.

---

# 141. CACHE INVALIDATION PRINCIPLE

Setelah mutation:

```text id="m9pz0g"
Create
Update
Publish
Unpublish
Activate
Revoke
```

data stale yang relevan harus diperbarui/revalidated.

Exact revalidation mechanism mengikuti runtime architecture.

---

# 142. PUBLIC CACHE INVALIDATION

Publish Course:

```text id="3x9a9s"
Admin publishes course
↓
Course catalog stale
↓
Revalidate/update public data
```

---

# 143. USER CACHE INVALIDATION

Activation:

```text id="0qjqud"
Admin activates
↓
User Dashboard stale
↓
Next request sees active enrollment
```

---

# 144. REVOKE CACHE INVALIDATION

Revoke:

```text id="j5rptq"
Admin revoke
↓
User access state stale
↓
Next protected request rechecks server
```

Protection tidak boleh hanya mengandalkan frontend cache invalidation.

---

# 145. SECURITY RE-CHECK RULE

Setiap request ke protected resource harus dapat memvalidasi current authority.

Jangan:

```text id="n1r7dv"
user accessed once
→
assume forever authorized
```

---

# 146. SEARCH ARCHITECTURE

Search:

```text id="4h6zcl"
Browser
↓
Search route/service
↓
Server query
↓
Filter published/public
↓
Results DTO
↓
UI
```

---

# 147. SEARCH PERFORMANCE

D1 index strategy harus dipikirkan pada frequently filtered/joined columns.

Untuk data besar, FTS5 dapat dipertimbangkan.

Handbook menyebut D1 FTS5 sebagai opsi untuk search yang berkembang dan memperingatkan penggunaan leading wildcard tanpa benchmark pada scale besar.

---

# 148. SEARCH QUERY SAFETY

Search term user-controlled.

Harus:

```text id="h6f7xa"
parameterized
validated
sanitized appropriately
```

---

# 149. PUBLIC SLUG RESOLUTION

Detail route:

```text id="y6nyxz"
/course/[slug]
```

flow:

```text id="7x6r1q"
slug
↓
server lookup
↓
published/public check
↓
render
```

---

# 150. ADMIN SLUG MANAGEMENT

Slug creation/editing harus mempertimbangkan:

```text id="k7ikne"
uniqueness
URL stability
SEO
existing sharing
```

Changing slug dapat menjadi breaking public URL change dan harus ditangani dengan hati-hati.

---

# 151. 404 ON UNPUBLISHED

Jika content unpublished:

```text id="8nux8v"
Public Detail
→
not found / 404
```

sesuai product requirement.

---

# 152. ADMIN PREVIEW

Preview draft dapat menjadi admin-only capability.

Namun preview architecture harus tetap menghormati server authorization.

---

# 153. PREVIEW SECURITY

Draft preview:

```text id="m9y1kg"
admin-only
```

tidak boleh menjadi public URL yang dapat diakses siapa saja.

---

# 154. COMPONENT DATA FLOW

Public:

```text id="w8gswj"
Server Data
↓
DTO
↓
Server Component
↓
Client Component if interactive
```

---

# 155. ADMIN COMPONENT DATA FLOW

```text id="h5s8fk"
Admin Server Data
↓
Admin DTO
↓
Admin Table/Form
↓
Server Mutation
```

---

# 156. TABLE ARCHITECTURE

Admin tables dapat menangani:

```text id="b55o8w"
pagination if needed
sorting
filter
search
bulk operations if approved
row actions
status
```

Pagination is an implementation decision if/when needed; it is not a reason to invent a product requirement.

---

# 157. BULK ACTION ARCHITECTURE

Bulk action hanya boleh ditambahkan apabila:

```text id="xgjjcb"
product requires
backend supports
authorization defined
audit implications handled
```

---

# 158. FILE UPLOAD VALIDATION

Before issuing upload URL:

```text id="m9ol4a"
Authentication
↓
Admin role
↓
MIME validation
↓
Extension validation
↓
Size validation
↓
Intended prefix
↓
Generated key
```

---

# 159. FILE CONFIRMATION

Upload success di browser tidak otomatis berarti database record valid.

Server harus memiliki confirmation path bila metadata perlu dicatat.

---

# 160. MEDIA REPLACEMENT

Replacement media harus mempertimbangkan:

```text id="7a9z5p"
old object
new object
references
visibility
cleanup
```

Do not silently orphan large objects.

Exact cleanup strategy can be defined in implementation.

---

# 161. ADMIN DELETE ARCHITECTURE

Delete adalah destructive mutation.

Flow:

```text id="d8r6vz"
UI Confirmation
↓
Server Authorization
↓
Validation
↓
Mutation
↓
Audit if required
↓
Safe response
```

---

# 162. AUDIT ARCHITECTURE

Operationally important mutation:

```text id="yyv4ce"
publish
delete
activate
revoke
role change
```

must be traceable.

---

# 163. AUDIT ACTOR

Audit actor:

```text id="mc2s0e"
authenticated admin
```

bukan:

```text id="x9z55q"
browser-provided actor ID
```

---

# 164. ADMIN ROLE CHANGE

Role change harus:

```text id="1ldm1g"
server-authorized
auditable
```

Role tidak boleh diubah melalui public registration.

---

# 165. FIRST ADMIN BOOTSTRAP

Mechanism final belum ditentukan.

Karena merupakan security-critical open decision:

```text id="8pr6xj"
DO NOT CREATE PUBLIC ADMIN REGISTRATION
```

Mechanism harus berasal dari controlled bootstrap procedure.

---

# 166. SECURITY BOUNDARY SUMMARY

Never trust:

```text id="d20t53"
UI state
hidden route
localStorage
query parameter
URL obscurity
client role
client enrollment
client payment state
```

Trust:

```text id="2y8p1z"
server-validated identity
server authorization
server database state
server-generated entitlement
server-generated signed URL
```

---

# 167. PERFORMANCE RULE

Architecture harus menghindari:

```text id="dcth8p"
unnecessary client JavaScript
unnecessary database queries
unnecessary media proxy
unnecessary dependencies
large default assets
```

Handbook secara eksplisit meminta optimasi payload, route latency, D1 query count, Worker CPU, dan upload/download behavior.

---

# 168. MEDIA PERFORMANCE

Jangan:

```text id="xem0a7"
download entire premium video
→
Worker
→
Browser
```

Gunakan direct-to-storage/signed URL architecture.

---

# 169. IMAGE PERFORMANCE

Public image:

```text id="3fn2hi"
responsive
appropriate size
lazy-load when relevant
```

Avoid huge hero assets as default.

---

# 170. CLIENT JAVASCRIPT BUDGET PRINCIPLE

Do not make a component Client Component unless interaction requires it.

Prefer:

```text id="y6v50k"
server-rendered HTML
+
small interactive islands
```

ketika sesuai architecture.

---

# 171. DEPENDENCY ARCHITECTURE

Every dependency adds:

```text id="7w8f9v"
bundle impact
security surface
maintenance cost
runtime compatibility
```

Dependency additions should have explicit reason.

---

# 172. NO DUPLICATE LIBRARIES

Jangan menggunakan:

```text id="jk5e80"
3 icon libraries
2 date libraries
2 modal libraries
2 form libraries
```

untuk fungsi yang sama tanpa strong reason.

---

# 173. TESTING ARCHITECTURE

Tests dikelompokkan:

```text id="w8kexr"
Unit
Integration
Security
Acceptance
Responsive / Visual
```

---

# 174. UNIT TEST

Untuk logic yang dapat dipisahkan:

```text id="5s1tbt"
validation
formatting
state derivation
utility logic
```

---

# 175. INTEGRATION TEST

Untuk:

```text id="m70i2t"
service
D1
auth
R2
server action
```

interactions.

---

# 176. SECURITY TEST

Minimum:

```text id="4dz1f3"
unauthenticated dashboard
user → admin mutation
user without enrollment → premium media
revoked enrollment → premium media
IDOR
upload outside prefix
invalid type/size
```

Handbook menetapkan security acceptance checks tersebut.

---

# 177. ACCEPTANCE TEST

Critical flows:

```text id="hm2r6f"
Guest → Course → Register → Checkout → WhatsApp → Admin Verify → Activate → Dashboard → Lesson → Video

Admin → /67 → Login → Create Course → Upload Video → Publish

Admin → Create Project → Assign Collective → Publish

Admin → Create Marketplace → Publish → External SaaS

User → Search → Filter → Detail
```

---

# 178. LOCAL QUALITY GATE

Before PR:

```text id="m2plq7"
application runs
no relevant terminal errors
core flow works
responsive behavior checked
affected existing flow works
```

---

# 179. BUILD QUALITY GATE

Before merge:

```text id="4sjl9g"
typecheck
lint
build
tests
```

as applicable to repository setup.

---

# 180. PR QUALITY GATE

PR must explain:

```text id="p8khiy"
What changed?
Why?
How tested?
Screenshots if UI changed
Known limitations
Breaking changes
```

---

# 181. ARCHITECTURE CHANGE RULE

Changing architecture requires:

```text id="89h19f"
Problem
↓
Proposal
↓
Impact analysis
↓
Review
↓
ARCHITECTURE.md update
↓
Implementation
```

---

# 182. SHARED LAYER CHANGE RULE

Changing:

```text id="v9v6n8"
auth
db
r2
permissions
shared UI
server action pattern
```

must be reviewed carefully because multiple modules may depend on it.

---

# 183. FEATURE ISOLATION

Feature branch should avoid unrelated changes.

Example:

```text id="5b8h6o"
feature/course-catalog
```

should not silently change:

```text id="ey16ub"
auth
footer
marketplace
database architecture
```

unless necessary and documented.

---

# 184. AI ARCHITECTURE PROTOCOL

AI Coding Agent must follow:

```text id="fzq4as"
Read
↓
Inspect
↓
Map
↓
Reuse
↓
Implement
↓
Test
↓
Report
```

---

# 185. AI MUST READ ARCHITECTURE BEFORE CODING

Before a major task:

```text id="y1prly"
RULES.md
PRD.md
SCHEMA.md
DESIGN.md
ARCHITECTURE.md
```

must be understood.

---

# 186. AI MUST MAP THE TASK

Before editing:

```text id="7i9p2s"
Which route?
Which feature?
Which components?
Which data?
Which service?
Which architecture boundary?
Which tests?
```

---

# 187. AI MUST IDENTIFY CLIENT/SERVER

Before creating a component, AI must determine:

```text id="x5q7j9"
Server Component?
Client Component?
Server Action?
Service?
Data access?
```

Do not default everything to Client Component.

---

# 188. AI MUST NOT BYPASS LAYERS

AI must not create shortcuts like:

```text id="k6rf8h"
Component
↓
D1
```

or:

```text id="v8t8yr"
Component
↓
R2 credentials
```

or:

```text id="p6r0tm"
Client role
↓
Admin mutation
```

---

# 189. AI SERVICE REUSE

If a service already exists:

```text id="j7c9wy"
reuse
```

Don't create:

```text id="btt3v4"
getCoursesV2
getCoursesNew
getCourseDataFinal
```

without architectural reason.

---

# 190. AI DATA ACCESS REUSE

If D1 query logic already exists:

```text id="l38xby"
reuse / extend
```

instead of duplicating it inside pages.

---

# 191. AI SHARED COMPONENT REUSE

If existing primitive exists:

```text id="06p8p6"
reuse
```

not:

```text id="5v9h84"
custom button
```

for every feature.

---

# 192. AI NEW FILE RULE

New file harus memiliki:

```text id="07kxx0"
clear responsibility
correct location
named relationship to feature
```

---

# 193. AI ARCHITECTURE RED FLAG

AI should stop and flag when it sees:

```text id="s6c5i8"
"use client" added without interaction need
database import into client file
R2 credential in UI
role check only in client
localStorage as entitlement
fake fallback data
duplicate service
massive component
new dependency without reason
```

---

# 194. NO GIANT COMPONENT RULE

Jika component melebihi reasonable responsibility:

```text id="2n4zq6"
split by responsibility
```

Contoh:

```text id="dbzzk6"
CoursePage
├── CourseHeader
├── CourseOverview
├── LessonList
├── CourseResources
└── CheckoutSection
```

---

# 195. NO GIANT SERVICE RULE

Service juga tidak boleh menjadi dumping ground.

Contoh:

```text id="qtpyvf"
courseService
```

jangan sekaligus mengurus:

```text id="e9l8c4"
courses
users
payments
R2
analytics
```

tanpa alasan.

---

# 196. DOMAIN BOUNDARY

Conceptual domains:

```text id="r6iw8z"
Auth
Course
Learning
Payment
Portfolio
Marketplace
Collective
Admin
Media
Analytics
```

Business logic sebaiknya berada dalam domain yang relevan.

---

# 197. CROSS-DOMAIN ACCESS

Cross-domain access diperbolehkan jika memang diperlukan.

Contoh:

```text id="nx7v1k"
Enrollment
→ Course

Progress
→ Lesson
```

Tetapi dependency harus jelas.

---

# 198. CIRCULAR DEPENDENCY RULE

Hindari:

```text id="2w55b7"
Course Service
→ Marketplace Service
→ Course Service
```

Service graph harus tetap understandable.

---

# 199. IMPORT DIRECTION

Conceptual dependency:

```text id="cwv1mo"
UI
↓
Feature
↓
Application
↓
Data Access
↓
Infrastructure
```

Infrastructure tidak boleh bergantung pada UI.

---

# 200. NO UPWARD DEPENDENCY

Contoh buruk:

```text id="f8s7ct"
lib/db
→
components/course
```

Database layer tidak boleh mengetahui UI.

---

# 201. SERVER-ONLY IMPORT RULE

Server-only module harus tidak dapat masuk client bundle.

Gunakan architecture/tooling pattern yang menandai server-only modules jika appropriate.

---

# 202. ENVIRONMENT-SPECIFIC LOGIC

Jangan menyebarkan:

```text id="4t73y0"
if production
if staging
```

ke seluruh application.

Centralize environment configuration.

---

# 203. CONFIGURATION LAYER

Configuration concept:

```text id="i7o5n4"
environment
runtime
domain
feature flags if approved
external URLs
bindings
```

harus memiliki satu location/pattern.

---

# 204. FEATURE FLAG RULE

Feature flag bukan alasan untuk meng-hardcode business decision.

Jika digunakan:

```text id="s3h1st"
server-aware
documented
temporary when appropriate
```

---

# 205. OPEN DECISION ARCHITECTURE

Technical open decisions tidak boleh diselesaikan diam-diam.

Minimum current open items:

```text id="1gtr5n"
Runtime / Adapter
Auth Library
Password Hashing
QR / Payment Mechanism
Payment Proof Storage
Assignment Workflow
Admin Bootstrap
External SaaS URL Governance
Analytics Provider
```

Handbook mencatat item-item tersebut sebagai knowledge-hole/open decisions.

---

# 206. DECISION LOG

Format:

```text id="r5v0l2"
Decision ID:
-

Problem:
-

Options:
-

Decision:
-

Owner:
-

Date:
-

Affected Systems:
-

Migration / Rollout:
-

Rollback:
-
```

---

# 207. RUNTIME DECISION REQUIREMENT

Sebelum deployment architecture dianggap final:

```text id="k5x8n0"
[ ] Runtime selected
[ ] Adapter selected
[ ] D1 bindings tested
[ ] R2 bindings tested
[ ] Auth/session tested
[ ] Server Actions/API tested
[ ] Local parity tested
[ ] Staging parity tested
[ ] Production path tested
```

---

# 208. ARCHITECTURE DOCUMENTATION RULE

Jika code implementation berubah secara meaningful, documentation harus tetap mencerminkan architecture aktual.

Jangan membuat:

```text id="o8q1h7"
documentation = architecture A
code = architecture B
```

---

# 209. DEPRECATED ARCHITECTURE

Jika pattern lama tidak digunakan:

```text id="p2h5ti"
mark deprecated
```

dan tentukan migration path.

Jangan meninggalkan dua architecture aktif untuk concept yang sama tanpa alasan.

---

# 210. MIGRATION RULE

Architecture migration:

```text id="9zwr0v"
Current
↓
Target
↓
Compatibility
↓
Migration
↓
Verification
↓
Remove old path
```

---

# 211. ROLLBACK PRINCIPLE

Setiap production architecture change yang consequential harus memiliki rollback understanding.

Minimal:

```text id="gcq56k"
What changed?
How to detect failure?
How to revert?
Who knows rollback?
```

Handbook mensyaratkan setidaknya dua developer mengetahui rollback path sebelum production.

---

# 212. PRODUCTION DEPLOYMENT GATE

Sebelum production:

```text id="t8r48u"
D1 migration verified
R2 verified
CORS verified
Signed URL verified
Admin bootstrap verified
Domain verified
Canonical verified
SEO verified
Error monitoring verified
Rollback verified
```

---

# 213. CORS ARCHITECTURE

R2 browser upload/download memerlukan CORS yang sesuai origin application.

Exact policy mengikuti deployment environment.

---

# 214. ORIGIN CONSISTENCY

Origin yang digunakan untuk:

```text id="68i9bd"
application
CORS
canonical
OAuth/auth flow if applicable
signed upload/download
```

harus konsisten.

---

# 215. EXTERNAL SERVICE BOUNDARY

External systems:

```text id="hhbrve"
WhatsApp
External SaaS Websites
Potential Analytics Provider
```

harus diperlakukan sebagai integration boundary.

---

# 216. WHATSAPP ARCHITECTURE

WhatsApp digunakan pada V1 untuk:

```text id="2bq6oo"
payment coordination
password recovery/support
```

Payment flow manual tetap:

```text id="4d2sz8"
Checkout
→
WhatsApp
→
Admin Verification
→
Activation
```

Founder requirement menetapkan flow ini.

---

# 217. WHATSAPP LINK GENERATION

Frontend dapat membuat user-facing WhatsApp action berdasarkan approved data.

Namun:

```text id="09wm0b"
payment verification
+
activation
```

tetap terjadi melalui admin/server flow.

---

# 218. EXTERNAL SAAS REDIRECT

Marketplace CTA:

```text id="6xex9d"
Marketplace
→
External SaaS
```

External destination harus berasal dari managed content.

---

# 219. EXTERNAL URL SAFETY

Do not trust arbitrary user-submitted redirect URLs.

Admin-managed URL should undergo appropriate validation.

Final URL governance remains open decision.

---

# 220. SSR / RENDERING PRINCIPLE

Public content should favor server rendering / server-safe rendering where it improves:

```text id="x7m1i5"
SEO
performance
initial load
content discoverability
```

---

# 221. CLIENT RENDERING PRINCIPLE

Client rendering should be used for:

```text id="8uxq5a"
interaction
stateful UI
browser-only logic
```

not by default for all pages.

---

# 222. RENDERING VS SECURITY

Server rendering does not automatically make data safe.

Security still depends on:

```text id="r4zyx0"
authorization
data filtering
safe DTO
```

---

# 223. SAFE DATA FETCHING

Before returning private data:

```text id="b6u9xk"
authenticate
authorize
validate ownership/entitlement
then fetch/return
```

---

# 224. PRIVATE DATA NEVER PRELOADED PUBLICLY

Don't preload:

```text id="tw1l2x"
user dashboard
private lesson
admin records
```

into HTML accessible to unauthorized public visitors.

---

# 225. ADMIN DATA IS NOT PUBLIC DATA

Admin route should never be treated as another public route with hidden navigation.

---

# 226. SECURITY BY ROUTE + ACTION

Protection must exist both at:

```text id="fqko2b"
route boundary
+
mutation/action boundary
```

Route protection alone is insufficient.

---

# 227. SERVER ACTION SECURITY

Even if only admin UI can call it, every sensitive server action must independently validate:

```text id="k4t6ev"
session
role
input
target resource
```

---

# 228. SERVER ACTION OWNERSHIP

Example:

```text id="i6n9wo"
revokeEnrollment(enrollmentId)
```

server must determine which enrollment is being modified and whether current admin is authorized.

---

# 229. ADMIN AUDIT SIDE EFFECT

Operational mutation should generate audit event where required.

---

# 230. SAFE FAILURE PRINCIPLE

When architecture cannot safely determine:

```text id="x4m7fz"
who is authorized
what state exists
what resource is targeted
```

default:

```text id="gkp0p5"
DENY
```

rather than:

```text id="d2zjyq"
ALLOW
```

---

# 231. FAIL-CLOSED RULE

Security-sensitive operation should fail closed.

Examples:

```text id="0vvx9q"
unknown session
unknown role
unknown entitlement
invalid object metadata
invalid target
```

should not result in privileged action.

---

# 232. DEFAULT DENY

If permission is not explicitly granted:

```text id="7i7u5l"
DENY
```

Do not infer permission from absence of restriction.

---

# 233. PRODUCT V1 ARCHITECTURE

Core architecture must support:

```text id="dzl0r1"
Home
Portfolio
Course
Marketplace
Collective
Auth
Dashboard
Admin
D1
R2
Manual Payment
Protected Media
Search
```

---

# 234. V2 SHOULD NOT POLLUTE V1

Do not implement architecture prematurely for:

```text id="7ynxk0"
real-time chat
community
advanced recommendation engine
central SaaS billing
complex certificate engine
```

unless requirement changes.

---

# 235. SIMPLE-FIRST RULE

When two architectures satisfy the requirement:

```text id="7v3r5m"
prefer the simpler architecture
```

provided:

```text id="1cbmni"
security
correctness
performance
maintainability
```

remain adequate.

---

# 236. NO OVER-ENGINEERING

Don't build:

```text id="v2ko4d"
microservices
event bus
message broker
complex state machine
custom CMS engine
```

for V1 unless actually required.

---

# 237. NO UNDER-ENGINEERING

At the same time, do not simplify away:

```text id="oln5mj"
authorization
validation
data integrity
private media
audit
migration
error handling
```

---

# 238. ARCHITECTURE BALANCE

Target:

```text id="onqdp7"
Simple enough to ship
+
Strong enough to trust
```

---

# 239. TEAM HANDOFF RULE

Developer A harus dapat memahami hasil Developer B tanpa personal explanation.

Artinya code harus mengikuti:

```text id="7y4pl0"
PRD
SCHEMA
DESIGN
ARCHITECTURE
RULES
```

bukan:

```text id="zpw5cb"
"cara gue sendiri."
```

---

# 240. CROSS-TEAM CONTRACT

Frontend harus mengetahui:

```text id="4d0w0a"
data contract
endpoint contract
auth requirement
error contract
```

Backend harus mengetahui:

```text id="5pkhl5"
UI expectation
```

Database harus mengetahui:

```text id="g8r1ou"
relational contract
```

---

# 241. CROSS-REVIEW

No direct merge into `main`.

Review harus memeriksa minimal:

```text id="el8o0u"
product behavior
architecture
security
data contract
UI regression
```

Cross-review requirement berasal dari Master PRD/Handbook.

---

# 242. ARCHITECTURE OWNERSHIP

Architecture ownership berada pada WebDev Lead/technical owner.

Feature owner boleh mengusulkan perubahan.

Feature owner tidak boleh mengubah global architecture secara diam-diam.

---

# 243. DATABASE OWNERSHIP

DB/domain changes direview oleh responsible DB/Backend owner.

---

# 244. SECURITY OWNERSHIP

Security-critical changes direview oleh responsible Backend/Security owner.

Contoh:

```text id="4y8olw"
auth
session
password hash
permissions
signed URLs
admin bootstrap
```

---

# 245. DESIGN OWNERSHIP

Shared design changes direview terhadap `DESIGN.md`.

---

# 246. AI OWNERSHIP

AI Coding Agent:

```text id="lq7v7m"
executes
```

AI tidak:

```text id="u2v7ie"
own product decisions
own security decisions
own architecture decisions
```

---

# 247. AI ARCHITECTURE CHANGE PROTOCOL

Jika AI merasa membutuhkan architecture change:

```text id="5o2duw"
STOP
↓
Explain why
↓
Identify affected layers
↓
Propose change
↓
Wait for approved decision
```

AI tidak boleh silently refactor architecture.

---

# 248. AI OPEN DECISION PROTOCOL

Jika requirement tidak cukup:

```text id="t3ff6l"
OPEN DECISION
```

AI harus menyebut:

```text id="qhc18l"
what is missing
what assumptions would be required
what parts are affected
```

---

# 249. AI MINIMUM CHANGE PRINCIPLE

AI harus memilih:

```text id="a6or8w"
smallest architecture-preserving change
```

bukan:

```text id="3bhtdj"
largest rewrite that seems cleaner
```

---

# 250. AI ARCHITECTURE RED FLAGS

AI harus flag apabila task menyebabkan:

```text id="x7q2g9"
new database access from UI
new server/client boundary violation
new global dependency
duplicate service
duplicate state source
new auth logic
new permission logic
new schema field
new entity
new route
new business rule
```

tanpa corresponding contract update.

---

# 251. DOCUMENT SYNCHRONIZATION

Jika code membutuhkan perubahan pada:

```text id="m6t8y0"
PRD
SCHEMA
DESIGN
ARCHITECTURE
RULES
```

dokumentasi terkait harus diperbarui.

---

# 252. SOURCE-OF-TRUTH FLOW

Final development context:

```text id="o6j9iz"
RULES
↓
PRD
↓
SCHEMA
↓
DESIGN
↓
ARCHITECTURE
↓
Code
```

---

# 253. IMPLEMENTATION FLOW

Developer starts task:

```text id="de89rs"
1. Read contracts
2. Identify requirement
3. Identify route
4. Identify data
5. Identify architecture boundary
6. Identify component
7. Implement
8. Test
9. Review
10. Update docs if needed
```

---

# 254. NO CODE BEFORE CONTEXT

For significant task:

```text id="ozv6l0"
Do not start coding before understanding relevant contracts.
```

---

# 255. ARCHITECTURE QUALITY GATE

A feature is architecture-complete when:

```text id="o6jp2o"
[ ] Correct route
[ ] Correct layer
[ ] Correct server/client boundary
[ ] Correct data source
[ ] Correct authorization
[ ] Correct validation
[ ] Correct error handling
[ ] Correct cache behavior
[ ] No secret leakage
[ ] No duplicate source of truth
[ ] No unnecessary dependency
[ ] Existing architecture remains understandable
```

---

# 256. SECURITY QUALITY GATE

```text id="a5nrb4"
[ ] Auth enforced
[ ] Role enforced where required
[ ] Ownership enforced
[ ] Enrollment enforced
[ ] IDOR checked
[ ] Sensitive data filtered
[ ] Secrets server-only
[ ] R2 private media protected
[ ] Signed URL short-lived
[ ] Input validated
[ ] SQL parameterized
```

---

# 257. PERFORMANCE QUALITY GATE

```text id="6h8k7u"
[ ] No unnecessary client component
[ ] No unnecessary dependency
[ ] No giant asset
[ ] No excessive DB query
[ ] No unnecessary R2 proxy
[ ] Images optimized
[ ] Search reasonable
[ ] Route response reasonable
```

---

# 258. DEPLOYMENT QUALITY GATE

```text id="4d4ur6"
[ ] Local works
[ ] Staging works
[ ] D1 verified
[ ] R2 verified
[ ] Auth verified
[ ] Signed URLs verified
[ ] CORS verified
[ ] Secrets configured
[ ] Domain verified
[ ] SEO verified
[ ] Monitoring verified
[ ] Rollback understood
```

---

# 259. FINAL ARCHITECTURE MAP

```text id="c70szt"
                       XOLVON.COM
                           │
             ┌─────────────┴─────────────┐
             │                           │
          PUBLIC                      AUTHENTICATED
             │                           │
      ┌──────┴──────┐             ┌──────┴───────┐
      │             │             │              │
    READ          SEARCH       USER           ADMIN
      │             │             │              │
      └──────┬──────┘             │              │
             │                    │              │
             ▼                    ▼              ▼
        APPLICATION           APPLICATION    APPLICATION
             │                    │              │
             └────────────┬───────┴──────┬───────┘
                          │              │
                          ▼              ▼
                       SECURITY      VALIDATION
                          │              │
                          └───────┬──────┘
                                  │
                   ┌──────────────┴──────────────┐
                   │                             │
                   ▼                             ▼
                  D1                             R2
             relational data               object storage
                   │                             │
                   │                      ┌──────┴──────┐
                   │                      │             │
                   │                   public        private
                   │                                    │
                   │                                    ▼
                   │                              signed URL
                   │                                    │
                   └──────────────┬─────────────────────┘
                                  ▼
                               Browser
```

---

# 260. FINAL ARCHITECTURAL PRINCIPLES

### Principle 1

> **Client is not trusted.**

### Principle 2

> **Server owns security-sensitive truth.**

### Principle 3

> **D1 owns relational truth.**

### Principle 4

> **R2 owns object storage.**

### Principle 5

> **PRD owns product behavior.**

### Principle 6

> **SCHEMA owns data contract.**

### Principle 7

> **DESIGN owns visual language.**

### Principle 8

> **ARCHITECTURE owns implementation boundary.**

### Principle 9

> **RULES owns developer/AI behavior.**

---

# 261. THE FIVE-DOCUMENT SYSTEM

The five files together form:

```text id="6q5xua"
                    XOLVON ENGINEERING SYSTEM

                         RULES.md
                            │
                    What may / may not
                            │
                            ▼
                          PRD.md
                            │
                       What to build
                            │
                            ▼
                        SCHEMA.md
                            │
                       What data exists
                            │
                            ▼
                        DESIGN.md
                            │
                     How it looks/behaves
                            │
                            ▼
                     ARCHITECTURE.md
                            │
                    How it is implemented
                            │
                            ▼
                           CODE
```

---

# 262. ONE PRODUCT RULE

The final system must prevent:

```text id="ydscx2"
Developer A
→ builds one architecture

Developer B
→ builds another architecture

AI Agent
→ invents third architecture
```

Instead:

```text id="o2e07v"
Developer A
+
Developer B
+
Developer C
+
AI Agent

        ↓

Same
Rules
+
PRD
+
Schema
+
Design
+
Architecture
```

---

# 263. FINAL ARCHITECTURE MANTRA

> **Make boundaries obvious.**

> **Keep trust on the server.**

> **Keep data contracts explicit.**

> **Keep storage private when it should be private.**

> **Keep business logic out of UI.**

> **Keep UI out of infrastructure.**

> **Keep V1 simple.**

> **Keep architecture explainable.**

> **Never let convenience become security.**

---

# 264. FINAL DEFINITION OF ARCHITECTURE SUCCESS

Xolvon architecture dianggap berhasil apabila:

```text id="xq66cw"
A new developer can join
↓
Read the five .md files
↓
Understand where code belongs
↓
Understand what data exists
↓
Understand what page to build
↓
Understand how page should look
↓
Understand how data is accessed
↓
Understand what is protected
↓
Implement without guessing
```

dan AI Coding Agent dapat melakukan hal yang sama.

---

# 265. END OF ARCHITECTURE.md
