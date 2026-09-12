# RULES.md

# XOLVON.COM

## Frontend & AI Vibe Coding Rules

**Project:** Xolvon.com
**Organization:** PT Xolvon Kehidupan Cerdas Abadi
**Product:** AI Business Collective
**Document Type:** Frontend Constitution / Engineering Rules
**Scope:** Frontend Developer, UI/UX Developer, AI Coding Agent, Reviewer
**Status:** Mandatory
**Applies To:** Local, Staging, Production
**Primary Objective:** Menjaga konsistensi produk, UI, UX, architecture boundary, security boundary, dan kualitas code ketika website dikembangkan oleh beberapa developer maupun AI Coding Agent.

---

# 0. STATUS DOKUMEN

Dokumen ini adalah **aturan kerja utama untuk Frontend Xolvon.com**.

`RULES.md` bukan dokumentasi fitur.

`RULES.md` bukan dokumentasi database.

`RULES.md` bukan dokumentasi design system secara detail.

`RULES.md` bukan pengganti `PRD.md`, `SCHEMA.md`, `DESIGN.md`, atau `ARCHITECTURE.md`.

Kelima file tersebut membentuk satu sistem:

```text
RULES.md
    ↓
PRD.md
    ↓
SCHEMA.md
    ↓
DESIGN.md
    ↓
ARCHITECTURE.md
    ↓
Implementation
```

Setiap developer atau AI Coding Agent wajib memahami kelima file sebelum melakukan perubahan yang signifikan.

---

# 1. TUJUAN UTAMA RULES

Frontend Xolvon harus terasa seperti **satu produk yang dibangun oleh satu engineering team**, walaupun implementasinya dikerjakan oleh beberapa developer, beberapa branch, atau AI Coding Agent yang berbeda.

Konsistensi yang harus dijaga mencakup:

* visual
* typography
* spacing
* component behavior
* responsive behavior
* naming
* folder structure
* data contract
* state management
* loading state
* empty state
* error state
* authentication boundary
* authorization boundary
* server/client boundary
* accessibility
* SEO
* performance
* code quality
* Git workflow

Developer tidak hanya bertanggung jawab membuat fitur “berjalan”.

Developer bertanggung jawab membuat fitur yang:

1. sesuai product requirement,
2. sesuai data contract,
3. sesuai design system,
4. sesuai architecture,
5. aman,
6. responsive,
7. maintainable,
8. dapat direview developer lain,
9. tidak merusak fitur yang sudah ada.

---

# 2. THE CORE PRINCIPLE

## 2.1 Build What Is Required

Jangan membangun fitur hanya karena fitur tersebut:

* populer,
* menurut developer lebih bagus,
* menurut AI lebih modern,
* umum terdapat pada website sejenis,
* mudah dibuat,
* terlihat keren di demo.

Implementasikan hanya berdasarkan requirement yang telah disetujui.

Contoh:

Jika requirement menyebut Marketplace sebagai katalog/showcase yang mengarahkan user ke website SaaS eksternal, maka FE **tidak boleh mengubahnya menjadi marketplace transaction system** hanya karena developer merasa lebih lengkap.

Marketplace Xolvon bukan transaction marketplace pada V1.

---

# 3. SINGLE SOURCE OF TRUTH

Ketika terdapat pertanyaan tentang implementasi, gunakan urutan sumber berikut:

### P0 — Product / Founder Decision

Keputusan founder dan requirement resmi.

Digunakan untuk:

* business direction
* product behavior
* user flow
* scope
* user experience yang telah diputuskan

Founder Q1–Q55 merupakan sumber keputusan produk dan UX.

### P0 — Master PRD

Digunakan untuk:

* product definition
* technical baseline
* architecture baseline
* Definition of Done
* security baseline
* roadmap

Master PRD ditetapkan sebagai dokumen final dan mengikat untuk arah produk/teknis dasarnya.

### P1 — Official Technical Documentation

Digunakan untuk:

* framework behavior
* Cloudflare behavior
* runtime behavior
* deployment implementation
* API/framework compatibility

Dokumentasi vendor harus diprioritaskan daripada asumsi developer ketika fakta teknis berubah.

### P1 — `DESIGN.md`, `SCHEMA.md`, `ARCHITECTURE.md`

Digunakan sebagai kontrak implementasi internal.

### P2 — Developer Recommendation

Boleh dipakai apabila:

* meningkatkan security,
* meningkatkan performance,
* meningkatkan maintainability,
* menyederhanakan implementation,
* tidak mengubah product decision.

Developer recommendation **tidak boleh diam-diam mengubah behavior produk**.

---

# 4. ABSOLUTE RULE: DON'T ASSUME

## 4.1 Jangan menebak keputusan yang belum dibuat

Jika sebuah requirement belum ditentukan, jangan memilih sendiri lalu menganggap keputusan tersebut resmi.

Contoh yang termasuk **open decision** dalam dokumen Xolvon:

* final runtime/adapter,
* auth library,
* password hashing strategy,
* QR/payment mechanism,
* payment proof storage,
* assignment submission workflow,
* admin bootstrap,
* final legal copy,
* Solve On route,
* initial content quantity,
* analytics provider,
* external SaaS URL governance.

Handbook secara eksplisit menetapkan bahwa knowledge hole harus dicatat sebagai open decision.

### Jika menemukan ambiguity:

Gunakan pola:

```text
OPEN DECISION

Problem:
Apa yang belum jelas?

Existing Requirement:
Apa yang sudah diketahui?

Options:
Pilihan A
Pilihan B
Pilihan C

Impact:
Apa dampaknya?

Owner:
Siapa yang harus menentukan?

Status:
OPEN / DECIDED
```

Jangan membuat keputusan penting hanya melalui chat.

---

# 5. NO SILENT PRODUCT CHANGE

Developer atau AI tidak boleh diam-diam:

* mengubah wording utama,
* mengubah CTA,
* mengubah navigation,
* menambah halaman,
* menghapus halaman,
* mengubah user flow,
* mengubah payment flow,
* mengubah role behavior,
* mengubah access behavior,
* mengubah data model,
* mengubah business logic.

Perubahan tersebut harus masuk decision log atau mendapatkan approval sesuai ownership.

---

# 6. V1 SCOPE DISCIPLINE

Prioritas V1 Xolvon adalah:

1. Landing Page / Home
2. Portfolio
3. Course
4. ProjectXolvon Marketplace

Pengisian konten Course dapat dilakukan setelah platform siap.

Feature berikut bukan alasan untuk memperbesar V1:

* full automated payment gateway,
* complex community,
* real-time chat,
* advanced personalization,
* complex assignment grading,
* centralized SaaS billing,
* advanced CMS/page builder,
* advanced analytics.

Jangan melakukan scope expansion tanpa keputusan.

---

# 7. NEVER FAKE THE PRODUCT

Dilarang membuat data palsu yang terlihat seperti production data.

Jangan mengarang:

* jumlah user,
* revenue,
* success rate,
* client logo,
* testimonial,
* project result,
* course count,
* student count,
* business metric,
* performance metric,
* social proof.

Jika data belum tersedia:

```text
PLACEHOLDER
```

atau

```text
COMING SOON
```

digunakan secara eksplisit.

Handbook secara tegas melarang developer mengarang angka keberhasilan, user, revenue, testimonial, client logo, maupun result project.

---

# 8. TECH STACK RULES

Baseline frontend:

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
Cloudflare ecosystem
```

Master PRD menetapkan Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, dan mobile-first sebagai baseline frontend.

## 8.1 Tidak boleh menambah library tanpa alasan

Jangan menambahkan dependency baru hanya karena:

* lebih trendy,
* developer terbiasa,
* AI menyarankan,
* komponen terlihat lebih bagus.

Sebelum menambahkan dependency, pastikan:

1. problem memang ada,
2. dependency dibutuhkan,
3. tidak ada existing solution,
4. bundle/maintenance impact masuk akal,
5. architecture tetap konsisten.

---

# 9. COMPONENT-FIRST RULE

Sebelum membuat component baru, cek:

```text
Apakah component serupa sudah ada?
        ↓
YES → reuse / extend
        ↓
NO
        ↓
Apakah component dipakai >1 tempat?
        ↓
YES → buat reusable component
NO → component lokal feature
```

Jangan melakukan copy-paste component yang sama untuk:

```text
Home
Course
Marketplace
Portfolio
Admin
```

jika behavior dan visualnya sebenarnya sama.

---

# 10. COMPONENT OWNERSHIP

Component harus berada di lokasi yang sesuai dengan scope.

Contoh:

```text
components/
├── ui/
├── home/
├── course/
├── marketplace/
├── portfolio/
├── collective/
└── admin/
```

`ui/` berisi primitive/reusable UI.

Feature folder berisi component khusus domain.

Contoh:

```text
components/ui/Button
components/ui/Card
components/ui/Dialog

components/course/CourseCard
components/course/CourseGrid
components/course/CourseProgress

components/portfolio/ProjectCard
components/portfolio/ProjectDetail

components/admin/UserTable
components/admin/OrderTable
```

Struktur repository handbook juga memisahkan UI dan domain component seperti `home`, `course`, `marketplace`, `portfolio`, `collective`, dan `admin`.

---

# 11. NO DUPLICATE DESIGN LANGUAGE

Tidak boleh terdapat:

```text
Button versi Home
Button versi Course
Button versi Portfolio
Button versi Admin
```

jika sebenarnya seluruhnya adalah CTA yang sama.

Jangan membuat:

```text
border-radius: 17px
border-radius: 13px
border-radius: 11px
border-radius: 9px
```

secara random.

Semua visual harus mengikuti:

```text
DESIGN.md
```

---

# 12. DESIGN SYSTEM IS NOT OPTIONAL

Semua UI harus mengikuti `DESIGN.md`.

`DESIGN.md` menjadi sumber utama untuk:

* typography
* color
* spacing
* radius
* shadows
* borders
* buttons
* cards
* inputs
* modal
* navigation
* responsive behavior
* animation

Jangan menggunakan design decision baru hanya karena:

> “AI menghasilkan lebih bagus.”

Bagus secara subjektif tidak berarti konsisten secara system.

---

# 13. XOLVON VISUAL CHARACTER

Karakter visual Xolvon:

```text
Futuristic
Corporate
Simple
Startup

Builder
Professional
Modern
Technical
Minimal
```

Founder menetapkan referensi utama `mulai-ai.pages.dev`, dengan `xolvontesting.web.app` dan `xolvonai.web.app` sebagai referensi isi/struktur.

Dark mode:

```text
Dark Purple / Dark Blue
```

Light mode:

```text
Soft Blue / White
```

Visual tidak boleh berubah menjadi:

* overly playful,
* childish,
* excessive glassmorphism,
* excessive gradients,
* excessive neon,
* excessive animation.

---

# 14. MINIMAL ANIMATION RULE

Animation harus:

```text
Minimal
Smooth
Purposeful
Fast
```

Prioritas:

```text
Clarity
>
Speed
>
Professionalism
>
Decoration
```

Jangan menggunakan animation hanya untuk membuat website terlihat “AI generated”.

Hindari:

* excessive parallax,
* heavy particle effects,
* scroll-jacking,
* animation pada setiap element,
* huge background video,
* excessive hover effects.

Requirement founder memang memprioritaskan clarity, speed, dan professionalism daripada efek berat.

---

# 15. RESPONSIVE-FIRST RULE

Semua page dianggap belum selesai apabila hanya bagus di desktop.

Minimum test:

```text
320px
390px
768px
1024px
1440px
Large Desktop
```

Handbook menetapkan minimum responsive test tersebut.

## Mobile-first

Urutan pemikiran:

```text
Mobile
↓
Tablet
↓
Desktop
↓
Large Desktop
```

Bukan:

```text
Desktop
↓
dipaksa menjadi mobile
```

---

# 16. RESPONSIVE BEHAVIOR

Ketika screen mengecil:

Jangan sekadar:

```css
width: 100%;
```

Pastikan juga:

* hierarchy berubah dengan benar,
* navigation tetap usable,
* CTA tetap mudah ditemukan,
* typography tetap readable,
* card tidak overflow,
* table memiliki strategy,
* carousel tetap usable,
* modal tidak keluar viewport,
* form tetap mudah digunakan,
* content order tetap logical.

---

# 17. ACCESSIBILITY IS PART OF THE FEATURE

Accessibility bukan finishing step.

Wajib:

* keyboard navigation,
* visible focus state,
* semantic HTML,
* meaningful alt text,
* accessible forms,
* accessible buttons,
* accessible dialogs,
* touch-friendly carousel,
* keyboard-friendly carousel,
* reduced-motion support.

Handbook menetapkan keyboard accessibility, visible focus, alt text, touch/keyboard carousel, dan `prefers-reduced-motion`.

---

# 18. SERVER / CLIENT BOUNDARY

Frontend bukan security boundary.

Jangan pernah menganggap:

```text
hidden button
disabled button
hidden route
obfuscated URL
```

sebagai security.

Authorization harus dilakukan server-side.

Role:

```text
user
admin
```

Role wajib diverifikasi di server.

---

# 19. CLIENT MUST NEVER OWN SECURITY

Client tidak boleh menentukan:

```text
"isAdmin"
"hasAccess"
"canPublish"
"canActivate"
"canDownloadPremium"
```

sebagai sumber kebenaran.

Client hanya menampilkan state yang sudah diberikan oleh server.

Server tetap melakukan authorization.

---

# 20. ADMIN ACCESS

Route internal:

```text
/67
```

hanya entry point/obfuscation.

`/67` bukan security mechanism.

Admin tetap harus melewati:

```text
Authentication
↓
Authorization
↓
Admin Role Check
↓
Protected Admin Operation
```

Handbook secara eksplisit menyatakan `/67` bukan mekanisme keamanan.

---

# 21. PREMIUM CONTENT RULE

Course premium menggunakan private storage.

Video premium tidak boleh:

```text
public URL
permanent URL
client-owned credential
```

Flow:

```text
User
↓
Authentication
↓
Enrollment Check
↓
Lesson Check
↓
Server generates short-lived signed URL
↓
Browser plays media
```

Signed URL harus berumur pendek dan dibuat ulang ketika diperlukan.

User yang tidak memiliki enrollment aktif tidak boleh memperoleh signed URL.

Handbook menetapkan flow tersebut secara eksplisit.

---

# 22. NO SECRET IN FRONTEND

Jangan pernah memasukkan:

* API secret,
* Cloudflare credential,
* session signing secret,
* storage credential,
* password,
* private key,
* internal token,

ke:

```text
client component
browser bundle
public environment variable
console.log
screenshot
Git repository
```

Production secrets tidak boleh masuk Git atau browser bundle.

---

# 23. DATA CONTRACT RULE

FE harus mengikuti `SCHEMA.md`.

Jangan menganggap sebuah field tersedia jika field tersebut tidak didefinisikan dalam contract.

Contoh:

Jika schema hanya memiliki:

```text
course.title
course.description
course.price
```

FE tidak boleh tiba-tiba menggunakan:

```text
course.rating
course.studentCount
course.discount
course.instructor
```

kecuali field tersebut sudah disepakati dan dimasukkan ke contract.

---

# 24. NO FRONTEND-ONLY DATA INVENTION

Jangan membuat business data sebagai:

```ts
const fakeCourses = [...]
const fakeRevenue = [...]
const fakeUsers = [...]
const fakeTestimonials = [...]
```

dan kemudian menggunakannya seolah-olah production data.

Mock data hanya boleh digunakan apabila:

1. jelas ditandai sebagai mock,
2. digunakan untuk local development/testing,
3. tidak lolos ke production.

---

# 25. DYNAMIC CONTENT RULE

Content yang memang ditujukan dynamic harus berasal dari system.

Minimal domain dynamic:

* Course
* Lesson
* Project
* Marketplace Item
* Collective Member

Founder requirements secara eksplisit menetapkan content management tersebut harus benar-benar dynamic dan dapat dikelola melalui Admin Dashboard.

Jangan hardcode content production ke component apabila content tersebut dimaksudkan untuk dikelola admin.

---

# 26. ROUTE RULE

Gunakan route yang telah disepakati.

Public:

```text
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

Protected user:

```text
/dashboard
/learn/[courseSlug]/[lessonId]
```

Admin:

```text
/67
/admin/login
/admin
```

Route contract yang lebih lengkap tersedia di PRD/Handbook.

---

# 27. SLUG RULE

Public detail page harus menggunakan slug yang stabil.

Contoh:

```text
/course/ai-whatsapp-automation
/portfolio/cafemargin
/marketplace/lead-hunter
/collective/farsya
```

Jangan menggunakan database primary key sebagai public identity apabila slug yang bersih tersedia.

Handbook menetapkan slug stabil untuk sharing dan SEO.

---

# 28. SEARCH & FILTER RULE

Search wajib tersedia pada area yang relevan.

Minimal area:

```text
Course
Portfolio
Marketplace
```

Search/filter state harus dapat dibagikan melalui URL.

Contoh:

```text
/portfolio?q=ai&sort=latest
/course?q=automation&status=published
/marketplace?q=crm&sort=latest
```

---

# 29. LOADING STATE RULE

Setiap asynchronous UI harus mempertimbangkan loading state.

Jangan membuat user melihat:

```text
blank screen
layout jump
unexplained spinner
```

Gunakan loading UI yang sesuai dengan component.

Contoh:

```text
Page loading
→ skeleton

Table loading
→ row skeleton

Card loading
→ card skeleton

Button mutation
→ disabled + loading state
```

---

# 30. ERROR STATE RULE

Error state harus actionable dan tidak membocorkan internal information.

Minimum behavior:

### 404

```text
Jelaskan resource tidak ditemukan.
Berikan navigation kembali.
```

### 401

```text
Redirect ke login.
Pertahankan intended destination bila aman.
```

### 403

```text
Jelaskan bahwa account tidak memiliki akses.
Jangan membocorkan detail sensitif.
```

### Upload Error

```text
Berikan alasan yang actionable.
Jangan tampilkan credential/storage internals.
```

### Signed URL Expired

```text
Request signed URL baru melalui server
jika entitlement masih aktif.
```

Standar error/empty state tersebut berasal dari Handbook.

---

# 31. EMPTY STATE RULE

Empty state bukan error.

Contoh:

```text
Belum ada course.
Belum ada portfolio.
Tidak ada hasil search.
Belum ada enrollment.
Belum ada project.
```

Harus menjelaskan:

1. kondisi saat ini,
2. apa yang dapat dilakukan user,
3. CTA jika ada.

Untuk search kosong, tampilkan query dan tombol reset filter.

---

# 32. TOAST / NOTIFICATION RULE

Feedback action penting harus memiliki notification/toast.

Contoh:

```text
Course saved
Course published
Course unpublished
Profile updated
Access activated
Access revoked
Upload completed
Upload failed
```

Founder requirement menetapkan notification/toast system diperlukan untuk feedback user/admin.

---

# 33. FORM RULE

Semua form harus memiliki:

```text
label
validation
loading state
success state
error state
disabled state
```

Jangan bergantung pada placeholder sebagai satu-satunya label.

Jangan membiarkan user submit berkali-kali pada operation yang sensitif.

---

# 34. PAYMENT FLOW RULE

V1 payment flow:

```text
Register/Login
↓
Choose Course
↓
Checkout
↓
QR / Payment Instruction
↓
User Pays
↓
WhatsApp Xolvon
↓
Admin Verification
↓
Admin Activation
↓
User Dashboard
↓
Course Access
```

Flow ini adalah keputusan produk dan tidak boleh diubah oleh FE secara sepihak.

FE tidak boleh membuat:

```text
automatic payment confirmation
automatic enrollment
centralized SaaS payment
```

kecuali requirement telah diubah secara resmi.

---

# 35. MARKETPLACE RULE

Marketplace Xolvon adalah:

```text
Catalog
+
Showcase
+
Discovery
+
External Redirect
```

Bukan:

```text
Transaction Marketplace
```

Ketika user tertarik:

```text
Marketplace Detail
↓
SaaS CTA
↓
External SaaS Website
```

Xolvon tidak memproses subscription SaaS secara terpusat pada V1.

---

# 36. COLLECTIVE RULE

Collective adalah bagian dari evidence graph Xolvon.

Relationship:

```text
Project
 ↕
Contributor
 ↕
Project
```

Project dapat menunjukkan contributor dan role.

Member profile dapat menunjukkan project yang terkait.

Founder requirement menetapkan relasi member ↔ project tersebut sebagai bagian penting Collective/Portfolio.

Jangan membuat profile member sebagai halaman yang berdiri sendiri tanpa relationship context.

---

# 37. SEO RULE

Semua public page harus dipikirkan sebagai halaman yang dapat ditemukan dan dibagikan.

Public page memerlukan:

* unique title,
* meta description,
* Open Graph metadata,
* canonical URL,
* appropriate indexing behavior.

Sitemap hanya untuk halaman public yang published.

Jangan index:

```text
/admin
/dashboard
/learn
/private
draft
unpublished content
```

Handbook menetapkan aturan SEO dan index tersebut.

---

# 38. CONTENT TRUTH RULE

SEO copy, marketing copy, CTA, dan component text tidak boleh mengklaim sesuatu yang belum terbukti.

Jangan menulis:

```text
10,000+ users
500+ businesses
97% success rate
Generated Rp 1B
Trusted by 100+ companies
```

apabila data tersebut tidak benar-benar tersedia.

---

# 39. PERFORMANCE RULE

Jangan membuat website berat hanya karena teknologi memungkinkan.

Prioritas:

```text
Fast
Simple
Efficient
Maintainable
```

Hindari:

* unnecessary client JavaScript,
* giant bundle,
* large default hero video,
* unnecessary animation,
* unnecessary library,
* unnecessary state management,
* unnecessary network request.

Handbook secara eksplisit meminta optimasi image payload, route latency, D1 query count, Worker CPU, dan perilaku upload/download.

---

# 40. MEDIA RULE

Media harus diperlakukan berdasarkan jenisnya:

```text
Public Marketing Asset
Private Premium Asset
```

Premium content:

```text
private R2 object
+
short-lived signed URL
```

Jangan mengunduh seluruh file premium ke Worker kemudian mem-proxy ulang ke browser.

---

# 41. NO UNNECESSARY CLIENT COMPONENT

Jangan menggunakan `"use client"` hanya karena:

```text
AI default
```

atau karena component berada di frontend.

Gunakan Client Component ketika memang memerlukan:

* interaction,
* browser API,
* client state,
* event handler,
* interactive carousel,
* modal/dialog state,
* animation yang memerlukan client runtime.

Data fetching dan server-sensitive logic harus tetap berada pada server boundary sesuai architecture.

---

# 42. SERVER DATA RULE

Frontend tidak boleh mengakses database secara sembarangan dari browser.

Jangan:

```text
Browser
↓
D1 directly
```

Gunakan architecture yang disepakati:

```text
UI
↓
Server Action / API
↓
Authorization
↓
Validation
↓
Business Logic
↓
D1 / R2
```

---

# 43. AUTHENTICATION RULE

Xolvon memiliki dua role utama:

```text
user
admin
```

Public registration hanya boleh membuat:

```text
role = user
```

Admin tidak boleh dibuat melalui loophole public registration.

Admin creation harus melalui controlled process.

Role check harus dilakukan server-side.

---

# 44. AUTH UI RULE

Admin login tidak boleh tampil pada public navigation.

Public navigation:

```text
Home
Solve On
Course
Marketplace
About
Login
```

Admin login berada pada flow terpisah.

---

# 45. USER DASHBOARD RULE

Minimum user dashboard:

```text
My Courses
Progress
Continue Learning
```

Tambahan dapat mencakup:

```text
Profile
Activation Status
Purchase / Activation History
Support
```

Status payment/activation harus cukup jelas sehingga user memahami action berikutnya.

---

# 46. ADMIN DASHBOARD RULE

Admin Dashboard adalah:

```text
Operational Tool
```

bukan:

```text
Second Landing Page
```

Prioritas:

```text
Table
Search
Filter
Status
Actions
Confirmation
Audit Trail
```

Bukan card dekoratif berlebihan.

Admin dapat mengelola:

* user,
* orders,
* activation,
* courses,
* lessons,
* media,
* portfolio,
* marketplace,
* collective,
* analytics.

---

# 47. ADMIN MUTATION RULE

Setiap mutation penting harus melewati:

```text
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
Audit Log bila required
```

Contoh:

```text
Publish Course
Activate Enrollment
Revoke Enrollment
Delete Project
Change Role
```

Tidak boleh ada mutation sensitif yang hanya bergantung pada client UI.

---

# 48. IDEMPOTENCY RULE

Operation yang seharusnya hanya menghasilkan satu state tidak boleh menggandakan data ketika ditekan dua kali.

Contoh:

```text
Activate enrollment
```

dua kali tidak boleh membuat:

```text
duplicate enrollment
```

Handbook secara khusus menetapkan activation harus idempotent.

---

# 49. IDOR RULE

Jangan menganggap:

```text
/user/123
/course/123
/order/123
```

aman hanya karena ID sulit ditebak.

Server harus memastikan user memang berhak terhadap resource tersebut.

User A tidak boleh memperoleh data User B hanya dengan mengganti:

```text
ID
slug
route parameter
query parameter
```

IDOR protection adalah security requirement wajib.

---

# 50. INPUT SAFETY

Input user-controlled harus dianggap tidak terpercaya.

Jangan membuat query SQL dengan string concatenation.

Gunakan:

```text
prepared statements
bind parameters
```

Schema change dilakukan melalui migration, bukan request web normal.

---

# 51. OBJECT STORAGE SAFETY

Upload tidak boleh percaya filename user sebagai storage path.

Gunakan:

```text
generated object key
```

Upload harus memiliki:

* MIME allowlist,
* extension allowlist,
* size limit,
* intended prefix,
* authorization,
* appropriate confirmation.

R2 credentials tidak boleh dikirim ke browser.

---

# 52. ENVIRONMENT RULE

Pisahkan:

```text
LOCAL
STAGING
PRODUCTION
```

Jangan menggunakan production secret pada local repository.

Jangan memasukkan production secret ke:

```text
Git
screenshots
logs
client bundle
documentation public
```

Binding name harus konsisten antara:

```text
code
Wrangler configuration
documentation
```

---

# 53. GIT RULE

Gunakan:

```text
feature branch
```

Bukan direct development di `main`.

Contoh:

```text
feature/course-catalog
feature/marketplace
feature/portfolio-detail
feature/admin-users
fix/mobile-navbar
fix/course-loading-state
```

---

# 54. MAIN BRANCH RULE

Dilarang melakukan direct merge ke `main` tanpa review.

Master PRD mensyaratkan cross-review sebelum kode digabung ke branch utama.

---

# 55. OWNERSHIP RULE

Setiap modul harus mempunyai:

```text
Owner
Reviewer
```

Contoh:

```text
Course
Owner: FE-01
Reviewer: FE-02

Marketplace
Owner: FE-02
Reviewer: FE-03
```

Ownership tidak berarti developer tersebut bebas mengubah contract.

Owner bertanggung jawab terhadap quality.

---

# 56. COMMIT RULE

Commit harus kecil dan deskriptif.

Buruk:

```text
update
fix
done
test
changes
```

Lebih baik:

```text
feat(course): add responsive course grid
fix(navbar): prevent mobile overflow
feat(portfolio): add project detail layout
fix(auth): handle unauthorized dashboard state
```

Satu commit sebaiknya memiliki satu tujuan yang jelas.

---

# 57. PULL REQUEST RULE

Setiap PR harus menjelaskan:

```text
What changed?
How was it tested?
Screenshot / recording if UI changed
Known limitation
Potential impact
```

Jangan membuat PR yang:

```text
massive
unreviewable
mixed-feature
```

---

# 58. BREAKING CHANGE RULE

Perubahan yang dapat memengaruhi modul lain harus diberitahukan.

Contoh:

* schema berubah,
* API contract berubah,
* component API berubah,
* route berubah,
* auth behavior berubah,
* prop type berubah,
* shared component berubah,
* environment binding berubah.

Breaking change harus:

```text
documented
communicated
reviewed
```

---

# 59. AI VIBE CODING PROTOCOL

Setiap AI Coding Agent yang bekerja di repository Xolvon wajib mengikuti urutan:

```text
STEP 1
Read RULES.md

STEP 2
Read PRD.md

STEP 3
Read SCHEMA.md

STEP 4
Read DESIGN.md

STEP 5
Read ARCHITECTURE.md

STEP 6
Inspect existing code

STEP 7
Identify affected route

STEP 8
Identify affected components

STEP 9
Identify affected schema / API

STEP 10
Implement minimum required change

STEP 11
Run tests / build / lint sesuai setup

STEP 12
Inspect responsive behavior

STEP 13
Inspect affected existing flows

STEP 14
Report files changed + limitation
```

AI tidak boleh langsung coding berdasarkan prompt user tanpa membaca context repository.

---

# 60. AI MUST NOT INVENT

AI dilarang mengarang:

```text
feature
business rule
database field
API endpoint
user role
permission
pricing
testimonial
statistic
project result
client logo
success metric
course data
admin capability
```

kecuali telah didefinisikan di source of truth.

---

# 61. AI MUST REUSE

Sebelum AI membuat component baru, AI harus mencari:

```text
existing component
existing utility
existing hook
existing pattern
existing token
existing API contract
```

Prioritas:

```text
Reuse
↓
Extend
↓
Refactor
↓
Create new
```

Bukan:

```text
Create new
Create new
Create new
```

---

# 62. AI CHANGE MINIMIZATION

AI harus melakukan perubahan seminimal mungkin.

Jangan ketika diminta:

```text
"fix navbar mobile"
```

kemudian AI mengubah:

```text
navbar
footer
theme
button
spacing
homepage
routing
```

Perubahan harus terlokalisasi pada problem yang diminta kecuali dependency memang membutuhkan perubahan lebih luas.

---

# 63. AI MUST PRESERVE EXISTING BEHAVIOR

Jika feature sebelumnya bekerja:

```text
jangan rusak
```

hanya karena AI sedang mengubah feature lain.

Setelah perubahan:

```text
test changed feature
+
test affected neighboring feature
```

---

# 64. AI SHOULD NOT REWRITE WORKING CODE

Jangan rewrite:

```text
entire page
entire component tree
entire styling system
```

hanya karena AI mempunyai pendekatan yang berbeda.

Refactor besar harus memiliki alasan.

---

# 65. NO MASSIVE GENERATED FILES

Jangan menghasilkan component file raksasa yang melakukan:

```text
fetching
business logic
database access
validation
UI
animation
modal
form
table
```

semuanya sekaligus.

Pisahkan berdasarkan responsibility sesuai `ARCHITECTURE.md`.

---

# 66. NAMING RULE

Gunakan naming yang jelas dan konsisten.

Component:

```text
PascalCase
```

Variable/function:

```text
camelCase
```

Route:

```text
kebab-case
```

Constant:

```text
UPPER_SNAKE_CASE
```

Jangan membuat naming campur:

```text
Coursecard
courseCard
COURSECARD
course-card-component
```

untuk konsep yang sama.

---

# 67. TYPE SAFETY RULE

TypeScript harus digunakan untuk mencegah contract ambiguity.

Hindari:

```ts
any
```

tanpa alasan yang valid.

Jangan menyelesaikan type error dengan:

```ts
as any
```

hanya agar build lolos.

Type error harus dipahami, bukan disembunyikan.

---

# 68. NO UNNECESSARY DUPLICATION

Jika logic yang sama muncul tiga kali:

```text
extract
```

Jika visual yang sama muncul tiga kali:

```text
componentize
```

Jika data contract sama:

```text
reuse type
```

DRY bukan berarti semua hal dipaksa menjadi satu abstraction.

Gunakan abstraction ketika abstraction tersebut memang membuat sistem lebih konsisten dan mudah dirawat.

---

# 69. UX CONSISTENCY RULE

Behavior yang sama harus terasa sama.

Contoh:

Semua delete:

```text
confirmation
↓
loading
↓
success/error feedback
```

Semua save:

```text
save
↓
loading
↓
feedback
```

Semua unauthorized:

```text
consistent unauthorized behavior
```

Jangan membuat satu halaman menggunakan modal sementara halaman lain langsung menghapus tanpa confirmation apabila action dan risk-nya sama.

---

# 70. CONTENT HIERARCHY RULE

Setiap halaman harus memiliki hierarchy yang jelas:

```text
Page Title
↓
Context / Description
↓
Primary Content
↓
Primary Action
↓
Secondary Information
```

Jangan membuat semua teks terlihat seperti headline.

Gunakan hierarchy typography sesuai `DESIGN.md`.

---

# 71. NAVIGATION RULE

Public navigation harus konsisten.

Baseline:

```text
Home
Solve On
Course
Marketplace
About
Login
```

Admin login tidak ditampilkan pada public navigation.

Jangan membuat navbar berbeda antar public page tanpa alasan product/UX yang jelas.

---

# 72. CTA RULE

CTA harus memiliki hierarchy.

Jangan membuat:

```text
10 button semuanya Primary
```

Gunakan:

```text
Primary CTA
Secondary CTA
Tertiary action
```

Primary CTA harus jelas secara visual.

---

# 73. FOOTER RULE

Footer harus konsisten di public pages.

Baseline footer:

* Xolvon description,
* Terms & Conditions,
* Privacy/Disclaimer,
* contact,
* social link,
* copyright.

Legal copy final harus menggunakan copy khusus Xolvon, bukan menyalin platform lain.

---

# 74. REFERENCE WEBSITE RULE

Website referensi digunakan untuk:

```text
inspiration
layout idea
interaction pattern
content structure
efficiency reference
```

Bukan untuk copy-paste mentah.

Reference:

```text
mulai-ai.pages.dev
→ primary visual/efficiency reference

xolvontesting.web.app
→ content/structure inspiration

xolvonai.web.app
→ content/structure inspiration
```

Founder menetapkan hierarchy referensi tersebut.

---

# 75. DESIGN REFERENCE ≠ PRODUCT REQUIREMENT

Jika website referensi mempunyai:

```text
feature X
```

Xolvon tidak otomatis mempunyai feature X.

Reference website tidak boleh digunakan sebagai alasan untuk mengubah product scope.

---

# 76. SEO ≠ MARKETING FABRICATION

SEO tidak boleh dijadikan alasan mengarang:

```text
claims
stats
outcomes
social proof
```

Structured data hanya digunakan apabila data memang sesuai dengan schema dan nyata.

---

# 77. DATA LOADING RULE

UI tidak boleh menampilkan data private sebelum authorization selesai.

Flow:

```text
Request
↓
Authorization
↓
Data
↓
Render
```

Bukan:

```text
Render private data
↓
hide data using frontend
```

---

# 78. PROTECTED PAGE RULE

Untuk protected page:

```text
Unauthenticated
→ login

Authenticated but unauthorized
→ 403 / appropriate state

Authorized
→ render
```

Request ke `/dashboard` tanpa auth harus ditolak/diarahkan ke login. User biasa tidak boleh melakukan admin mutation.

---

# 79. PUBLIC DATA RULE

Public page hanya boleh menerima public-safe fields.

Jangan mengirim:

```text
password_hash
session token
private audit information
secret
internal credential
```

ke client.

Sensitive field tersebut secara eksplisit dilarang dikirim ke client.

---

# 80. LOGGING RULE

Jangan `console.log()`:

```text
password
token
secret
authorization header
signed credentials
private user data
```

Debugging harus aman.

Production logging tidak boleh membocorkan internal details.

---

# 81. ERROR MESSAGE RULE

User-facing error:

```text
human readable
actionable
safe
```

Internal error:

```text
developer-visible
structured
safe
```

Jangan tampilkan:

```text
stack trace
database query
Cloudflare credentials
bucket internals
session internals
```

---

# 82. DATABASE CHANGE RULE

Frontend developer tidak boleh mengubah database schema sebagai side effect dari feature UI.

Jika membutuhkan field baru:

```text
SCHEMA change request
↓
Backend/DB review
↓
Migration
↓
SCHEMA.md update
↓
FE implementation
```

Schema change wajib menggunakan migration file.

---

# 83. API / SERVER ACTION CHANGE RULE

Jika frontend membutuhkan server contract baru:

```text
Define contract
↓
Review
↓
Implement server
↓
Document contract
↓
Consume from FE
```

Jangan membuat FE contract berdasarkan asumsi.

---

# 84. OPEN DECISION RULE

Jika developer membutuhkan keputusan yang belum ada:

Jangan:

```text
"gue anggap aja..."
```

Gunakan:

```text
OPEN DECISION
```

Lalu catat:

```text
Owner
Options
Decision
Date
Impact
```

Handbook menetapkan semua keputusan penting harus masuk decision log dan tidak hanya disimpan di chat.

---

# 85. DEFINITION OF DONE

Sebuah frontend task tidak dianggap selesai hanya karena:

```text
"it works on my laptop."
```

Minimum:

### Functional

Feature berjalan pada Local Run tanpa error yang relevan.

### Responsive

UI tidak pecah dari minimal 320px hingga desktop.

### Security

Protected behavior tetap protected.

### Quality

Code dapat direview.

### Regression

Existing affected behavior tetap bekerja.

Master PRD menetapkan functional, responsive, security, dan cross-review sebagai bagian Definition of Done.

---

# 86. REQUIRED TESTING BEFORE PR

Minimal test:

```text
1. Happy path
2. Loading state
3. Empty state
4. Error state
5. Unauthorized state bila relevant
6. Mobile
7. Desktop
8. Existing affected flow
```

Untuk feature yang menyentuh auth/data:

```text
9. Authorization behavior
10. Invalid input
```

---

# 87. CRITICAL PRODUCT FLOWS

Jangan merusak flow utama:

### Course

```text
Guest
→ Course
→ Register
→ Checkout
→ WhatsApp
→ Admin Verify
→ Activate
→ Dashboard
→ Lesson
→ Video
```

### Admin Course

```text
Admin
→ /67
→ Login
→ Create Course
→ Upload Video
→ Publish
→ Public Course
```

### Portfolio / Collective

```text
Admin
→ Create Project
→ Assign Collective
→ Publish
→ Portfolio Detail
→ Team
→ Member Profile
→ Related Project
```

### Marketplace

```text
Admin
→ Create Listing
→ Publish
→ Detail
→ SaaS CTA
→ External SaaS
```

Flow tersebut merupakan acceptance flow utama Handbook.

---

# 88. DO NOT BREAK SEARCH

Search/filter harus tetap:

```text
functional
shareable
consistent
```

Jangan membuat filter hanya mengubah state lokal apabila requirement mengharuskan URL dapat dibagikan.

---

# 89. DO NOT BREAK RELATIONSHIP GRAPH

Perubahan Portfolio, Collective, dan Marketplace harus mempertahankan relationship yang sudah ditentukan.

Target experience:

```text
Project
↓
Team Member
↓
Member Profile
↓
Related Projects
```

Xolvon harus dapat menunjukkan siapa yang membangun project dan role mereka.

---

# 90. LOCAL → STAGING → PRODUCTION

Jangan menganggap:

```text
local works
=
production ready
```

Environment:

```text
LOCAL
↓
STAGING
↓
PRODUCTION
```

Local:

```text
core flow
local migrations
local data
```

Staging:

```text
Cloudflare runtime
D1
R2
auth
upload
private media
```

Production:

```text
custom domain
HTTPS
DB
storage
secrets
SEO
monitoring
rollback
```

Roadmap environment tersebut ditetapkan dalam Handbook.

---

# 91. DEPLOYMENT ARCHITECTURE MUST NOT BE GUESSED

Jangan menganggap deployment path tanpa keputusan resmi.

Handbook mencatat bahwa runtime/adapter final merupakan technical decision yang harus dikunci WebDev Lead, termasuk:

```text
runtime
adapter
D1 binding
R2 binding
session/auth
local/staging/production consistency
```

Pilihan runtime harus didasarkan pada fitur yang benar-benar digunakan.

---

# 92. NO "FAMILIARITY-BASED ENGINEERING"

Jangan memilih teknologi:

```text
karena paling familiar
```

Pilih berdasarkan:

```text
product requirement
runtime compatibility
security
performance
maintainability
deployment needs
```

---

# 93. PR REVIEW QUESTIONS

Reviewer wajib dapat menjawab:

```text
Apakah feature sesuai PRD?

Apakah data sesuai SCHEMA?

Apakah UI sesuai DESIGN?

Apakah implementation sesuai ARCHITECTURE?

Apakah security boundary tetap benar?

Apakah mobile bekerja?

Apakah error/loading/empty state ada?

Apakah ada fake data?

Apakah ada dependency baru?

Apakah ada breaking change?

Apakah feature existing tetap bekerja?
```

Jika jawaban tidak jelas:

```text
DO NOT MERGE YET
```

---

# 94. AI FINAL RESPONSE FORMAT

Setiap AI Coding Agent setelah melakukan perubahan sebaiknya melaporkan:

```text
## Changed

- file/path
- file/path

## What Changed

- summary

## Tested

- local
- responsive
- affected flow

## Open Decision

- none
atau
- describe unresolved issue

## Known Limitation

- none
atau
- describe limitation
```

AI tidak boleh mengatakan:

```text
"Done."
```

tanpa menjelaskan apa yang berubah dan apa yang diuji.

---

# 95. PROHIBITED BEHAVIOR

Berikut dianggap violation:

```text
❌ Hardcode production data yang seharusnya dynamic
❌ Fake metrics
❌ Fake testimonials
❌ Fake client logos
❌ Fake user counts
❌ Menambah feature tanpa requirement
❌ Mengubah user flow tanpa approval
❌ Mengirim secret ke client
❌ Menganggap hidden UI sebagai security
❌ Client menentukan authorization
❌ Public URL untuk premium media
❌ Direct merge ke main
❌ Copy-paste component tanpa alasan
❌ Duplicate design language
❌ Ignore mobile
❌ Ignore loading/error/empty state
❌ Menambah dependency tanpa kebutuhan
❌ Mengubah schema secara diam-diam
❌ Menggunakan `any` untuk menghilangkan error tanpa alasan
❌ Rewrite seluruh codebase untuk perubahan kecil
❌ Menebak open decision
❌ Membocorkan internal error ke user
```

---

# 96. PRIORITY WHEN RULES COLLIDE

Jika terjadi konflik, gunakan urutan berikut:

```text
1. Security
2. Explicit Founder/Product Decision
3. PRD
4. Architecture Contract
5. Schema Contract
6. Design System
7. Performance / Maintainability
8. Developer Preference
```

Developer preference selalu berada paling bawah.

---

# 97. WHAT "GOOD FE" MEANS AT XOLVON

Frontend yang baik bukan frontend yang:

```text
paling banyak animation
paling banyak component
paling modern library
paling kompleks architecture
paling banyak feature
```

Frontend yang baik adalah frontend yang:

```text
Consistent
Fast
Responsive
Accessible
Secure
Maintainable
Clear
Professional
Functional
```

dan tetap terasa sebagai **satu Xolvon.com** walaupun dibuat oleh banyak developer.

---

# 98. FINAL AI INSTRUCTION

Setiap kali AI akan mengubah repository Xolvon, AI harus mengikuti prinsip ini:

```text
READ
UNDERSTAND
INSPECT
REUSE
IMPLEMENT
TEST
REVIEW
REPORT
```

Bukan:

```text
PROMPT
↓
GENERATE
↓
DONE
```

AI Coding Agent adalah executor.

AI bukan product owner.

AI bukan design owner.

AI bukan security owner.

AI tidak boleh membuat keputusan bisnis yang belum disetujui.

---

# 99. GOLDEN RULE

> **Jangan pernah membuat keputusan diam-diam yang akan membuat developer berikutnya percaya bahwa keputusan tersebut memang sudah disepakati.**

Setiap keputusan baru harus terlihat.

Setiap perubahan contract harus terdokumentasi.

Setiap ambiguity harus diberi label.

Setiap security boundary harus dipertahankan.

Setiap reusable pattern harus digunakan kembali.

Setiap feature harus tetap terasa sebagai bagian dari Xolvon.

---

# 100. DEFINITION OF CONSISTENT VIBE CODING

Vibe Coding Xolvon dianggap konsisten apabila:

```text
Developer A membuat Course
+
Developer B membuat Portfolio
+
Developer C membuat Marketplace
+
AI Agent memperbaiki Mobile UI

                    ↓

Semua hasil tetap terasa:

        ONE PRODUCT
        ONE DESIGN SYSTEM
        ONE DATA CONTRACT
        ONE ARCHITECTURE
        ONE ENGINEERING STANDARD
```

Target akhir bukan sekadar:

```text
"semua fitur selesai"
```

Target akhir adalah:

```text
"semua fitur terasa dibuat oleh satu tim."
```

---

# DOCUMENT DEPENDENCY

`RULES.md` harus dibaca bersama:

```text
.ai/
├── RULES.md
├── PRD.md
├── SCHEMA.md
├── DESIGN.md
└── ARCHITECTURE.md
```

### RULES.md

Menentukan **apa yang boleh dan tidak boleh dilakukan**.

### PRD.md

Menentukan **apa yang harus dibangun**.

### SCHEMA.md

Menentukan **data apa yang tersedia dan bagaimana kontraknya**.

### DESIGN.md

Menentukan **bagaimana produk harus terlihat dan berinteraksi**.

### ARCHITECTURE.md

Menentukan **bagaimana sistem diimplementasikan**.

Jika salah satu dokumen bertentangan dengan dokumen lain, **jangan diam-diam memilih salah satunya**. Identifikasi conflict, cek source-of-truth hierarchy, dan apabila belum terselesaikan tandai sebagai:

```text
OPEN DECISION / DOCUMENT CONFLICT
```

---

# END OF RULES.md
