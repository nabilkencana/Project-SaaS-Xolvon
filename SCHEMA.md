# SCHEMA.md

# XOLVON.COM

## DATA SCHEMA & FRONTEND DATA CONTRACT

**Project:** Xolvon.com
**Organization:** PT Xolvon Kehidupan Cerdas Abadi
**Product:** AI Business Collective
**Document Type:** Database Schema + Data Contract
**Status:** Mandatory Contract
**Version:** V1
**Primary Consumers:** Frontend, Backend, Database, Security, QA, AI Coding Agent

---

# 0. PURPOSE

`SCHEMA.md` adalah **kontrak resmi struktur data Xolvon.com**.

Dokumen ini mendefinisikan:

* entity,
* field,
* type,
* required/optional state,
* nullable state,
* enum,
* relationship,
* ownership,
* visibility,
* public/client-safe representation,
* protected representation,
* state transition,
* identifier convention,
* search/filter capability,
* frontend data contract,
* mutation contract,
* validation expectation,
* consistency rules.

Tujuan utamanya:

> **FE tidak boleh mengasumsikan data yang tidak tersedia, dan BE tidak boleh mengirim data yang tidak seharusnya terlihat oleh FE.**

---

# 1. CORE DATA PRINCIPLE

Xolvon menggunakan satu prinsip utama:

```text
ONE SOURCE OF TRUTH
```

Data tidak boleh memiliki dua sumber kebenaran yang berbeda.

Contoh:

```text
Course Price
```

harus berasal dari:

```text
Course Data
```

bukan:

```text
Course Data
+
Hardcoded Frontend Price
```

Demikian pula:

```text
Project Team
```

berasal dari:

```text
Project ↔ Project Member ↔ Collective Member
```

bukan array hardcoded di component.

---

# 2. SCHEMA RESPONSIBILITY

`SCHEMA.md` mengatur:

```text
WHAT DATA EXISTS
```

`PRD.md` mengatur:

```text
WHAT PRODUCT DOES
```

`DESIGN.md` mengatur:

```text
HOW DATA IS PRESENTED
```

`ARCHITECTURE.md` mengatur:

```text
HOW DATA FLOWS THROUGH SYSTEM
```

`RULES.md` mengatur:

```text
WHAT DEVELOPERS / AI MAY OR MAY NOT DO
```

---

# 3. ABSOLUTE SCHEMA RULES

## Rule 1 — No Field Invention

Jika field tidak tercantum dalam schema:

```text
IT DOES NOT EXIST
```

FE tidak boleh mengasumsikannya.

---

## Rule 2 — No Client-Owned Truth

Frontend tidak menjadi sumber kebenaran untuk:

* role,
* enrollment,
* payment status,
* access status,
* permission,
* ownership,
* premium entitlement.

---

## Rule 3 — No Sensitive Data Leakage

Data internal tidak boleh dikirim ke browser hanya karena:

> “frontend mungkin membutuhkannya nanti.”

Hanya field yang diperlukan oleh UI yang boleh dikirim.

---

## Rule 4 — Schema Changes Must Be Explicit

Penambahan/perubahan field membutuhkan:

```text
Schema Change
↓
Review
↓
Migration
↓
SCHEMA.md update
↓
Frontend / Backend update
```

Schema change dilakukan melalui migration SQL.

---

# 4. IDENTIFIER CONVENTION

Semua entity memiliki:

```text
id
```

Primary identifier harus:

```text
stable
unique
non-semantic
```

Public page menggunakan:

```text
slug
```

apabila entity memang ditujukan untuk public discovery.

Contoh:

```text
course.id
course.slug
```

Public URL:

```text
/course/[slug]
```

bukan:

```text
/course/[id]
```

Handbook juga menetapkan bahwa slug stabil digunakan untuk public detail/share/SEO.

---

# 5. TIMESTAMP CONVENTION

Entity yang memiliki lifecycle biasanya menggunakan:

```text
created_at
updated_at
```

Waktu harus disimpan dalam format yang konsisten di seluruh system.

Frontend tidak boleh mengubah timestamp menjadi business state.

Contoh:

```text
created_at
```

bukan:

```text
is_new = true
```

kecuali field tersebut memang didefinisikan.

---

# 6. VISIBILITY CLASSIFICATION

Setiap field harus dianggap memiliki salah satu kategori berikut:

```text
PUBLIC
USER-PROTECTED
ADMIN-PROTECTED
SERVER-ONLY
```

## PUBLIC

Aman digunakan pada public pages.

## USER-PROTECTED

Hanya user yang authenticated dan memiliki entitlement yang sesuai.

## ADMIN-PROTECTED

Hanya admin.

## SERVER-ONLY

Tidak boleh dikirim ke browser.

---

# 7. FIELD VISIBILITY SYMBOL

Dokumen ini menggunakan:

```text
[PUB]
[USR]
[ADM]
[SRV]
```

Contoh:

```text
email [PUB]
password_hash [SRV]
role [SRV]
course.title [PUB]
enrollment.status [USR]
admin_audit_logs.metadata [ADM]
```

---

# 8. NULLABILITY CONVENTION

Field dapat memiliki:

```text
REQUIRED
OPTIONAL
NULLABLE
```

Makna:

### REQUIRED

Harus ada.

### OPTIONAL

Boleh tidak dikirim dalam context tertentu.

### NULLABLE

Nilai dapat secara eksplisit bernilai:

```text
null
```

Frontend tidak boleh menganggap:

```ts
string
```

apabila contract:

```ts
string | null
```

---

# 9. PRIMARY ENTITY MAP

V1 entity map:

```text
User
 │
 ├── Orders
 │     └── Order Items
 │
 ├── Enrollments
 │     └── Course
 │
 └── Progress
       └── Lesson

Course
 │
 ├── Lessons
 │     └── Resources
 │
 ├── Enrollments
 │
 └── Orders

Project
 │
 ├── Media
 │
 └── Members
       └── Collective Member

Collective Member
 │
 └── Projects

Marketplace Item
 │
 └── Media

Admin
 │
 └── Audit Logs
```

---

# 10. ENTITY: USERS

## Purpose

Menyimpan akun platform.

Database baseline menetapkan `users` sebagai akun + role.

## Fields

| Field           | Type            | Required | Visibility                | Description      |
| --------------- | --------------- | -------: | ------------------------- | ---------------- |
| `id`            | string          |      YES | internal/public reference | Unique user ID   |
| `name`          | string          |      YES | USER/ADMIN                | Display name     |
| `email`         | string          |      YES | USER/ADMIN                | Account email    |
| `phone`         | string          |      YES | USER/ADMIN                | Account phone    |
| `password_hash` | string          |      YES | SERVER-ONLY               | Password hash    |
| `role`          | enum            |      YES | SERVER-ONLY               | `user` / `admin` |
| `status`        | string          |      YES | SERVER-ONLY               | Status akun, default `active` |
| `email_verified`| integer (0/1)   |      YES | SERVER-ONLY               | Flag verifikasi email |
| `phone_verified`| integer (0/1)   |      YES | SERVER-ONLY               | Flag verifikasi phone |
| `created_at`    | datetime/string |      YES | ADMIN                     | Creation time    |
| `updated_at`    | datetime/string |      YES | ADMIN                     | Last update      |

---

# 11. USER ROLE ENUM

```text
user
admin
```

Tidak boleh ada FE-generated role:

```text
superadmin
moderator
editor
staff
```

kecuali schema secara resmi diperluas.

---

# 12. USER PUBLIC REPRESENTATION

Public UI tidak membutuhkan full User entity.

Public-safe representation:

```ts id="bxd3m0"
type PublicUser = {
  id: string
  name: string
}
```

Tidak termasuk:

```text
email
phone
password_hash
role
audit information
```

---

# 13. USER AUTHENTICATED REPRESENTATION

Authenticated user context dapat memerlukan:

```ts id="j9zglq"
type AuthenticatedUser = {
  id: string
  name: string
  email: string
  phone: string
}
```

Role hanya dikirim ketika memang dibutuhkan untuk rendering UI, dan bukan sebagai security source of truth.

---

# 14. ENTITY: COURSES

## Purpose

Master entity untuk educational product.

Baseline Course fields mencakup title, slug, description, price, thumbnail, status, dan timestamps.

## Fields

| Field           | Type            | Required | Visibility   | Description                |
| --------------- | --------------- | -------: | ------------ | -------------------------- |
| `id`            | string          |      YES | contextual   | Course ID                  |
| `title`         | string          |      YES | PUBLIC       | Course title               |
| `slug`          | string          |      YES | PUBLIC       | Public identifier          |
| `description`   | string          |      YES | PUBLIC       | Course description         |
| `price`         | number          |      YES | PUBLIC       | Course price               |
| `thumbnail_url` | string/null     |      YES | PUBLIC       | Public thumbnail reference |
| `status`        | enum            |      YES | PUBLIC/ADMIN | `draft`, `published`       |
| `created_at`    | datetime/string |      YES | ADMIN        | Created                    |
| `updated_at`    | datetime/string |      YES | ADMIN        | Updated                    |

---

# 15. COURSE STATUS

```text
draft
published
```

Optional internal transition:

```text
published
→
unpublished
```

Implementation boleh merepresentasikan unpublished melalui:

```text
status = draft
```

atau dedicated status jika kontrak database nantinya mengadopsinya.

Jangan menambahkan enum baru tanpa schema decision.

---

# 16. COURSE PUBLIC CONTRACT

Untuk Course Catalog:

```ts id="3zqlxw"
type CourseCardData = {
  id: string
  title: string
  slug: string
  description: string
  price: number
  thumbnailUrl: string | null
  status: "published"
}
```

Public catalog harus memfilter:

```text
status = published
```

---

# 17. COURSE DETAIL CONTRACT

Course Detail dapat menggunakan:

```ts id="5f0m7q"
type CourseDetailData = {
  id: string
  title: string
  slug: string
  description: string
  price: number
  thumbnailUrl: string | null
  status: "published"
  lessons: LessonSummary[]
}
```

Namun `lessons` hanya boleh berisi informasi yang aman untuk public discovery.

Jangan memasukkan:

```text
private video URL
signed URL
R2 credential
session data
```

---

# 18. ENTITY: LESSONS

## Purpose

Lesson adalah content unit langsung di bawah Course.

Struktur V1:

```text
Course
↓
Lesson
```

bukan:

```text
Course
↓
Chapter
↓
Section
↓
Lesson
```

Founder menetapkan Course → Lesson secara langsung untuk V1.

---

# 19. LESSON FIELDS

| Field              | Type            |     Required | Visibility                    | Description             |
| ------------------ | --------------- | -----------: | ----------------------------- | ----------------------- |
| `id`               | string          |          YES | contextual                    | Lesson ID               |
| `course_id`        | string          |          YES | internal                      | Parent course           |
| `title`            | string          |          YES | PUBLIC/USER                   | Lesson title            |
| `content`          | string          | YES/NULLABLE | USER                          | Lesson content          |
| `video_object_key` | string/null     |           NO | SERVER/USER via signed access | Private media reference |
| `order_index`      | number          |          YES | PUBLIC/USER                   | Lesson order            |
| `status`           | enum            |          YES | PUBLIC/ADMIN                  | Draft/published         |
| `created_at`       | datetime/string |          YES | ADMIN                         | Created                 |
| `updated_at`       | datetime/string |          YES | ADMIN                         | Updated                 |

---

# 20. LESSON STATUS

```text
draft
published
```

Public course detail boleh menunjukkan lesson metadata sesuai product requirement.

Premium content hanya accessible apabila user memiliki enrollment aktif.

---

# 21. LESSON PUBLIC SUMMARY

Public course detail:

```ts id="u3v7pd"
type LessonSummary = {
  id: string
  title: string
  orderIndex: number
  status: "published"
}
```

Tidak boleh mengandung:

```text
video_object_key
signed_url
private resource URL
```

---

# 22. LESSON USER CONTRACT

User dengan enrollment aktif dapat menerima:

```ts id="p1p4tp"
type LessonData = {
  id: string
  courseId: string
  title: string
  content: string | null
  orderIndex: number
  status: "published"
}
```

Media access dipisahkan dari lesson metadata.

---

# 23. PREMIUM MEDIA CONTRACT

Browser tidak langsung menerima:

```text
R2 credentials
```

Browser dapat menerima temporary media URL hanya setelah:

```text
authenticated
+
active enrollment
+
valid lesson relationship
```

Signed URL dibuat oleh server.

Handbook menetapkan short-lived signed URL untuk private R2 media.

---

# 24. ENTITY: COURSE RESOURCES

## Purpose

Menyimpan resource yang terkait dengan course atau lesson.

Types dapat mencakup:

```text
PDF
RESOURCE
ASSIGNMENT
```

Fields baseline:

```text
id
lesson_id / course_id
type
object_key / url
title
metadata
```

Handbook memasukkan `course_resources` sebagai entity terpisah.

---

# 25. RESOURCE TYPE

Baseline:

```text
pdf
resource
assignment
```

Jangan menambahkan:

```text
quiz
certificate
worksheet
audio
```

sebagai official type tanpa decision.

---

# 26. RESOURCE VISIBILITY

### Public

Metadata yang memang dimaksudkan untuk public course description.

### User Protected

Resource yang hanya boleh diakses enrollment aktif.

### Server

Object key/private storage metadata apabila tidak diperlukan oleh client.

---

# 27. ENTITY: ENROLLMENTS

## Purpose

Menyatakan hak user untuk mengakses Course.

Fields baseline:

| Field        | Type                 | Required |
| ------------ | -------------------- | -------: |
| `id`         | string               |      YES |
| `user_id`    | string               |      YES |
| `course_id`  | string               |      YES |
| `status`     | enum                 |      YES |
| `granted_at` | datetime/string      |      YES |
| `granted_by` | string/null          |      YES |
| `revoked_at` | datetime/string/null |      YES |

Baseline tersebut berasal dari Handbook schema.

---

# 28. ENROLLMENT STATUS

```text
active
revoked
```

Meaning:

### active

User memiliki course access.

### revoked

Access telah dicabut.

---

# 29. ENROLLMENT UNIQUE RULE

Satu user tidak boleh memiliki duplicate relationship:

```text
user_id
+
course_id
```

Handbook menyarankan unique constraint:

```sql
UNIQUE(user_id, course_id)
```

untuk mencegah enrollment ganda.

---

# 30. ENROLLMENT ENTITLEMENT RULE

```text
ACTIVE ENROLLMENT
=
COURSE ACCESS
```

```text
REVOKED ENROLLMENT
=
NO COURSE ACCESS
```

Frontend tidak boleh membuat entitlement berdasarkan:

```text
localStorage
URL parameter
button state
client state
```

---

# 31. ENROLLMENT USER CONTRACT

Client-safe representation:

```ts id="wz6f4b"
type EnrollmentSummary = {
  id: string
  courseId: string
  status: "active" | "revoked"
  grantedAt: string
}
```

`granted_by` tidak perlu dikirim ke user kecuali UI memang membutuhkan informasi tersebut.

---

# 32. ENTITY: ORDERS

## Purpose

Menyimpan transaction intent untuk Course purchase flow.

Fields baseline:

```text
id
user_id
status
amount
created_at
updated_at
```

Handbook menetapkan `orders` sebagai entity payment operation.

---

# 33. ORDER STATUS

Minimum product statuses:

```text
pending
paid
cancelled
```

Display-level terminology:

```text
PENDING
PAID / VERIFIED
CANCELLED
```

Jangan menambahkan:

```text
failed
refunded
chargeback
expired
```

sebagai official business state tanpa keputusan.

---

# 34. ORDER STATUS VS ENROLLMENT STATUS

Jangan menyamakan:

```text
order.status
```

dengan:

```text
enrollment.status
```

Contoh:

```text id="tjxovb"
Order:
PAID

Enrollment:
ACTIVE
```

adalah dua concept berbeda.

---

# 35. ORDER ITEM

## Fields

```text
id
order_id
course_id
price
```

`order_items` digunakan untuk menyimpan item spesifik yang dibeli.

---

# 36. ORDER RELATIONSHIP

```text
User
 ↓
Order
 ↓
OrderItem
 ↓
Course
```

Jika satu order hanya memiliki satu course pada V1, architecture tetap boleh mempertahankan `order_items` sebagai relational structure.

---

# 37. ORDER USER VISIBILITY

User dapat melihat informasi order yang memang terkait dengan dirinya.

User A:

```text
can read own orders
```

User A:

```text
cannot read User B orders
```

Hanya admin yang memiliki operational overview lintas user.

---

# 38. PAYMENT PROOF

Payment proof storage masih merupakan open decision.

Karena belum final, schema tidak boleh menganggap field berikut sudah resmi:

```text
payment_proof_url
payment_proof_object_key
payment_proof_image
```

Jangan membuat field tersebut sebagai production contract tanpa decision.

---

# 39. ENTITY: PROGRESS

## Purpose

Menyimpan progress pembelajaran.

Fields:

```text
id
user_id
course_id
lesson_id
completed
completed_at
updated_at
```

Handbook menetapkan field tersebut dalam conceptual schema.

---

# 40. PROGRESS CONTRACT

```ts id="qz1qs8"
type LessonProgress = {
  lessonId: string
  completed: boolean
  completedAt: string | null
  updatedAt: string
}
```

---

# 41. PROGRESS VALIDATION

Progress harus konsisten dengan:

```text
user
course
lesson
enrollment
```

Jangan menerima progress untuk:

```text
lesson yang bukan bagian course
```

atau:

```text
user tanpa enrollment aktif
```

---

# 42. PROGRESS STATE

```text
not_started
in_progress
completed
```

Namun database dapat menyimpan baseline:

```text
completed = boolean
```

State presentation dapat diturunkan dari data tersebut.

Jangan menambahkan field:

```text
percentage
watch_time
last_position
```

sebagai database contract tanpa keputusan.

---

# 43. ENTITY: PROJECTS

## Purpose

Master entity untuk Portfolio.

Fields baseline:

```text
id
title
slug
type
summary
problem
solution
tech_stack
result
status
created_at
updated_at
```

Handbook menetapkan entity project tersebut.

---

# 44. PROJECT STATUS

Baseline:

```text
draft
published
```

Public Portfolio hanya menggunakan:

```text
published
```

---

# 45. PROJECT TYPE

`type` merupakan category/content classification.

Exact enum belum dikunci pada source document.

Karena itu:

```text
DO NOT INVENT FINAL ENUM
```

Implementasi dapat sementara menggunakan controlled string sampai Product/DB mengunci daftar enum.

---

# 46. PROJECT PUBLIC CONTRACT

```ts id="v29m4u"
type ProjectCardData = {
  id: string
  title: string
  slug: string
  type: string
  summary: string
  status: "published"
}
```

---

# 47. PROJECT DETAIL CONTRACT

```ts id="76q7s4"
type ProjectDetailData = {
  id: string
  title: string
  slug: string
  type: string
  summary: string
  problem: string
  solution: string
  techStack: string[]
  result: string | null
  media: ProjectMedia[]
  members: ProjectMember[]
  status: "published"
}
```

`tech_stack` representation dapat disesuaikan dengan final database implementation.

---

# 48. PROJECT CONTENT ORDER

Portfolio detail harus dipresentasikan:

```text
Problem
↓
Solution
↓
Tech Stack
↓
Result
↓
Screenshot / Media
↓
Project Team
```

Sequence ini merupakan requirement founder.

---

# 49. ENTITY: PROJECT MEDIA

Fields baseline:

```text
id
project_id
object_key / url
media_type
sort_order
```

Handbook menetapkan `project_media`.

---

# 50. PROJECT MEDIA TYPE

Exact final enumeration belum dikunci.

Potential content from requirement:

```text
image
video
deck
```

Implementation final harus mengikuti schema decision.

Jangan membuat enum final hanya berdasarkan asumsi.

---

# 51. ENTITY: PROJECT MEMBERS

Project-member adalah relationship entity.

Fields:

```text
project_id
member_id
role
```

Handbook secara eksplisit menggunakannya untuk relasi many-to-many Project ↔ Collective Member.

---

# 52. PROJECT MEMBER ROLE

Requirement memberi contoh role:

```text
PM
FE
BE
Data
Design
QA
Ops
```

Role dapat berkembang.

Jangan mengunci exhaustive enum jika Product belum menyatakannya sebagai final.

---

# 53. PROJECT ↔ COLLECTIVE RELATIONSHIP

Relationship:

```text
Project
M ↔ N
Collective Member
```

Satu project:

```text
many members
```

Satu member:

```text
many projects
```

Role attribution wajib eksplisit.

---

# 54. ENTITY: COLLECTIVE MEMBERS

## Fields

```text
id
name
slug
photo
role
skills
bio
social_links
status
display_order
```

`display_order` (INTEGER, Schema V2): dipakai untuk mengurutkan tampilan member pada query halaman home.

Handbook menetapkan field tersebut sebagai baseline.

---

# 55. COLLECTIVE MEMBER PUBLIC CONTRACT

```ts id="s1zqye"
type CollectiveMember = {
  id: string
  name: string
  slug: string
  photo: string | null
  role: string
  skills: string[]
  bio: string | null
  socialLinks: SocialLink[]
  status: "published"
}
```

---

# 56. SOCIAL LINK CONTRACT

Baseline conceptual shape:

```ts id="9qqmyg"
type SocialLink = {
  platform: string
  url: string
}
```

Exact supported platform enum belum dikunci.

Jangan mengasumsikan hanya:

```text
Instagram
LinkedIn
GitHub
Twitter
```

sebagai official set.

---

# 57. COLLECTIVE PRIVACY RULE

Public Collective tidak boleh menampilkan:

```text
personal email
personal phone
password
internal account details
admin data
```

Founder requirement memang membatasi public member information pada name, photo, role, skill, project, dan social link.

---

# 58. ENTITY: MARKETPLACE ITEMS

## Purpose

Menyimpan SaaS showcase listing.

Fields:

```text
id
title
slug
description
capabilities
external_url
status
```

Handbook menetapkan fields tersebut.

---

# 59. MARKETPLACE ITEM PUBLIC CONTRACT

```ts id="fmxr1n"
type MarketplaceItem = {
  id: string
  title: string
  slug: string
  description: string
  capabilities: string[]
  externalUrl: string
  status: "published"
}
```

---

# 60. MARKETPLACE BUSINESS MODEL

Marketplace item adalah:

```text
SHOWCASE
```

bukan:

```text
TRANSACTION ENTITY
```

Xolvon tidak menjadi processor SaaS purchase.

Subscription/purchase terjadi di website SaaS eksternal.

---

# 61. MARKETPLACE EXTERNAL URL

`external_url` harus:

```text
valid
approved
managed
```

Aturan final URL validation/governance masih open decision.

Maka jangan membangun business logic tambahan berdasarkan asumsi.

---

# 62. ENTITY: MARKETPLACE MEDIA

Fields:

```text
id
marketplace_id
object_key / url
media_type
sort_order
```

Baseline tersebut ditetapkan dalam Handbook.

---

# 63. MARKETPLACE MEDIA

Requirement memungkinkan:

```text
Image
Video
Deck
```

Exact final enum harus mengikuti implementation decision.

---

# 64. ENTITY: ADMIN AUDIT LOGS

## Purpose

Menyimpan action operasional penting.

Fields:

```text
id
actor_user_id
action
entity_type
entity_id
metadata
created_at
```

Handbook menetapkan `admin_audit_logs` dengan struktur tersebut.

---

# 65. AUDITABLE ACTIONS

Minimum:

```text
activate
revoke
publish
delete
role_change
```

Audit log dapat diperluas untuk action operational lain.

---

# 66. AUDIT LOG VISIBILITY

Audit log:

```text
ADMIN ONLY
```

Tidak boleh masuk public API.

Tidak boleh muncul di:

```text
public page
user dashboard
SEO metadata
browser logs
```

---

# 67. ENTITY RELATIONSHIP MAP

## User → Orders

```text
User 1
↓
N Orders
```

---

## Order → Order Items

```text
Order 1
↓
N OrderItems
```

---

## Order Item → Course

```text
OrderItem N
↓
1 Course
```

---

## User → Enrollments

```text
User 1
↓
N Enrollments
```

---

## Course → Enrollments

```text
Course 1
↓
N Enrollments
```

---

## Course → Lessons

```text
Course 1
↓
N Lessons
```

---

## Lesson → Resources

```text
Lesson 1
↓
N Resources
```

---

## User → Progress

```text
User 1
↓
N Progress
```

---

## Course → Progress

```text
Course 1
↓
N Progress
```

---

## Lesson → Progress

```text
Lesson 1
↓
N Progress
```

---

## Project ↔ Collective Member

```text
Project
M ↔ N
Collective Member
```

---

## Project → Media

```text
Project 1
↓
N Media
```

---

## Marketplace Item → Media

```text
Marketplace Item 1
↓
N Media
```

---

# 68. OWNERSHIP RULE

Setiap resource harus memiliki ownership context.

Contoh:

```text
Enrollment
→ user_id + course_id

Progress
→ user_id + course_id + lesson_id

Order
→ user_id

Lesson
→ course_id

ProjectMember
→ project_id + member_id
```

Server harus memvalidasi relationship tersebut sebelum mutation atau protected read.

---

# 69. FOREIGN KEY RULE

Relationship penting harus mempunyai foreign key/relational integrity.

Baseline examples:

```text
enrollments.user_id → users.id
enrollments.course_id → courses.id
lessons.course_id → courses.id
```

Handbook secara eksplisit mewajibkan foreign key/unique constraint pada relasi penting.

---

# 70. DATABASE INTEGRITY

Database harus mencegah impossible state sejauh dapat dilakukan.

Contoh:

Tidak boleh ada:

```text
Enrollment user yang tidak ada
```

Tidak boleh ada:

```text
Lesson untuk course yang tidak ada
```

Tidak boleh ada:

```text
ProjectMember untuk member yang tidak ada
```

---

# 71. SOFT DELETE / HARD DELETE

V1 belum menetapkan kebijakan universal soft delete vs hard delete.

Karena itu:

```text
DO NOT INVENT
```

Untuk entity yang membutuhkan history, jangan menghapus data secara irreversible tanpa decision.

Auditability harus dipertimbangkan untuk operational data.

---

# 72. PUBLIC VS PRIVATE DATA CONTRACT

## Public pages

Boleh menerima:

```text
published course
published project
published marketplace item
published collective member
```

## Authenticated pages

Dapat menerima:

```text
user-specific dashboard
active enrollment
learning progress
authorized lesson
```

## Admin pages

Dapat menerima:

```text
operational data
draft content
user management
activation
audit data
```

---

# 73. API RESPONSE PRINCIPLE

Backend harus mengembalikan:

```text
minimum necessary data
```

bukan:

```text
entire database row
```

Contoh:

Jangan mengirim full `users` entity untuk Navbar.

Gunakan:

```ts id="48w8p2"
{
  id,
  name
}
```

---

# 74. DTO RULE

Frontend sebaiknya menggunakan DTO / response shape yang memang ditujukan untuk UI.

Database row:

```text
DB Model
```

tidak otomatis sama dengan:

```text
UI Model
```

Contoh:

```text id="q1x2e5"
Database:
thumbnail_url

Frontend:
thumbnailUrl
```

Transformation boleh dilakukan pada contract layer, bukan dengan improvisasi component per component.

---

# 75. PUBLIC COURSE DTO

```ts id="8v0bl2"
type PublicCourseDTO = {
  id: string
  title: string
  slug: string
  description: string
  price: number
  thumbnailUrl: string | null
  status: "published"
}
```

---

# 76. PUBLIC PROJECT DTO

```ts id="k82q6h"
type PublicProjectDTO = {
  id: string
  title: string
  slug: string
  type: string
  summary: string
  status: "published"
}
```

---

# 77. PUBLIC MARKETPLACE DTO

```ts id="0ki8z6"
type PublicMarketplaceDTO = {
  id: string
  title: string
  slug: string
  description: string
  capabilities: string[]
  externalUrl: string
  status: "published"
}
```

---

# 78. PUBLIC COLLECTIVE DTO

```ts id="f0qv65"
type PublicCollectiveDTO = {
  id: string
  name: string
  slug: string
  photo: string | null
  role: string
  skills: string[]
  bio: string | null
  socialLinks: SocialLink[]
  status: "published"
}
```

---

# 79. USER DASHBOARD DTO

```ts id="cw5m54"
type DashboardDTO = {
  user: {
    id: string
    name: string
    email: string
  }

  courses: DashboardCourse[]
}
```

---

# 80. DASHBOARD COURSE

```ts id="u5l8v6"
type DashboardCourse = {
  courseId: string
  title: string
  slug: string
  thumbnailUrl: string | null
  enrollmentStatus: "active" | "revoked"
  progress: {
    completedLessons: number
    totalLessons: number
  }
}
```

Exact aggregate fields harus mengikuti backend contract ketika implementation dikunci.

Frontend tidak boleh menganggap fields yang belum disepakati sudah tersedia.

---

# 81. ADMIN USER DTO

Admin user table dapat memerlukan:

```ts id="7b3tdg"
type AdminUserDTO = {
  id: string
  name: string
  email: string
  phone: string
  role: "user" | "admin"
  createdAt: string
}
```

Password hash:

```text
NEVER
```

---

# 82. ADMIN ORDER DTO

```ts id="2jgn9k"
type AdminOrderDTO = {
  id: string
  user: {
    id: string
    name: string
    email: string
    phone: string
  }
  course: {
    id: string
    title: string
  }
  amount: number
  status: "pending" | "paid" | "cancelled"
  createdAt: string
  updatedAt: string
  activationStatus: "active" | "revoked" | "not_active"
}
```

`activationStatus` dapat menjadi presentation-level derived state dari enrollment.

---

# 83. DERIVED DATA RULE

Tidak semua UI value harus menjadi database field.

Contoh:

```text
completed lessons
total lessons
progress percentage
activation status
course card count
```

dapat menjadi:

```text
DERIVED DATA
```

selama derivation logic didefinisikan dengan jelas.

Jangan menambahkan duplicate database field hanya untuk memudahkan UI.

---

# 84. COURSE PROGRESS DERIVATION

Conceptual:

```text
completed_lessons
/
eligible_lessons
=
progress
```

Tetapi exact calculation belum dikunci di source document.

Karena itu backend/frontend tidak boleh mengarang formula bisnis baru yang memengaruhi reporting tanpa decision.

---

# 85. STATUS VS BOOLEAN

Gunakan boolean hanya jika kondisi memang binary.

Contoh:

```text
completed
```

dapat menjadi boolean.

Namun business lifecycle seperti:

```text
draft
published
revoked
cancelled
```

harus menggunakan state/enum.

---

# 86. STATE TRANSITION: COURSE

Conceptual:

```text
DRAFT
  │
  └── Publish
       ↓
   PUBLISHED
       │
       └── Unpublish
             ↓
           DRAFT
```

Public:

```text
PUBLISHED
```

Internal:

```text
DRAFT
```

---

# 87. STATE TRANSITION: ENROLLMENT

```text
NO ENROLLMENT
      │
      └── Admin Activate
              ↓
           ACTIVE
              │
              └── Admin Revoke
                    ↓
                 REVOKED
```

Re-activation behavior harus mengikuti backend/business implementation.

---

# 88. STATE TRANSITION: ORDER

```text
PENDING
  │
  ├── Verify
  ↓
PAID

PENDING
  │
  └── Cancel
        ↓
    CANCELLED
```

Payment verification tidak otomatis berarti UI harus menganggap enrollment active.

Activation tetap merupakan operation terpisah.

---

# 89. STATE TRANSITION: PROJECT

```text
DRAFT
  │
  └── Publish
       ↓
PUBLISHED
```

Unpublish dapat mengembalikan content menjadi non-public.

---

# 90. STATE TRANSITION: MARKETPLACE

```text
DRAFT
  │
  └── Publish
       ↓
PUBLISHED
```

---

# 91. STATE TRANSITION: COLLECTIVE MEMBER

```text
DRAFT
  │
  └── Publish
       ↓
PUBLISHED
```

---

# 92. SEARCH CONTRACT

Search target:

```text
Course
Portfolio
Marketplace
```

Searchable conceptual fields:

```text
title
slug
short_description / summary
tags / relevant searchable content
```

Handbook menetapkan title, slug, short description, tags, dan field relevan sebagai search surface.

---

# 93. SEARCH RESPONSE

Search endpoint/service harus mengembalikan:

```text
results
pagination if applicable
query context
```

Frontend tidak boleh melakukan full-database search dari browser.

---

# 94. FILTER CONTRACT

Filter harus mempunyai explicit meaning.

Contoh:

```text
status=published
sort=latest
q=ai
```

URL example:

```text
/course?q=automation&status=published
/portfolio?q=ai&sort=latest
/marketplace?q=crm&sort=latest
```

---

# 95. PAGINATION

Pagination behavior belum ditentukan secara final pada source document.

Karena itu:

```text
DO NOT ASSUME
```

Apabila data volume mengharuskan pagination, implementation harus mengunci contract terlebih dahulu.

---

# 96. SORTING

Sorting example:

```text
latest
```

telah digunakan sebagai URL example.

Additional sorting seperti:

```text
price
popular
alphabetical
```

belum merupakan official product contract.

---

# 97. NULL DATA RULE

Jika data optional tidak tersedia:

```json id="1fjdpn"
null
```

bukan:

```json
""
```

atau:

```json
"N/A"
```

kecuali UI contract secara khusus menentukan display transformation.

---

# 98. EMPTY ARRAY RULE

Relationship collection yang tidak memiliki data menggunakan:

```json id="fy8m4k"
[]
```

bukan:

```json
null
```

untuk collection yang memang contract-nya array.

Contoh:

```ts id="poyf9g"
members: []
media: []
skills: []
socialLinks: []
```

---

# 99. DATE DISPLAY RULE

Database stores canonical date/time.

Frontend responsible for presentation:

```text
createdAt
→
formatted date
```

Jangan menyimpan formatted string seperti:

```text
"28 August 2026"
```

sebagai database truth kecuali field memang merupakan content text.

---

# 100. PRICE RULE

Price disimpan sebagai numeric value.

Frontend bertanggung jawab atas presentation:

```text
Rp XXX.XXX
```

Jangan menyimpan:

```text
"Rp 99.000"
```

sebagai source numeric truth apabila field tersebut digunakan untuk transaction logic.

---

# 101. MONEY CURRENCY

V1 primary market:

```text
Indonesia
```

Display currency:

```text
IDR / Rupiah
```

Namun currency field universal tidak boleh ditambahkan sebagai database field tanpa keputusan apabila seluruh system memang single-currency pada V1.

---

# 102. BOOLEAN RULE

Gunakan boolean untuk binary state:

```text
completed
```

Jangan gunakan:

```text
"isPublished": "yes"
```

apabila schema sudah memiliki enum status.

---

# 103. ARRAY RULE

Field seperti:

```text
skills
capabilities
```

dapat direpresentasikan sebagai array pada application contract.

Database storage implementation dapat menggunakan strategy yang ditentukan DB/Architecture.

Frontend tetap harus menerima canonical array shape.

---

# 104. RELATIONSHIP FETCH RULE

Jangan mengambil seluruh relational graph jika UI hanya membutuhkan sebagian.

Contoh:

Portfolio card tidak perlu mengambil:

```text
full member profile
full audit log
all project media
```

cukup:

```text
project card data
```

Detail page baru mengambil relationship yang diperlukan.

---

# 105. N+1 AWARENESS

Backend tidak boleh melakukan query relationship secara naïve jika menghasilkan excessive DB calls.

Contoh buruk:

```text
get all projects
↓
query members per project
↓
query member profile per member
```

Exact query strategy berada di `ARCHITECTURE.md`.

---

# 106. PUBLIC DATA INDEXING RULE

Hanya data yang memiliki:

```text
status = published
```

dan memang public yang boleh:

```text
appear in public catalog
appear in public search
appear in sitemap
appear in SEO metadata
```

---

# 107. PROTECTED DATA RULE

Data protected tidak boleh masuk:

```text
public search
public sitemap
public metadata
Open Graph
unauthorized response
```

---

# 108. COURSE PREMIUM DATA

Private lesson media:

```text
video_object_key
```

merupakan server/storage concern.

Frontend tidak menjadikan object key sebagai playback URL.

Playback URL harus dihasilkan secara authorized.

---

# 109. STORAGE DATA

R2 object key dapat disimpan sebagai metadata internal.

Convention Handbook:

```text
public/site/{asset-id}/{filename}

public/projects/{project-id}/{filename}

private/courses/{course-id}/lessons/{lesson-id}/video/{asset-id}.{ext}

private/courses/{course-id}/lessons/{lesson-id}/resources/{asset-id}.{ext}

private/projects/{project-id}/{filename}
```

Frontend tidak boleh mengonstruksi object key sendiri.

---

# 110. OBJECT KEY RULE

Jangan:

```text
objectKey = userProvidedFilename
```

Gunakan generated object key.

User filename tidak boleh menjadi security/path authority.

---

# 111. MEDIA URL RULE

Bedakan:

```text
object key
```

dari:

```text
public URL
```

dan:

```text
signed URL
```

Ketiganya bukan konsep yang sama.

---

# 112. PUBLIC MEDIA

Public marketing assets dapat menggunakan public-access model jika memang diperlukan.

Tetapi:

```text
premium course media
```

harus tetap private.

---

# 113. SEARCHABLE VS NON-SEARCHABLE

Not all fields are search fields.

Searchable conceptual:

```text
title
slug
summary/description
tags/relevant content
```

Non-searchable operational:

```text
password_hash
audit metadata
session
signing credentials
internal object credentials
```

---

# 114. SENSITIVE FIELD RULE

Absolute server-only fields include:

```text
password_hash
session secrets
signing credentials
storage credentials
internal audit records
```

Handbook secara eksplisit melarang sensitive fields tersebut dikirim ke client.

---

# 115. ADMIN DATA RULE

Admin UI boleh menerima additional fields yang diperlukan operational workflow.

Tetapi:

```text
ADMIN ≠ EVERYTHING
```

Admin hanya menerima data yang memang diperlukan untuk operation.

---

# 116. AUDIT METADATA RULE

`metadata` pada audit log merupakan internal operational data.

Tidak boleh dikirim ke:

```text
Public API
User API
SEO metadata
```

kecuali ada explicit admin requirement.

---

# 117. API INPUT RULE

Mutation input harus divalidasi terhadap schema.

Contoh:

```text
Create Course
Update Course
Create Project
Publish Course
Activate Enrollment
```

Input invalid harus ditolak.

---

# 118. FRONTEND FORM CONTRACT

FE tidak boleh submit arbitrary fields.

Contoh:

Create Course form hanya boleh mengirim field yang telah disepakati:

```text
title
slug
description
price
thumbnail reference
status
```

Bukan:

```text
isAdmin
createdBy
verified
accessLevel
```

kecuali server contract memang mendefinisikannya.

---

# 119. MASS ASSIGNMENT RULE

Admin action yang memodifikasi banyak record harus memiliki explicit backend contract.

FE tidak boleh mengulang mutation secara sembarangan:

```text
for each user:
  activate()
```

jika backend belum mendukung bulk operation dan transactional behavior.

---

# 120. PATCH VS FULL REPLACE

Implementation harus membedakan:

```text
create
update
patch
publish
activate
revoke
delete
```

Jangan menganggap semua mutation adalah:

```text
update everything
```

---

# 121. PARTIAL UPDATE RULE

Partial update hanya mengubah fields yang dikirim.

Field yang tidak diberikan:

```text
DO NOT SILENTLY RESET
```

menjadi:

```text
null
empty string
false
```

tanpa contract.

---

# 122. REQUIRED FIELD RULE

Required field tidak boleh dibuat optional hanya agar frontend lebih mudah.

Jika BE/DB mengatakan:

```text
title required
```

FE harus memvalidasi sebelum submit.

---

# 123. ENUM RULE

Enum harus:

```text
centralized
documented
consistent
```

Jangan menulis satu status dengan berbagai spelling:

```text
published
Published
PUBLISHED
publish
```

untuk concept yang sama.

---

# 124. CASE CONVENTION

Database:

```text
snake_case
```

Application TypeScript:

```text
camelCase
```

Contoh:

```text
DB:
created_at

TS:
createdAt
```

Exact ORM/mapper implementation berada di architecture layer.

---

# 125. DATABASE TABLE LIST — V2

Canonical conceptual tables (Schema V2, dibuat oleh migration set `src/database/migrations/` — 19 tabel + 3 FTS5):

```text
users
sessions
courses
lessons
course_tags
course_resources
enrollments
orders
order_items
payment_proofs
progress
projects
project_tags
project_media
project_members
collective_members
marketplace_items
marketplace_media
admin_audit_logs
```

Tabel pendukung pencarian (FTS5 virtual tables, bukan entity bisnis): `course_fts`, `project_fts`, `marketplace_fts`.

Baseline ini memperluas model awal PRD agar kebutuhan payment, portfolio, marketplace, Collective, progress, dan admin operation dapat ditangani.

---

# 126. MINIMUM RELATIONAL STRUCTURE

```text
users
 ├──< enrollments >── courses
 ├──< orders ──< order_items >── courses
 └──< progress >── lessons >── courses

projects
 ├──< project_media
 └──< project_members >── collective_members

marketplace_items
 └──< marketplace_media

users
 └──< admin_audit_logs
```

---

# 127. SCHEMA INDEX

```text
users
sessions
courses
lessons
course_tags
course_resources
enrollments
orders
order_items
payment_proofs
progress
projects
project_tags
project_media
project_members
collective_members
marketplace_items
marketplace_media
admin_audit_logs
```

Jika entity baru ingin ditambahkan:

```text
DO NOT JUST CREATE TABLE
```

ikuti schema change process.

---

# 128. ENTITY ADDITION PROCESS

```text
Need Identified
↓
Product Requirement
↓
Schema Proposal
↓
Relationship Review
↓
Security Review
↓
Migration
↓
SCHEMA.md Update
↓
Backend Contract
↓
Frontend Contract
```

---

# 129. SCHEMA VERSIONING

Perubahan schema harus memiliki:

```text
version
migration
change reason
affected entities
affected consumers
```

Contoh:

```text
Schema v1.1
Add course status detail
Affected:
Course API
Course Catalog
Admin Course
SEO
```

Catatan perubahan aktif — Schema v1.1 (2026-09-12):

```text
version: v1.1
migration: src/database/migrations/0000_users_sessions.sql s/d 0007_fts.sql,
           dijalankan oleh runner src/database/migrate.ts
change reason: adopsi penuh Schema V2 — tabel sessions/course_tags/project_tags/
           payment_proofs, kolom yang dipakai query repo (sessions.refresh_token/
           expires_at/ip_address/user_agent, users.status/email_verified/
           phone_verified, courses.price, collective_members.display_order),
           status order final pending|paid|cancelled, status enrollment
           final active|revoked, FK ON DELETE CASCADE, index status/slug/
           user_id/course_id, dan index pencarian FTS5
affected entities: users, sessions, courses, lessons, course_tags,
           course_resources, orders, order_items, payment_proofs, enrollments,
           progress, projects, project_tags, project_media, project_members,
           collective_members, marketplace_items, marketplace_media,
           admin_audit_logs
affected consumers: Auth API (sesi refresh), Orders API (status order),
           Enrollments API (status), Home API (display_order member),
           pencarian publik (FTS5), Admin API (audit log), Admin Orders
           (payment_proofs)
```

---

# 130. BREAKING SCHEMA CHANGE

Breaking change contohnya:

```text
rename field
delete field
change type
change enum
change required → optional
change optional → required
relationship change
```

Breaking change harus dikoordinasikan dengan FE/BE/DB.

---

# 131. BACKWARD COMPATIBILITY

Jika memungkinkan, perubahan schema sebaiknya tidak langsung merusak consumer existing.

Tetapi compatibility strategy final berada pada architecture/backend decision.

---

# 132. SCHEMA MIGRATION RULE

Tidak boleh:

```text
Production database
+
manual random SQL
+
forget documentation
```

Gunakan migration.

Migration dijalankan lewat runner `src/database/migrate.ts`, bukan manual SQL:

```text
berkas   : src/database/migrations/*.sql (urut nama file, hanya .sql top-level)
tracking : tabel _migrations (id, filename UNIQUE, hash SHA-256, applied_at)
idempoten: file yang sudah tercatat dengan hash sama dilewati —
           aman dijalankan ulang; SQLite meng-serialize penulisan
drift    : file yang sudah diterapkan lalu diubah (hash beda) = error;
           perubahan schema WAJIB menjadi berkas migrasi baru
```

---

# 133. FRONTEND MOCK DATA RULE

Mock data boleh digunakan pada development apabila:

```text
explicitly mock
type-safe
matches SCHEMA.md
```

Contoh:

```ts id="s2or9b"
const mockCourse: CourseCardData = {
  id: "mock-course-1",
  title: "Mock Course",
  slug: "mock-course",
  description: "Development data",
  price: 0,
  thumbnailUrl: null,
  status: "published",
}
```

Mock data tidak boleh terlihat sebagai production fact.

---

# 134. MOCK DATA MUST MATCH CONTRACT

Dilarang:

```ts id="8ne9sk"
const course = {
  title,
  instructor,
  rating,
  students,
  discount
}
```

jika fields tersebut tidak terdapat dalam contract.

---

# 135. NO "OPTIONAL EVERYTHING"

Jangan membuat semua TypeScript fields:

```ts id="n0m8d3"
string | null | undefined
```

hanya untuk menghindari error.

Optionality harus merepresentasikan keadaan data yang sebenarnya.

---

# 136. API ERROR CONTRACT

Error response minimal harus memiliki safe shape yang konsisten.

Conceptual:

```ts id="vbkh5u"
type ApiError = {
  code: string
  message: string
}
```

Internal stack trace tidak boleh menjadi client response.

---

# 137. NOT FOUND CONTRACT

Jika resource public tidak ditemukan:

```text
404
```

Frontend menampilkan not-found state.

Jangan membuat fake fallback resource agar page selalu terlihat “berisi”.

---

# 138. UNAUTHORIZED CONTRACT

Untuk resource protected:

```text
401
```

jika authentication tidak tersedia/valid.

---

# 139. FORBIDDEN CONTRACT

```text
403
```

untuk authenticated user yang tidak memiliki permission/access.

---

# 140. CONFLICT CONTRACT

Jika mutation conflict terjadi:

```text
409
```

dapat digunakan ketika resource/state conflict diperlukan oleh implementation.

Contoh:

```text
duplicate enrollment
```

Exact API implementation dapat berbeda tetapi semantic conflict harus tetap jelas.

---

# 141. VALIDATION CONTRACT

Input invalid:

```text
4xx validation response
```

FE harus menampilkan message yang actionable.

---

# 142. DATABASE FIELD ≠ UI FIELD

Ini aturan penting.

Contoh:

Database:

```text
password_hash
```

UI:

```text
password
```

Keduanya tidak boleh dipetakan langsung ke client.

Demikian pula:

```text
video_object_key
```

bukan:

```text
videoUrl
```

yang dapat langsung diputar browser.

---

# 143. DERIVED UI MODEL

Frontend boleh membentuk derived view model.

Contoh:

```ts id="5f8bkc"
type CourseCardViewModel = {
  title: string
  thumbnailUrl: string | null
  formattedPrice: string
  href: string
}
```

Namun view model harus diturunkan dari actual contract.

---

# 144. HREF DERIVATION

Public href:

```text id="u2n6e5"
course.slug
→ /course/{slug}

project.slug
→ /portfolio/{slug}

marketplace.slug
→ /marketplace/{slug}

member.slug
→ /collective/{slug}
```

Jangan membangun public URL berdasarkan raw database ID jika slug tersedia.

---

# 145. DATA FETCHING RULE

FE hanya mengambil data yang dibutuhkan route.

### Course Catalog

```text
CourseCardData[]
```

### Course Detail

```text
CourseDetailData
```

### Portfolio List

```text
ProjectCardData[]
```

### Portfolio Detail

```text
ProjectDetailData
```

### Collective

```text
CollectiveMember[]
```

### Dashboard

```text
DashboardDTO
```

---

# 146. RELATIONAL DETAIL RULE

Detail page dapat menggunakan related data.

Contoh:

```text
Project Detail
+
Media
+
Members
```

Tetapi jangan mengembalikan unrelated data seperti:

```text
Admin Audit Logs
User Password
All Orders
```

---

# 147. USER OWNERSHIP FILTER

Untuk user-specific queries:

```text
WHERE user_id = authenticated_user.id
```

secara konseptual.

Jangan menerima `user_id` dari browser sebagai source of authorization.

---

# 148. ADMIN OWNERSHIP

Admin dapat melakukan operational query lintas user sesuai permission.

Tetapi:

```text
admin role
```

harus diverifikasi server.

---

# 149. ENROLLMENT QUERY RULE

Untuk protected course:

```text
user_id
+
course_id
+
status = active
```

menentukan entitlement.

---

# 150. LESSON MEMBERSHIP RULE

Sebelum memberi protected lesson access, server harus memastikan:

```text
lesson belongs to requested course
```

bukan sekadar:

```text
user has some enrollment
```

---

# 151. SIGNED URL CONTRACT

Conceptual:

```ts id="c5yq5l"
type SignedMediaAccess = {
  url: string
  expiresAt?: string
}
```

Exact expiry representation dapat ditentukan backend.

Frontend hanya menggunakan temporary URL untuk playback.

Frontend tidak menyimpan long-lived signed URL sebagai permanent source.

---

# 152. SIGNED URL FAILURE

Jika signed URL expired:

```text
request new URL
```

hanya jika entitlement masih aktif.

Raw storage error tidak ditampilkan ke user.

Handbook menetapkan behavior tersebut.

---

# 153. PUBLIC SEARCH INDEX RULE

Search hanya mengembalikan:

```text
published
publicly eligible
```

Tidak:

```text
draft
private
admin-only
revoked
unpublished
```

---

# 154. SEARCH RESULT SHAPE

Conceptual:

```ts id="5acoc7"
type SearchResult<T> = {
  items: T[]
  query: string
}
```

Pagination/sort metadata dapat ditambahkan ketika API contract dikunci.

---

# 155. SORT RESULT CONSISTENCY

Backend harus menentukan sorting semantics.

Frontend tidak boleh:

```text
sort locally
```

jika data source memerlukan server-side ordering.

---

# 156. ADMIN SEARCH

Admin search dapat berbeda dari public search.

Admin dapat mencari:

```text
users
orders
courses
projects
marketplace
collective
```

Admin search dapat menggunakan internal fields yang tidak public.

---

# 157. ADMIN FILTER

Admin filter dapat menggunakan operational state:

```text
pending activation
published
draft
active
revoked
```

Exact available filters mengikuti masing-masing module.

---

# 158. AUDIT RELATIONSHIP

```text
Admin User
↓
Admin Audit Log
↓
Target Entity
```

Concept:

```text
actor_user_id
+
entity_type
+
entity_id
```

menghubungkan action ke entity.

---

# 159. AUDIT IMMUTABILITY

Audit log merupakan evidence operational.

Frontend tidak menyediakan normal UI untuk:

```text
edit audit log
```

atau:

```text
delete audit log
```

kecuali terdapat explicit policy.

---

# 160. ADMIN ACTIVATION DATA FLOW

```text
Order
↓
Verification
↓
Activation
↓
Enrollment
```

Bukan:

```text
Order
=
Enrollment
```

---

# 161. ACTIVATION RELATIONSHIP

Activation harus menargetkan:

```text
user
+
course
+
specific order/context
```

bukan hanya:

```text
user
```

Handbook menekankan activation harus menargetkan order/course tertentu jika user mempunyai beberapa pembelian.

---

# 162. REVOCATION

Revocation:

```text
Enrollment.status = revoked
```

dan dapat mencatat:

```text
revoked_at
```

Access ke premium media harus berhenti setelah entitlement tidak aktif.

---

# 163. REVOKED ACCESS

Jika enrollment revoked:

```text
Course detail → public
Lesson → protected / denied
Premium media → denied
```

User tidak otomatis kehilangan account.

---

# 164. PUBLIC PROFILE RELATIONSHIP

Collective profile dapat menampilkan:

```text
member
+
projects
```

Project detail dapat menampilkan:

```text
project
+
contributors
```

Relationship harus berasal dari database relationship.

---

# 165. MARKETPLACE MEDIA RELATIONSHIP

```text
Marketplace Item
↓
Marketplace Media[]
```

Ordering menggunakan:

```text
sort_order
```

---

# 166. PROJECT MEDIA ORDER

```text
sort_order
```

menentukan presentation sequence.

Frontend tidak boleh mengandalkan database insertion order.

---

# 167. LESSON ORDER

```text
order_index
```

menentukan lesson sequence.

Frontend tidak boleh mengurutkan berdasarkan title kecuali product mengharuskannya.

---

# 168. COURSE CONTENT STRUCTURE

V1:

```text
Course
├── Lesson 1
├── Lesson 2
├── Lesson 3
└── ...
```

Resources dapat berada pada course atau lesson sesuai schema relation.

---

# 169. NO UNDOCUMENTED ENTITY

AI tidak boleh membuat entity seperti:

```text
Instructor
Category
Review
Rating
Coupon
Discount
Certificate
Wishlist
Community
Comment
Subscription
Affiliate
```

hanya karena lazim pada platform course.

---

# 170. NO DUPLICATE ENTITIES

Jangan memiliki:

```text
course
courses
course_data
course_entity
course_record
```

sebagai representasi database yang berbeda untuk satu concept.

---

# 171. NAMING RULE — DATABASE

Gunakan:

```text
snake_case
```

Contoh:

```text
course_id
created_at
thumbnail_url
video_object_key
project_id
member_id
```

---

# 172. NAMING RULE — TYPESCRIPT

Gunakan:

```text
camelCase
```

untuk property application-level jika mapper digunakan.

Contoh:

```text
courseId
createdAt
thumbnailUrl
videoObjectKey
```

---

# 173. NAMING RULE — ENTITY TYPES

Gunakan:

```text
PascalCase
```

Contoh:

```ts id="lq7n7z"
Course
Lesson
Enrollment
Project
CollectiveMember
MarketplaceItem
```

---

# 174. SCHEMA DOCUMENTATION REQUIREMENT

Setiap new entity wajib menjelaskan:

```text
Purpose
Fields
Types
Required
Nullable
Visibility
Relationships
Status
Mutation
Security implications
Frontend representation
```

---

# 175. SCHEMA CHANGE CHECKLIST

Sebelum schema change:

```text
[ ] Product requirement exists
[ ] Entity identified
[ ] Field identified
[ ] Type identified
[ ] Required/nullable decided
[ ] Visibility decided
[ ] Relationship reviewed
[ ] Security reviewed
[ ] Migration prepared
[ ] Backend contract updated
[ ] Frontend contract updated
```

---

# 176. FRONTEND CONTRACT CHECKLIST

Sebelum FE menggunakan entity baru:

```text
[ ] Entity exists in SCHEMA.md
[ ] Public/private boundary understood
[ ] Required fields understood
[ ] Nullable fields handled
[ ] Status values understood
[ ] Relationship understood
[ ] Loading state considered
[ ] Empty state considered
[ ] Error state considered
```

---

# 177. AI SCHEMA CHECKLIST

AI Coding Agent wajib memeriksa:

```text
Does this field exist?

Is this field nullable?

Is this field public?

Is this field server-only?

Is this enum official?

Does this relationship exist?

Does this entity exist?

Can this data be accessed by this role?
```

Apabila jawabannya tidak jelas:

```text
OPEN DECISION
```

---

# 178. SCHEMA CONFLICT RULE

Jika PRD mengatakan sebuah feature ada tetapi schema belum mendukungnya:

```text
DO NOT FAKE IT IN FRONTEND
```

Yang harus dilakukan:

```text
Requirement
↓
Schema Gap
↓
Schema Proposal
↓
Review
↓
Migration
↓
Implementation
```

---

# 179. SCHEMA VS DATABASE RULE

`SCHEMA.md` mendokumentasikan:

```text
canonical conceptual model
+
application data contract
```

SQL migration dapat menjadi implementation detail.

Schema contract harus tetap mudah dipahami FE.

---

# 180. SCHEMA VS API RULE

API response boleh berbeda dari raw SQL row.

Namun perbedaan tersebut harus:

```text
intentional
documented
consistent
```

Contoh:

```text
DB:
thumbnail_url

API:
thumbnailUrl
```

---

# 181. SCHEMA VS UI RULE

UI boleh memiliki derived property.

Contoh:

```text
formattedPrice
href
displayDate
progressPercentage
```

tetapi derived properties tidak otomatis menjadi database fields.

---

# 182. SOURCE OF TRUTH HIERARCHY

Untuk data:

```text id="n6cf9j"
Database
↓
Backend Contract
↓
Frontend DTO
↓
UI View Model
```

Tidak boleh:

```text
UI
↓
mengarang database state
```

---

# 183. FINAL CANONICAL ENTITY LIST

```text
USER DOMAIN
───────────
users
sessions
enrollments
progress

COURSE DOMAIN
─────────────
courses
lessons
course_tags
course_resources

PAYMENT DOMAIN
──────────────
orders
order_items
payment_proofs

PORTFOLIO DOMAIN
────────────────
projects
project_tags
project_media
project_members

COLLECTIVE DOMAIN
─────────────────
collective_members

MARKETPLACE DOMAIN
──────────────────
marketplace_items
marketplace_media

ADMIN / AUDIT
─────────────
admin_audit_logs
```

---

# 184. FINAL CANONICAL RELATIONSHIP GRAPH

```text
                         ┌──────────────┐
                         │    USERS     │
                         └──────┬───────┘
                                │
              ┌─────────────────┼──────────────────┐
              │                 │                  │
              ▼                 ▼                  ▼
          ENROLLMENTS         ORDERS            PROGRESS
              │                 │                  │
              ▼                 ▼                  ▼
           COURSES         ORDER_ITEMS           LESSONS
              │                 │                  │
              ▼                 ▼                  │
           LESSONS            COURSES ◄────────────┘
              │
              ▼
       COURSE_RESOURCES


       ┌──────────────┐
       │   PROJECTS   │
       └──────┬───────┘
              │
        ┌─────┴────────────┐
        ▼                  ▼
 PROJECT_MEDIA       PROJECT_MEMBERS
                           │
                           ▼
                  COLLECTIVE_MEMBERS
                           │
                           └──────► PROJECTS


     ┌──────────────────────┐
     │  MARKETPLACE_ITEMS   │
     └──────────┬───────────┘
                │
                ▼
        MARKETPLACE_MEDIA


     ┌──────────────┐
     │     USERS    │
     └──────┬───────┘
            │
            ▼
   ADMIN_AUDIT_LOGS
```

---

# 185. FINAL DATA RULE

Semua FE developer dan AI Coding Agent harus memahami kalimat berikut:

> **Kalau datanya tidak ada di `SCHEMA.md`, jangan mengarang field tersebut.**

> **Kalau field ada tetapi visibility-nya tidak mengizinkan client, jangan kirim ke browser.**

> **Kalau relationship tidak didefinisikan, jangan mengarang relationship.**

> **Kalau enum belum final, jangan memperlakukannya sebagai enum resmi.**

> **Kalau data bersifat derived, jangan otomatis membuat database field baru.**

---

# 186. SCHEMA CONTRACT FOR VIBE CODING

AI Coding Agent ketika menerima task:

```text
"Build Course Card"
```

harus berpikir:

```text
Course entity?
↓
Public Course DTO?
↓
title
slug
description
price
thumbnailUrl
status
↓
Published only
↓
Render
```

Bukan:

```text
What fields would a modern course card usually have?
```

---

# 187. EXAMPLE — WRONG

```ts id="8hh201"
type Course = {
  id: string
  title: string
  description: string
  instructor: string
  rating: number
  students: number
  discount: number
}
```

Masalah:

```text
instructor
rating
students
discount
```

tidak berada dalam canonical V1 contract.

---

# 188. EXAMPLE — CORRECT

```ts id="e6wsby"
type CourseCardData = {
  id: string
  title: string
  slug: string
  description: string
  price: number
  thumbnailUrl: string | null
  status: "published"
}
```

---

# 189. EXAMPLE — WRONG PREMIUM MEDIA

```ts id="f2nnf9"
const lesson = {
  videoUrl: "https://public-storage.example/video.mp4"
}
```

Tidak sesuai premium content contract.

---

# 190. EXAMPLE — CORRECT PREMIUM MEDIA FLOW

```text
Lesson
↓
Authenticated User
↓
Enrollment Check
↓
Lesson Ownership Check
↓
Server generates signed URL
↓
Client receives temporary playback URL
```

---

# 191. EXAMPLE — WRONG AUTHORIZATION

```ts id="sn4n1t"
if (user.role === "admin") {
  showAdminPage()
}
```

UI visibility bukan authorization.

Authorization tetap dilakukan server-side.

---

# 192. EXAMPLE — CORRECT CONCEPT

```text
Client:
Admin UI

Server:
Authentication
↓
Authorization
↓
Mutation
```

---

# 193. EXAMPLE — WRONG ENROLLMENT

```ts id="nq9yub"
const hasAccess =
  localStorage.getItem("courseAccess") === "true"
```

Tidak valid sebagai entitlement.

---

# 194. EXAMPLE — CORRECT ENROLLMENT

```text
Authenticated User
↓
Server
↓
Enrollment(user_id, course_id)
↓
status = active
↓
Access granted
```

---

# 195. EXAMPLE — WRONG COLLECTIVE

```ts id="h53zer"
const memberProjects = [
  "CafeMargin",
  "Project A",
  "Project B"
]
```

Jika data tersebut merupakan production relationship, relationship harus berasal dari:

```text
project_members
```

dan:

```text
collective_members
```

---

# 196. EXAMPLE — CORRECT COLLECTIVE

```text
Collective Member
↓
Project Memberships
↓
Project
```

---

# 197. SCHEMA SECURITY PRINCIPLE

Security tidak hanya berada di authentication.

Security juga berada pada:

```text
data shape
+
field visibility
+
relationship validation
+
ownership validation
+
state validation
```

---

# 198. DATA MINIMIZATION

Jangan mengembalikan:

```text
SELECT *
```

sebagai default application contract.

Response harus dirancang berdasarkan kebutuhan caller.

---

# 199. PUBLIC API MINIMIZATION

Public API idealnya tidak pernah mengembalikan:

```text
password_hash
role
internal audit metadata
private R2 object key
signing credential
session information
```

kecuali field memang secara eksplisit diperlukan dan aman.

---

# 200. FINAL SCHEMA STANDARD

Sebuah schema implementation dianggap benar apabila:

```text
[ ] Semua entity terdokumentasi
[ ] Semua field terdokumentasi
[ ] Type konsisten
[ ] Required/nullable jelas
[ ] Visibility jelas
[ ] Relationship jelas
[ ] Enum jelas
[ ] Public DTO jelas
[ ] Protected DTO jelas
[ ] Sensitive field tidak bocor
[ ] Searchable fields jelas
[ ] State transition jelas
[ ] Migration terdokumentasi
[ ] FE dapat memahami contract tanpa menebak
[ ] BE dapat mengimplementasikan contract tanpa menebak
 [ ] DB dapat membuat schema tanpa menebak
```

---

# 201. ENTITY: SESSIONS

## Purpose

Menyimpan sesi refresh login (JWT access + refresh session, model repo).
Satu user dapat memiliki banyak sesi.

## Fields

| Field           | Type            | Required | Nullable | Visibility  | Description |
| --------------- | --------------- | -------- | -------- | ----------- | ----------- |
| `id`            | string (UUID)   | YES      | NO       | SERVER-ONLY | ID sesi     |
| `user_id`       | string          | YES      | NO       | SERVER-ONLY | FK `users.id` |
| `refresh_token` | string          | YES      | YES      | SERVER-ONLY | Disimpan sebagai hash SHA-256, BUKAN token mentah |
| `expires_at`    | datetime/string | YES      | YES      | SERVER-ONLY | Batas masa berlaku sesi (ISO 8601) |
| `ip_address`    | string          | NO       | YES      | SERVER-ONLY | IP saat login |
| `user_agent`    | string          | NO       | YES      | SERVER-ONLY | User agent saat login |
| `created_at`    | datetime/string | YES      | YES      | SERVER-ONLY | Waktu dibuat |

## Security implications

Seluruh field SERVER-ONLY. Tidak ada endpoint publik yang pernah
mengembalikan isi tabel ini. `refresh_token` mentah tidak pernah disimpan.

---

# 202. ENTITY: COURSE TAGS & PROJECT TAGS

## Purpose

Tag pencarian/filter publik untuk Course (`course_tags`) dan Portfolio
(`project_tags`). Ditambahkan pada Schema V2.

## Fields (kedua tabel)

| Field        | Type          | Required | Nullable | Visibility | Description |
| ------------ | ------------- | -------- | -------- | ---------- | ----------- |
| `id`         | string (UUID) | YES      | NO       | internal   | ID baris tag |
| `course_id` / `project_id` | string | YES | YES | internal | FK ke tabel induk |
| `tag`        | string        | NO       | YES      | public     | Nilai tag   |

## Relationships

```text
course_tags.course_id  → courses.id
project_tags.project_id → projects.id
```

## Visibility

Tag boleh tampil di permukaan publik; ID internal tidak diekspos
sebagai contract FE.

---

# END OF SCHEMA.md
