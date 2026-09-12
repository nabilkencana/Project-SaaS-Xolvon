# PRD.md

# XOLVON.COM

## PRODUCT REQUIREMENTS DOCUMENT

**Project:** Xolvon.com
**Legal Entity:** PT Xolvon Kehidupan Cerdas Abadi
**Product:** AI Business Collective
**Document Type:** Product Requirements Document / Product Contract
**Status:** Master Product Contract
**Version:** V1
**Target Development Window:** 27 Agustus 2026 – 14 September 2026
**Primary Audience:** Product Owner, Founder, Frontend, Backend, Database, Security, QA, AI Coding Agent

---

# 0. PURPOSE OF THIS DOCUMENT

`PRD.md` adalah kontrak mengenai **apa yang harus dibangun oleh Xolvon.com**.

Dokumen ini mendefinisikan:

* identitas produk,
* tujuan bisnis,
* target audience,
* positioning,
* product scope,
* information architecture,
* route,
* role,
* permission secara high-level,
* user flow,
* page requirement,
* feature requirement,
* content requirement,
* state requirement,
* acceptance criteria,
* V1 scope,
* V2 boundary,
* open decision.

Dokumen ini **tidak menjadi tempat utama untuk**:

* design token,
* warna detail,
* typography scale,
* component API,
* database migration,
* SQL implementation,
* server architecture detail,
* deployment configuration,
* code convention.

Hal-hal tersebut harus mengikuti:

```text
RULES.md
SCHEMA.md
DESIGN.md
ARCHITECTURE.md
```

---

# 1. PRODUCT DEFINITION

## 1.1 Apa itu Xolvon.com?

Xolvon.com adalah website utama dari **Xolvon AI Business Collective**.

Xolvon bukan sekadar:

```text
Company Profile
```

dan bukan sekadar:

```text
AI Course Website
```

Xolvon adalah sebuah ecosystem yang menggabungkan:

```text
Education
Software / SaaS Showcase
Media / Acquisition
Collective
```

Master PRD mendefinisikan Xolvon sebagai AI Business Collective yang menjembatani masyarakat Indonesia untuk mengubah AI dan web coding menjadi sistem nyata yang dapat menghasilkan income.

---

# 2. OFFICIAL POSITIONING

## 2.1 Hero Positioning

Primary positioning:

> **Solve On Society Conundrums / Human-AI Collaboration**

Hero CTA:

> **Explore Xolvon**

Requirement tersebut merupakan keputusan founder yang sudah dikonfirmasi.

---

# 3. SOLVE ON POSITIONING

Solve On merupakan representation dari capability Xolvon dalam membangun sistem end-to-end.

Primary terminology:

> **Human-AI End-to-End Attention Systems**

Supporting identity:

> **67 Alpha-stage Digital Production Lab**

Maknanya adalah Xolvon membangun sistem yang menyelesaikan masalah nyata menggunakan pendekatan:

```text
Human
+
AI
+
Data
+
Collaboration
+
End-to-End Production
```

Requirement founder menetapkan positioning tersebut sebagai bagian inti Solve On.

---

# 4. NORTH STAR

Xolvon.com harus terasa sebagai:

> **Living Digital Production Collective**

bukan:

> **Static Company Website**

Pengunjung baru harus dapat memahami dengan cepat:

```text
1. Masalah apa yang Xolvon selesaikan?
2. Apa yang sudah Xolvon bangun?
3. Siapa yang membangun?
4. Apa yang dapat dipelajari?
5. Produk apa yang tersedia?
6. Ke mana user harus bergerak berikutnya?
```

North Star experience ini berasal dari Handbook implementasi.

---

# 5. BUSINESS OBJECTIVES

Xolvon.com memiliki lima objective utama.

## 5.1 Showcase

Menunjukkan:

* project,
* capabilities,
* software,
* Collective,
* production evidence.

## 5.2 Brand Awareness

Membuat orang mengenali Xolvon hanya dengan mengetahui:

```text
xolvon.com
```

## 5.3 Client Acquisition

Website harus menjadi proof untuk mendapatkan client dari berbagai bidang.

## 5.4 Course Revenue

Website menjadi platform untuk menghasilkan revenue dari Course.

## 5.5 Collective Representation

Website menjadi representasi publik dari manusia dan production engine yang membangun sistem Xolvon.

Founder secara eksplisit menyebut showcase, brand awareness, client acquisition, Course revenue, dan Collective representation sebagai tujuan website.

---

# 6. TARGET AUDIENCE

Target audience bersifat:

> **General**

dengan fokus pada orang yang ingin menggunakan AI untuk mempermudah bisnis.

Dua kondisi utama:

```text
A. Sudah mempunyai bisnis
B. Baru ingin memulai bisnis
```

Audience tidak dibatasi hanya untuk:

* programmer,
* developer,
* mahasiswa IT,
* data scientist,
* perusahaan teknologi.

Requirement founder menetapkan audience secara general.

---

# 7. PRODUCT FLYWHEEL

Ekosistem Xolvon dapat dipahami sebagai:

```text
MEDIA
  ↓
ATTENTION
  ↓
XOLVON
  ↓
EDUCATION / COURSE
  ↓
SYSTEM BUILDING
  ↓
SOFTWARE / SaaS
  ↓
PORTFOLIO / PROOF
  ↓
COLLECTIVE
  ↓
TRUST
  ↓
CLIENT / REVENUE
  ↓
MORE PRODUCTION
```

Empat pillar utama:

```text
Education
Software
Media
Collective
```

Master PRD menggambarkan model tersebut sebagai flywheel bisnis Xolvon.

---

# 8. PRODUCT PRINCIPLES

Xolvon.com harus memegang prinsip:

### Functional

Halaman bukan sekadar mockup.

### Dynamic

Content yang memang bersifat operasional harus dapat dikelola secara dynamic.

### Discoverable

Public content dapat ditemukan dan dibagikan.

### Credible

Tidak mengarang social proof atau business claim.

### Modular

Feature dapat dikembangkan tanpa menghancurkan sistem lainnya.

### Simple

Jangan membangun complexity yang tidak diperlukan untuk V1.

Founder menetapkan bahwa semua page harus functional, bukan sekadar static/mockup.

---

# 9. V1 PRIORITY

Prioritas utama V1:

```text
P0 — Landing / Home
P0 — Portfolio
P0 — Course
P0 — ProjectXolvon Marketplace
```

Area berikut tetap dibutuhkan untuk ecosystem dan supporting flow:

```text
About
Collective
Register
Login
User Dashboard
Admin Dashboard
```

Founder menetapkan Landing Page, Portfolio, Course, dan ProjectXolvon Marketplace sebagai prioritas utama V1.

---

# 10. V1 BOUNDARY

V1 harus fokus pada:

```text
Core experience
+
Core content management
+
Course access
+
Manual payment activation
+
Portfolio
+
Marketplace
+
Collective
```

V1 tidak perlu memaksakan:

```text
Automated payment gateway
Complex community
Real-time collaboration
Advanced CMS
Centralized SaaS billing
Deep personalization
Complex assignment grading
Advanced certificate system
```

Handbook secara eksplisit memisahkan feature V1 dan feature yang dapat ditunda ke V2.

---

# 11. INFORMATION ARCHITECTURE

## 11.1 Public

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

## 11.2 User

```text
/dashboard
/learn/[courseSlug]/[lessonId]
```

## 11.3 Admin

```text
/67
/admin/login
/admin
```

Route contract tersebut didefinisikan dalam Handbook.

---

# 12. ACCESS MODEL

## Public

Tidak memerlukan authentication.

Dapat:

* melihat public pages,
* browsing content yang published,
* searching,
* filtering,
* melihat public project,
* melihat Collective,
* membuka external SaaS URL.

## User

Memerlukan authentication untuk:

* dashboard,
* enrolled course,
* protected lesson,
* premium content.

## Admin

Memerlukan:

* authentication,
* admin role,
* server-side authorization.

`/67` sendiri bukan security boundary.

---

# 13. GLOBAL PUBLIC NAVIGATION

Navbar:

```text
Home
Solve On
Course
Marketplace
About
Login
```

Admin Login tidak berada dalam public navigation.

Requirement navbar tersebut merupakan keputusan founder.

---

# 14. GLOBAL FOOTER

Footer minimum:

```text
Xolvon Description
Terms & Conditions
Privacy / Disclaimer
Contact
Social Links
Copyright
```

Struktur boleh menggunakan pola expandable/collapsible seperti referensi yang diberikan founder, tetapi wording legal harus dibuat khusus untuk Xolvon.

---

# 15. HOME PAGE

## 15.1 Goal

Home harus menjelaskan ecosystem Xolvon dalam satu continuous experience.

Home bukan hanya:

```text
Company Intro
```

Home harus berfungsi sebagai:

```text
Entry Point
+
Brand Narrative
+
Ecosystem Discovery
+
Conversion Gateway
```

---

# 16. HOME SECTION ORDER

Urutan wajib:

```text
1. Hero
2. Solve On
3. Course
4. Marketplace
5. Portfolio
6. Collective
7. Course CTA
```

Urutan ini merupakan keputusan founder.

---

# 17. HOME — HERO

## Objective

Pengunjung harus langsung memahami:

```text
Xolvon
=
Human-AI Collaboration
+
System Building
```

Primary headline:

> Solve On Society Conundrums / Human-AI Collaboration

Primary CTA:

> Explore Xolvon

Hero harus mengarahkan user ke eksplorasi ecosystem.

---

# 18. HOME — SOLVE ON PREVIEW

Objective:

Menunjukkan capability Xolvon.

Content:

```text
Human-AI End-to-End Attention Systems
67 Alpha-stage Digital Production Lab
```

Tampilkan sekitar:

```text
2–4 solution examples
```

Feature yang belum tersedia harus diberi status:

```text
Coming Soon
```

Jangan menampilkan feature seolah-olah sudah shipped apabila belum tersedia.

---

# 19. HOME — COURSE PREVIEW

Course preview hanya menampilkan course dengan:

```text
status = published
```

Course card minimal:

```text
Title
Short Outcome
Thumbnail
Price
Status
CTA
```

Jumlah course awal masih dapat berupa placeholder.

Founder menetapkan jumlah course awal sebagai placeholder.

---

# 20. HOME — MARKETPLACE PREVIEW

Marketplace preview menampilkan SaaS ProjectXolvon yang dipilih sebagai highlight.

CTA:

```text
Explore Marketplace
```

CTA harus menuju marketplace internal.

Bukan checkout SaaS.

Xolvon tidak memproses transaksi SaaS pada flow marketplace V1.

---

# 21. HOME — PORTFOLIO PREVIEW

Menampilkan:

```text
Latest Project
atau
Featured Project
```

Setiap card mengarahkan ke:

```text
/portfolio/[slug]
```

Objective:

```text
Proof
```

Portfolio bukan sekadar gallery visual.

---

# 22. HOME — COLLECTIVE

Menunjukkan manusia di balik production engine.

Baseline:

```text
~20 members
Carousel cards
```

Carousel harus mendukung:

```text
Touch
Keyboard
```

Founder menetapkan sekitar 20 member dengan layout carousel slide cards.

---

# 23. HOME — COURSE CTA

Section terakhir Home:

```text
Course CTA
```

Objective:

Mengubah visitor yang telah memahami ecosystem menjadi user yang tertarik belajar.

CTA harus menuju:

```text
/course
```

atau course-related conversion flow yang telah disetujui.

---

# 24. ABOUT PAGE

Route:

```text
/about
```

Objective:

Menjelaskan identitas Xolvon secara lebih mendalam.

Content:

```text
Identity
Business Model
Human-AI Collaboration
Reason Collective Exists
ProjectXolvon
Reusable Systems
Vision
```

Pemisahan wajib:

```text
Vision
vs
Shipped Capability
```

Jangan menjelaskan capability yang belum benar-benar tersedia sebagai capability yang telah shipped.

---

# 25. SOLVE ON PAGE

Route target:

```text
/solve-on
```

Catatan:

Apakah Solve On benar-benar menjadi page `/solve-on` atau hanya section/anchor di Home masih merupakan open decision pada source document.

Sebelum decision tersebut dikunci, implementation tidak boleh menganggap bentuk final secara diam-diam.

Jika page digunakan, struktur yang direkomendasikan:

```text
Hero
↓
Problem Framing
↓
What We Build
↓
Examples
↓
Process
↓
Engagement Model
↓
Portfolio Proof
↓
Contact CTA
```

Pesan utama:

> Xolvon dapat di-hire untuk membangun sistem end-to-end, bukan hanya memberikan training.

---

# 26. PORTFOLIO PAGE

Route:

```text
/portfolio
```

Objective:

Menampilkan project Xolvon secara credible.

Portfolio menampilkan seluruh project Xolvon yang eligible untuk public visibility.

---

# 27. PORTFOLIO CARD

Card minimal dapat menampilkan:

```text
Project Title
Short Summary
Project Type
Relevant Tech / Capability
Thumbnail
Status
CTA
```

Field detail mengikuti `SCHEMA.md`.

Jangan mengarang project result.

---

# 28. PORTFOLIO DETAIL

Route:

```text
/portfolio/[slug]
```

Urutan cerita wajib:

```text
Problem
↓
Solution
↓
Tech Stack
↓
Result
↓
Screenshot
```

Tambahkan:

```text
Project Team
```

agar contributor Collective terlihat.

Requirement tersebut secara eksplisit diberikan founder.

---

# 29. PORTFOLIO RESULT RULE

Result hanya boleh ditampilkan apabila data nyata tersedia.

Tidak boleh membuat:

```text
fake ROI
fake revenue
fake user count
fake performance improvement
```

Result yang belum tersedia dapat menggunakan:

```text
Coming Soon
```

atau tidak ditampilkan sesuai content state.

---

# 30. PORTFOLIO ↔ COLLECTIVE

Portfolio dan Collective harus saling terhubung.

Contoh:

```text
Project
↓
Built By
↓
Member
↓
Role
↓
Member Profile
↓
Projects
```

Relasi ini penting agar project sekaligus menjadi evidence terhadap capability Collective.

---

# 31. COURSE CATALOG

Route:

```text
/course
```

Objective:

Membantu user menemukan Course yang relevan.

Feature:

```text
Search
Optional Filter
Course Grid
Published State
Empty State
Loading State
Error State
```

Draft/unpublished content tidak boleh tampil sebagai published content kepada visitor publik.

---

# 32. COURSE CARD

Minimum content:

```text
Title
Outcome
Thumbnail
Price
Status
CTA
```

Status yang perlu dipahami UI:

```text
Published
Coming Soon
```

Draft internal tidak boleh diperlakukan sebagai public catalog content.

---

# 33. COURSE DETAIL

Route:

```text
/course/[slug]
```

Content:

```text
Course Outcome
Description
Course Contents
Format
Price
Resources
Checkout CTA
```

Course detail tidak boleh membocorkan:

```text
protected lesson URL
private media URL
signed URL
R2 object credential
```

Course format yang ditetapkan founder:

```text
Video
PDF
Resource
Assignment
```

dan structure:

```text
Course
→
Lesson
```

tanpa mandatory chapter hierarchy pada V1.

---

# 34. LESSON

Route:

```text
/learn/[courseSlug]/[lessonId]
```

Access:

```text
Authenticated User
+
Active Enrollment
```

Lesson dapat berisi:

```text
Video
Content
PDF
Resource
Assignment
```

---

# 35. PREMIUM LESSON ACCESS

User harus:

```text
Login
+
Have Active Enrollment
+
Request Existing Lesson
```

baru boleh memperoleh access ke premium media.

Conceptual flow:

```text
User
↓
Lesson
↓
Authentication
↓
Enrollment Validation
↓
Lesson Validation
↓
Temporary Media Access
```

Premium content tidak boleh menggunakan permanent public media URLs.

---

# 36. LEARNING DASHBOARD

Route:

```text
/dashboard
```

Minimum modules:

```text
My Courses
Progress
Continue Learning
```

Optional supporting modules:

```text
Profile
Activation Status
Purchase / Activation History
Support
```

Founder menetapkan My Courses, Progress, dan Continue Learning sebagai baseline.

---

# 37. COURSE PROGRESS

Progress harus mencerminkan progress user terhadap lesson yang dapat diakses user.

Minimum UX:

```text
Not Started
In Progress
Completed
```

Progress tidak boleh dihitung dari data yang tidak terverifikasi server.

---

# 38. REGISTER PAGE

Route:

```text
/register
```

Fields:

```text
Email
Phone Number
Password
```

Public registration hanya menghasilkan role:

```text
user
```

User tidak boleh menentukan:

```text
role=admin
```

---

# 39. LOGIN PAGE

Route:

```text
/login
```

Untuk user biasa.

Tujuan:

```text
Authentication
→
Dashboard / intended destination
```

---

# 40. ADMIN LOGIN

Route:

```text
/admin/login
```

Entry:

```text
/67
```

Admin login:

* tidak muncul pada public navbar,
* terpisah dari user login,
* harus protected,
* server-side role check wajib.

---

# 41. /67 RULE

`/67` adalah:

```text
Internal Entry Point
```

bukan:

```text
Security Layer
```

Mengetahui URL `/67` tidak boleh memberikan admin access.

Admin access ditentukan oleh:

```text
Authentication
+
Role Authorization
```

---

# 42. FORGOT PASSWORD — V1

Forgot password diperlukan.

Namun V1 menggunakan:

```text
WhatsApp Admin Support
```

untuk recovery/reset.

Automated password reset dapat ditunda.

---

# 43. ADMIN DASHBOARD

Route:

```text
/admin
```

Admin Dashboard adalah operational interface.

Bukan landing page.

Primary priorities:

```text
Tables
Filters
Search
Status
Actions
Confirmation
Auditability
```

---

# 44. ADMIN — USERS

Admin dapat:

```text
View Users
View Account Status
View Activation History
View Course Ownership
```

Sensitive fields tidak boleh diekspos ke UI yang tidak diperlukan.

---

# 45. ADMIN — ORDERS / ACTIVATION

Admin harus dapat melihat data operasional transaksi.

Minimum data:

```text
User
Email
Phone
Course
Amount
Order Date
Payment Status
Activation Status
WhatsApp / Proof Reference if applicable
Granted By
Granted At
Actions
```

Actions:

```text
View
Verify
Activate
Revoke
Cancel
```

Handbook mendefinisikan tabel operasional tersebut untuk activation management.

---

# 46. PAYMENT STATUS

Status minimal:

```text
PENDING
PAID / VERIFIED
ACTIVE
REVOKED
CANCELLED
```

Makna:

### PENDING

Order dibuat tetapi payment belum dikonfirmasi.

### PAID / VERIFIED

Admin menyatakan payment valid.

### ACTIVE

Course enrollment user telah aktif.

### REVOKED

Access dicabut.

### CANCELLED

Order tidak dilanjutkan.

---

# 47. MANUAL PAYMENT FLOW

V1:

```text
User Register/Login
↓
Choose Course
↓
Checkout
↓
QR / Payment Instruction
↓
User Pays
↓
WhatsApp Admin
↓
Admin Verifies
↓
Admin Activates
↓
User Dashboard
↓
Learning
```

Flow ini adalah keputusan founder dan harus dipertahankan.

---

# 48. CHECKOUT RULE

Checkout bukan automatic payment completion.

Checkout bertugas menghasilkan:

```text
Order Context
+
Payment Instruction
+
Next Action
```

Next action utama:

```text
WhatsApp Xolvon Admin
```

---

# 49. ADMIN — COURSE MANAGEMENT

Admin minimal dapat:

```text
Create Course
Edit Course
Publish Course
Unpublish Course
Manage Lessons
Upload Course Assets
```

Founder menetapkan kemampuan tersebut.

---

# 50. ADMIN — LESSON MANAGEMENT

Admin dapat:

```text
Create Lesson
Edit Lesson
Order Lesson
Add Video
Add Content
Add Resource
Add Assignment
Publish / Unpublish
```

V1 tetap menggunakan:

```text
Course → Lesson
```

tanpa kebutuhan chapter hierarchy kompleks.

---

# 51. ADMIN — MEDIA

Admin dapat mengelola:

```text
Video
PDF
Resource
Thumbnail
Assignment
Other Course Assets
```

Media private harus tetap protected.

---

# 52. ADMIN — PUBLISH WORKFLOW

Content lifecycle:

```text
Draft
↓
Complete Required Fields
↓
Upload Media
↓
Validation
↓
Preview
↓
Publish
```

Hanya content yang:

```text
published
+
eligible
```

yang boleh tampil pada public catalog.

---

# 53. ADMIN — MARKETPLACE

Admin dapat:

```text
Create Listing
Edit Listing
Publish Listing
Unpublish Listing
Manage Media
Manage External SaaS URL
```

Marketplace adalah showcase/catalog.

Bukan Xolvon checkout.

---

# 54. MARKETPLACE PAGE

Route:

```text
/marketplace
```

Feature:

```text
Search
Filter
Listing Grid
```

Content dapat meliputi:

```text
Image
Video
Deck
Description
Capabilities
Team Attribution
CTA
```

Requirement marketplace tersebut ditetapkan dalam Handbook.

---

# 55. MARKETPLACE DETAIL

Route:

```text
/marketplace/[slug]
```

Objective:

Memberikan cukup informasi agar visitor memahami:

```text
What is it?
What does it do?
Who built it?
What capabilities does it provide?
Where can I use/buy it?
```

CTA:

```text
External SaaS Website
```

---

# 56. MARKETPLACE PRICING

Xolvon tidak menentukan satu universal pricing model untuk seluruh SaaS.

Pricing/subscription mengikuti website SaaS masing-masing.

Xolvon berfungsi sebagai:

```text
Discovery / Showcase Layer
```

bukan centralized billing layer.

---

# 57. EXTERNAL REDIRECT

External SaaS CTA harus:

```text
Open configured destination
```

Destination berasal dari managed content.

FE tidak boleh mengarang URL.

---

# 58. COLLECTIVE PAGE

Route:

```text
/collective
```

Objective:

Menampilkan human production engine Xolvon.

Baseline:

```text
~20 members
```

Format:

```text
Carousel / Card
```

---

# 59. COLLECTIVE MEMBER DATA

Public profile dapat menampilkan:

```text
Name
Photo
Role
Skills
Bio
Social Links
Projects
```

Email/nomor HP pribadi tidak boleh tampil publik.

---

# 60. COLLECTIVE MEMBER DETAIL

Route:

```text
/collective/[slug]
```

Objective:

Menampilkan:

```text
Person
↓
Skills
↓
Role
↓
Projects
↓
Attribution
↓
Social
```

---

# 61. COLLECTIVE ↔ PROJECT RELATIONSHIP

Setiap project dapat memiliki contributor:

```text
PM
FE
BE
Data
Design
QA
Ops
etc.
```

Member dapat memiliki banyak project.

Project dapat memiliki banyak member.

Relasi ini harus terlihat pada public experience.

---

# 62. SEARCH

Search wajib tersedia pada area relevan.

Minimum:

```text
Course
Portfolio
Marketplace
```

Search dapat mencakup:

```text
Title
Slug
Short Description
Tags
Relevant searchable fields
```

Detail implementation berada di `SCHEMA.md` dan `ARCHITECTURE.md`.

---

# 63. FILTER

Filter harus:

```text
predictable
clear
shareable
```

Filter yang menggunakan URL harus menghasilkan URL yang dapat dibagikan.

Contoh:

```text
/course?q=automation
/portfolio?q=ai&sort=latest
/marketplace?q=crm&sort=latest
```

Handbook menetapkan URL search/filter yang shareable.

---

# 64. CONTENT STATUS

Content internal dapat memiliki state:

```text
Draft
Published
Unpublished
```

Public:

```text
Published only
```

Draft atau unpublished tidak boleh muncul sebagai public content.

---

# 65. GLOBAL LOADING STATE

Setiap asynchronous operation yang terlihat user harus memiliki loading state yang masuk akal.

Contoh:

```text
Page Loading
Card Loading
Table Loading
Button Loading
Upload Loading
Search Loading
```

---

# 66. GLOBAL ERROR STATE

Minimum behavior:

```text
404
401
403
500 / unexpected
Upload Failure
Payment Pending
Activation Success
Signed URL Expired
Empty Search
```

Error harus aman dan actionable.

---

# 67. GLOBAL EMPTY STATE

Minimal:

```text
No Course
No Project
No Marketplace Item
No Search Result
No Enrollment
No User Data
```

Empty state tidak boleh terlihat seperti system failure.

---

# 68. NOTIFICATION

Feedback untuk action penting menggunakan notification/toast.

Minimal:

```text
Success
Error
Warning
Info
```

Contoh:

```text
Course Saved
Course Published
Course Unpublished
Access Activated
Access Revoked
Upload Completed
Upload Failed
```

---

# 69. SEO REQUIREMENT

Public pages harus memiliki:

```text
Unique Title
Meta Description
Open Graph Metadata
Canonical URL
```

Published public content dapat masuk sitemap.

Private route tidak boleh diindeks.

Draft/unpublished tidak boleh diindeks.

---

# 70. ACCESSIBILITY REQUIREMENT

Public dan authenticated UI harus mempertimbangkan:

```text
Keyboard Navigation
Visible Focus
Semantic HTML
Alt Text
Readable Contrast
Touch Interaction
Reduced Motion
```

Carousel Collective wajib keyboard + touch friendly.

---

# 71. ANALYTICS

Admin Dashboard membutuhkan operational/product analytics.

Minimum metrics:

```text
Registered Users
Pending Activations
Active Enrollments
Course Views
Checkout Starts
Confirmed Payments
Activated Users
Top Courses
Portfolio Views
Marketplace Views
CTA Clicks
Error Counts
Failed Uploads
```

Analytics bertujuan membantu operasi dan conversion, bukan surveillance berlebihan.

---

# 72. USER FLOW — PUBLIC

```text
Visitor
↓
Home
↓
Explore Xolvon
↓
Solve On
Course
Marketplace
Portfolio
Collective
About
```

Visitor bebas berpindah antar public ecosystem.

---

# 73. USER FLOW — COURSE

```text
Visitor
↓
Course Catalog
↓
Course Detail
↓
Register
↓
Login
↓
Choose Course
↓
Checkout
↓
QR / Payment Instruction
↓
Payment
↓
WhatsApp Admin
↓
Admin Verification
↓
Admin Activation
↓
User Dashboard
↓
My Courses
↓
Progress
↓
Continue Learning
↓
Lesson
↓
Premium Media
```

Flow tersebut merupakan consolidated user flow resmi.

---

# 74. USER FLOW — ADMIN

```text
/67
↓
Admin Login
↓
Admin Dashboard
↓
Users
Orders / Activation
Courses
Lessons
Assets
Marketplace
Portfolio
Collective
Analytics
```

---

# 75. USER FLOW — MARKETPLACE

```text
Visitor
↓
Marketplace
↓
Search / Filter
↓
Project Detail
↓
Media / Deck / Description / Capabilities / Team
↓
External SaaS Website
```

---

# 76. USER FLOW — COLLECTIVE

```text
Visitor
↓
Collective
↓
Member Card
↓
Member Detail
↓
Skills / Role / Social
↓
Related Projects
↓
Project Detail
```

---

# 77. ROLE MATRIX

| Capability            | Visitor | User | Admin |
| --------------------- | ------: | ---: | ----: |
| View Home             |     YES |  YES |   YES |
| View About            |     YES |  YES |   YES |
| View Portfolio        |     YES |  YES |   YES |
| View Marketplace      |     YES |  YES |   YES |
| View Collective       |     YES |  YES |   YES |
| Search public content |     YES |  YES |   YES |
| Register              |     YES |   NO |    NO |
| User Login            |     YES |  YES |    NO |
| Dashboard             |      NO |  YES |    NO |
| Enrolled Lesson       |      NO |  YES |    NO |
| Admin Login           |      NO |   NO |   YES |
| Admin Dashboard       |      NO |   NO |   YES |
| Create Course         |      NO |   NO |   YES |
| Publish Course        |      NO |   NO |   YES |
| Upload Asset          |      NO |   NO |   YES |
| Activate Enrollment   |      NO |   NO |   YES |
| Manage Marketplace    |      NO |   NO |   YES |
| Manage Portfolio      |      NO |   NO |   YES |
| Manage Collective     |      NO |   NO |   YES |
| Operational Analytics |      NO |   NO |   YES |

---

# 78. COURSE ACCESS MATRIX

| State                          | Course Catalog | Course Detail |                                Lesson |    Premium Media |
| ------------------------------ | -------------: | ------------: | ------------------------------------: | ---------------: |
| Visitor                        |            YES |           YES |                                    NO |               NO |
| Registered User, no enrollment |            YES |           YES |                                    NO |               NO |
| Active Enrollment              |            YES |           YES |                                   YES |              YES |
| Revoked Enrollment             |            YES |           YES |                                    NO |               NO |
| Admin                          |            YES |           YES | Based on product/admin implementation | Admin capability |

The security-critical principle remains:

```text
Active Enrollment
=
Required entitlement
```

---

# 79. CONTENT VISIBILITY

## Public Content

```text
Published
```

## Internal Content

```text
Draft
Unpublished
```

## Protected Learning Content

```text
Published
+
Active Enrollment
```

---

# 80. PAYMENT / ACTIVATION BUSINESS RULES

### Rule 1

Payment does not automatically activate the course.

### Rule 2

Admin performs verification.

### Rule 3

Admin performs activation.

### Rule 4

Activation targets a specific order/course.

### Rule 5

Double activation must not create duplicate enrollment.

### Rule 6

Revoke must preserve operational history.

These operational guardrails are explicitly defined in the Handbook.

---

# 81. CONTENT MANAGEMENT BUSINESS RULE

Content seperti:

```text
Course
Lesson
Project
Marketplace Item
Collective Member
```

harus dapat diisi atau diubah melalui Admin Dashboard dan tidak boleh membutuhkan code deployment untuk setiap perubahan content.

---

# 82. PUBLIC CONTENT BUSINESS RULE

Visitor hanya melihat content yang memenuhi:

```text
published
+
publicly eligible
```

Draft atau unpublished tidak boleh muncul di:

```text
Home
Catalog
Search
Sitemap
Public Detail
```

---

# 83. COURSE BUSINESS RULE

Course memiliki relationship:

```text
Course
↓
Lessons
```

V1 tidak membutuhkan hierarchy:

```text
Course
→ Chapter
→ Section
→ Lesson
```

kecuali perubahan tersebut disetujui kemudian.

---

# 84. MARKETPLACE BUSINESS RULE

Marketplace listing bukan order system.

Marketplace listing hanya:

```text
Discovery
+
Showcase
+
Information
+
External CTA
```

---

# 85. PORTFOLIO BUSINESS RULE

Portfolio adalah:

```text
Proof of Production
```

bukan sekadar visual gallery.

Urutan case story:

```text
Problem
Solution
Tech Stack
Result
Screenshot
Team
```

---

# 86. COLLECTIVE BUSINESS RULE

Collective adalah:

```text
People
+
Roles
+
Skills
+
Projects
+
Attribution
```

Bukan sekadar directory orang.

---

# 87. TRUST & CREDIBILITY RULE

Xolvon harus membangun trust dengan:

```text
Real Projects
Real People
Real Systems
Real Capabilities
Real Data
```

Bukan:

```text
Fake Metrics
Fake Testimonials
Fake Logos
Fake Results
```

Handbook melarang pengadaan data semacam itu dan mengharuskan placeholder/coming soon sampai data nyata tersedia.

---

# 88. NO HIDDEN PRODUCT LOGIC

Product behavior tidak boleh hanya berada:

```text
inside component
inside random callback
inside frontend hack
```

Behavior penting harus dapat ditelusuri kembali ke:

```text
PRD
+
Schema
+
Architecture
```

---

# 89. NO FEATURE BY ASSUMPTION

Feature dianggap **belum ada** apabila tidak tertulis sebagai requirement atau belum diputuskan.

Contoh:

```text
Wishlist
Reviews
Rating
Certificate
Referral
Community
Chat
Discount Engine
Coupon
Affiliate
Automated Payment
```

tidak boleh dianggap feature Xolvon V1 hanya karena website course modern biasanya memilikinya.

---

# 90. V2 / DEFERRED FEATURES

Feature yang dapat ditunda:

```text
Automated Payment Gateway
Complex Assignment Submission / Grading
Advanced Community
Deep Personalization
Advanced User Analytics
Automated Certificate
Advanced CMS/Page Builder
Centralized SaaS Billing
Real-Time Chat / Heavy Collaboration
```

Daftar tersebut mengikuti V1/V2 separation pada Handbook.

---

# 91. OPEN DECISIONS

Beberapa item **belum boleh dianggap final**:

### 91.1 Solve On

Apakah:

```text
/solve-on
```

atau:

```text
Home Section / Anchor
```

### 91.2 Auth Library

Library authentication final belum ditetapkan.

### 91.3 Password Hashing

Algorithm/library final harus disesuaikan dengan runtime.

### 91.4 Runtime / Adapter

Deployment path final harus dikunci oleh WebDev.

### 91.5 QR / Payment Provider

Flow sudah ditentukan, mekanisme/provider belum.

### 91.6 Payment Proof

Belum diputuskan apakah screenshot/proof disimpan sistem.

### 91.7 Assignment Submission

Belum final apakah assignment hanya resource atau memiliki submission workflow.

### 91.8 Admin Bootstrap

Mekanisme membuat admin pertama belum final.

### 91.9 Legal Copy

Terms / Privacy / Disclaimer final belum ditentukan.

### 91.10 Initial Content Quantity

Jumlah course/project/content awal masih placeholder.

### 91.11 External SaaS URL Governance

Rules validasi/pengelolaan URL belum final.

### 91.12 Analytics Provider

Operational analytics diwajibkan, vendor analytics pihak ketiga belum dipilih.

Daftar open decision tersebut dicatat dalam Handbook dan harus ditangani melalui decision log.

---

# 92. OPEN DECISION PROTOCOL

Jika implementation membutuhkan keputusan yang belum ada:

```text
DO NOT INVENT
```

Gunakan:

```text
OPEN DECISION
```

Format:

```text
Problem:
-

Existing Requirement:
-

Options:
-

Recommendation:
-

Owner:
-

Decision:
-

Date:
-

Impact:
-
```

---

# 93. PAGE ACCEPTANCE CRITERIA

Sebuah page dianggap complete jika:

```text
1. Route benar
2. Purpose page terpenuhi
3. Content sesuai PRD
4. Data sesuai SCHEMA
5. Design sesuai DESIGN
6. Architecture sesuai ARCHITECTURE
7. Responsive
8. Loading state tersedia
9. Empty state tersedia bila applicable
10. Error state tersedia bila applicable
11. Access control benar bila applicable
12. SEO benar bila public
13. Tidak ada fake data
14. Tidak merusak existing flow
```

---

# 94. FEATURE ACCEPTANCE CRITERIA

Sebuah feature dianggap selesai apabila:

```text
Given
→ kondisi awal

When
→ user melakukan action

Then
→ expected outcome
```

Contoh:

### Course Activation

```text
Given:
User telah membayar dan menunggu verification.

When:
Admin melakukan Activate.

Then:
Enrollment menjadi active,
user dapat melihat course di Dashboard,
user dapat mengakses lesson yang eligible.
```

---

# 95. COURSE ACCESS ACCEPTANCE TEST

```text
Given:
User tidak memiliki active enrollment.

When:
User mencoba membuka premium lesson.

Then:
Access ditolak.
```

```text
Given:
User memiliki active enrollment.

When:
User membuka lesson yang merupakan bagian course tersebut.

Then:
Lesson dapat diakses.
```

---

# 96. MARKETPLACE ACCEPTANCE TEST

```text
Given:
Marketplace item published.

When:
Visitor membuka Marketplace.

Then:
Item terlihat.
```

```text
Given:
Visitor membuka Marketplace Detail.

When:
Visitor menekan CTA.

Then:
Visitor diarahkan ke external SaaS destination yang dikonfigurasi.
```

---

# 97. COLLECTIVE ACCEPTANCE TEST

```text
Given:
Member published.

When:
Visitor membuka Collective.

Then:
Member tampil.
```

```text
Given:
Member memiliki project attribution.

When:
Visitor membuka member detail.

Then:
Related project dapat dilihat.
```

---

# 98. PORTFOLIO ACCEPTANCE TEST

```text
Given:
Project published.

When:
Visitor membuka Portfolio.

Then:
Project tampil.
```

```text
When:
Visitor membuka project detail.

Then:
Problem
Solution
Tech Stack
Result
Screenshot
Team
```

dapat dipahami sesuai data yang tersedia.

---

# 99. SEARCH ACCEPTANCE TEST

```text
Given:
Public content tersedia.

When:
Visitor melakukan search.

Then:
Relevant published records ditampilkan.
```

```text
When:
Tidak ada hasil.

Then:
Empty state tampil.
Query dapat dipahami.
User dapat reset filter.
```

---

# 100. ADMIN ACCEPTANCE TEST

```text
Given:
Authenticated user dengan role user.

When:
User mencoba admin operation.

Then:
Request ditolak server-side.
```

```text
Given:
Authenticated admin.

When:
Admin membuka Admin Dashboard.

Then:
Admin dapat menggunakan authorized modules.
```

---

# 101. RESPONSIVE ACCEPTANCE

Minimum:

```text
320px
390px
768px
1024px
1440px
Large Desktop
```

Page dianggap gagal apabila:

```text
overflow
broken layout
unusable CTA
unusable navigation
unreadable content
broken modal
broken carousel
```

Handbook menetapkan ukuran responsive test tersebut.

---

# 102. SEO ACCEPTANCE

Untuk public page:

```text
Unique title
Meta description
Canonical
Open Graph
Correct indexability
```

Untuk private route:

```text
No public indexing
```

---

# 103. CONTENT ACCEPTANCE

Tidak boleh terdapat:

```text
Fake statistic
Fake testimonial
Fake user count
Fake revenue
Fake result
Fake client
Fake credential
```

Test data harus dapat dikenali dengan jelas sebagai:

```text
Development / Mock / Placeholder
```

---

# 104. SECURITY ACCEPTANCE

Minimum critical tests:

```text
Unauthenticated → /dashboard
→ denied / redirect
```

```text
User → Admin mutation
→ denied
```

```text
User without enrollment → Premium Media
→ denied
```

```text
Revoked enrollment → Premium Media
→ denied
```

```text
User A → User B data
→ denied
```

```text
Invalid upload type/size
→ denied
```

Security tests tersebut tercantum dalam acceptance test Handbook.

---

# 105. PRODUCTION READINESS

V1 tidak dianggap production-ready hanya karena frontend terlihat bagus.

Minimum:

```text
Product Flow
+
Auth
+
Authorization
+
Database
+
Storage
+
SEO
+
Responsive
+
Error Handling
+
Operational Admin
+
Rollback Awareness
```

---

# 106. DEVELOPMENT PHASES

## Phase 1

```text
27 Aug – 2 Sep
Discuss & Feature Mapping
Environment: Localhost
```

Objective:

```text
Requirement alignment
Feature mapping
Core implementation
```

## Phase 2

```text
3 Sep – 9 Sep
A/B Testing
Integration
Bug Fixing
Environment: Local / Staging
```

## Phase 3

```text
10 Sep – 14 Sep
Finalization
Deployment
Environment: Production
```

Roadmap tersebut ditetapkan dalam dokumen proyek.

---

# 107. PRODUCT DELIVERY RULE

Development schedule adalah delivery envelope.

Schedule tidak boleh digunakan sebagai alasan untuk:

```text
skip security
skip review
skip testing
skip authorization
skip responsive testing
skip migration
skip acceptance
```

---

# 108. REQUIRED PUBLIC EXPERIENCE

Ketika visitor pertama kali membuka Xolvon.com, visitor idealnya memahami:

```text
What is Xolvon?
↓
What does Xolvon build?
↓
What has Xolvon built?
↓
Who builds it?
↓
What can I learn?
↓
What can I explore next?
```

---

# 109. REQUIRED CONVERSION PATHS

Xolvon mempunyai dua conversion direction utama:

### Education

```text
Visitor
→ Course
→ Checkout
→ WhatsApp
→ Activation
→ Learning
```

### Commercial / Client

```text
Visitor
→ Solve On
→ Portfolio
→ Proof
→ Contact / Engagement
```

Marketplace merupakan discovery path:

```text
Visitor
→ Marketplace
→ SaaS
→ External Website
```

---

# 110. PRODUCT EXPERIENCE HIERARCHY

Prioritas pengalaman:

```text
Understanding
>
Trust
>
Discovery
>
Action
>
Decoration
```

User harus memahami produk sebelum didorong ke complex interaction.

---

# 111. CONTENT HIERARCHY

Pada public content:

```text
Positioning
↓
Context
↓
Evidence
↓
Action
```

Contoh Portfolio:

```text
Problem
↓
Solution
↓
Tech
↓
Result
↓
Team
```

---

# 112. DATA TRUTH

Semua data yang tampil ke user harus memiliki satu source yang dapat ditelusuri.

Contoh:

```text
Course
→ CMS / Database

Project
→ Portfolio Data

Member
→ Collective Data

Price
→ Course Data

SaaS URL
→ Marketplace Data
```

Frontend tidak boleh menjadi database kedua.

---

# 113. PRODUCT COPY RULE

Copy utama yang sudah ditetapkan founder harus dipertahankan maknanya.

Tidak boleh diubah menjadi copy baru hanya karena:

```text
AI merasa lebih catchy
```

atau:

```text
developer ingin terdengar lebih marketing.
```

Perubahan positioning/copy utama adalah product decision.

---

# 114. PLACEHOLDER RULE

Ketika content belum tersedia:

```text
Placeholder
```

atau:

```text
Coming Soon
```

harus digunakan secara eksplisit.

Jangan membuat placeholder terlihat seperti data production nyata.

---

# 115. DYNAMIC CONTENT RULE

Admin harus mampu mengubah content tanpa code deployment untuk domain:

```text
Course
Lesson
Project
Marketplace
Collective
```

Requirement founder menetapkan content management tersebut sebagai dynamic.

---

# 116. PRODUCT NON-GOALS V1

V1 bukan:

```text
Full LMS enterprise
Full SaaS marketplace
Payment processor
Community platform
Real-time collaboration platform
Advanced CRM
Advanced analytics suite
No-code CMS builder
```

Website boleh berkembang menjadi area tersebut di masa depan, tetapi tidak menjadi asumsi V1.

---

# 117. WHAT FE MUST NOT DECIDE

Frontend tidak boleh memutuskan sendiri:

```text
Database schema
Auth algorithm
Payment provider
Admin bootstrap mechanism
Premium entitlement model
Deployment runtime
Legal policy
Business pricing
External SaaS commercial terms
```

kecuali decision tersebut sudah dikunci oleh owner yang tepat.

---

# 118. WHAT PRD DOES NOT CONTROL

Detail berikut bukan ditentukan penuh oleh PRD:

```text
Exact color values
Exact font sizes
Exact spacing tokens
Exact component API
Exact database SQL
Exact folder implementation
Exact server action naming
Exact adapter code
```

Gunakan file kontraknya masing-masing:

```text
DESIGN.md
SCHEMA.md
ARCHITECTURE.md
```

---

# 119. CONFLICT RESOLUTION

Apabila terdapat conflict:

```text
Founder Decision
>
Explicit Product Requirement
>
PRD
>
Supporting Documentation
>
Developer Preference
```

Tetapi apabila conflict melibatkan security-critical atau runtime-critical behavior:

```text
DO NOT GUESS
```

Catat sebagai Open Decision dan eskalasi ke owner.

---

# 120. REQUIREMENT TRACEABILITY

Setiap major feature idealnya dapat dilacak:

```text
Feature
↓
PRD Requirement
↓
Route
↓
Component / UI
↓
Data Contract
↓
Architecture
↓
Acceptance Test
```

Tujuan:

```text
Nothing important exists without a reason.
```

---

# 121. FINAL PRODUCT DEFINITION

Xolvon.com pada V1 harus dapat:

```text
1. Memperkenalkan Xolvon.
2. Menjelaskan Solve On.
3. Menampilkan Portfolio.
4. Menampilkan ProjectXolvon Marketplace.
5. Menampilkan Collective.
6. Menampilkan Course.
7. Mengizinkan user Register/Login.
8. Mengelola Course melalui Admin.
9. Mengelola Project melalui Admin.
10. Mengelola Marketplace melalui Admin.
11. Mengelola Collective melalui Admin.
12. Menjalankan manual payment flow.
13. Mengaktifkan course access secara manual.
14. Menyediakan user learning dashboard.
15. Melindungi premium content.
16. Menyediakan Search/Filter.
17. Menyediakan operational analytics.
18. Berfungsi secara responsive.
19. Memenuhi baseline accessibility.
20. Siap dikembangkan menuju ecosystem yang lebih besar.
```

---

# 122. FINAL USER JOURNEY

## Visitor

```text
Discover
↓
Understand
↓
Explore
↓
Trust
↓
Choose Path
```

Path:

```text
Course
Portfolio
Marketplace
Collective
Solve On
```

---

# 123. FINAL COURSE JOURNEY

```text
Discover
↓
Evaluate
↓
Register
↓
Checkout
↓
Pay
↓
WhatsApp
↓
Verification
↓
Activation
↓
Dashboard
↓
Learning
```

---

# 124. FINAL BUSINESS JOURNEY

```text
Attention
↓
Xolvon Website
↓
Proof
↓
Trust
↓
Course / SaaS / Service
↓
Revenue / Client
↓
More Production
↓
More Proof
```

---

# 125. DEFINITION OF PRODUCT SUCCESS

V1 berhasil apabila:

```text
Visitor dapat memahami Xolvon.
Visitor dapat menemukan project.
Visitor dapat menemukan Collective.
Visitor dapat menemukan Course.
Visitor dapat menemukan SaaS.
User dapat melakukan learning flow.
Admin dapat mengelola content.
Admin dapat melakukan activation.
Premium content tetap protected.
Public content dapat dicari.
Website dapat digunakan di mobile.
Feature utama bekerja tanpa mockup-only behavior.
```

---

# 126. FINAL PRD RULE

> **PRD menentukan WHAT.**

Ketika developer bertanya:

```text
"Fitur ini harus melakukan apa?"
```

jawabannya berasal dari:

```text
PRD.md
```

Ketika developer bertanya:

```text
"Data field-nya apa?"
```

gunakan:

```text
SCHEMA.md
```

Ketika developer bertanya:

```text
"Harus terlihat seperti apa?"
```

gunakan:

```text
DESIGN.md
```

Ketika developer bertanya:

```text
"Harus dibangun bagaimana?"
```

gunakan:

```text
ARCHITECTURE.md
```

Ketika developer bertanya:

```text
"Apa yang boleh / tidak boleh saya lakukan?"
```

gunakan:

```text
RULES.md
```

---

# 127. PRODUCT CONTRACT

Selama sebuah requirement masih berada di dalam:

```text
PRD.md
```

maka requirement tersebut dianggap sebagai:

```text
PRODUCT CONTRACT
```

Implementation dapat dioptimalkan.

Product intent tidak boleh diubah tanpa decision.

---

# END OF PRD.md
