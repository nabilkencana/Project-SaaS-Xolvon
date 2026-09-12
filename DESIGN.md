# DESIGN.md

# XOLVON.COM

## FRONTEND DESIGN SYSTEM & VISUAL CONTRACT

**Project:** Xolvon.com
**Organization:** PT Xolvon Kehidupan Cerdas Abadi
**Product:** AI Business Collective
**Document Type:** Design System / UX Visual Contract
**Status:** Mandatory Frontend Design Contract
**Version:** V1
**Primary Consumers:** Frontend Developer, UI/UX, AI Coding Agent, Reviewer, QA

---

# 0. PURPOSE

`DESIGN.md` adalah **kontrak visual dan interaction design Xolvon.com**.

Tujuan dokumen ini:

```text
Satu Product
↓
Satu Visual Language
↓
Satu Component Language
↓
Satu Interaction Language
↓
Satu Responsive Behavior
```

Walaupun:

* dikerjakan oleh beberapa frontend developer,
* menggunakan beberapa AI Coding Agent,
* menggunakan feature branch berbeda,
* dikerjakan dalam waktu berbeda,

hasil akhirnya harus terasa seperti:

> **dibuat oleh satu design team.**

---

# 1. WHAT DESIGN.md CONTROLS

Dokumen ini menjadi source of truth untuk:

* visual direction,
* brand feeling,
* typography,
* color system,
* spacing,
* layout,
* grid,
* container,
* radius,
* border,
* shadow,
* surface,
* buttons,
* cards,
* inputs,
* navigation,
* footer,
* badges,
* dialogs,
* tables,
* search,
* filters,
* tabs,
* carousel,
* skeleton,
* empty states,
* error states,
* interaction,
* animation,
* responsive behavior,
* accessibility presentation,
* visual hierarchy.

---

# 2. WHAT DESIGN.md DOES NOT CONTROL

Dokumen ini **tidak menentukan**:

```text
WHAT PRODUCT DOES
→ PRD.md

WHAT DATA EXISTS
→ SCHEMA.md

HOW SYSTEM IS IMPLEMENTED
→ ARCHITECTURE.md

WHAT DEVELOPERS ARE ALLOWED TO DO
→ RULES.md
```

Visual tidak boleh digunakan untuk mengubah product behavior.

Contoh:

Kalau PRD mengatakan Marketplace adalah showcase, maka design tidak boleh membuat UI seolah-olah Marketplace adalah checkout marketplace hanya karena visual tersebut terlihat lebih modern.

---

# 3. DESIGN STATUS SYSTEM

Gunakan label berikut dalam dokumen ini:

```text
[LOCKED]
Keputusan sudah berasal dari founder / source resmi.

[IMPLEMENTATION DEFAULT]
Aturan desain teknis yang ditetapkan untuk menjaga konsistensi implementasi.
Bukan historical founder decision.

[OPEN]
Belum cukup data untuk mengunci keputusan final.
```

### Penting

AI Coding Agent tidak boleh mengubah:

```text
[LOCKED]
```

menjadi keputusan lain.

Untuk:

```text
[IMPLEMENTATION DEFAULT]
```

AI boleh mengusulkan perubahan, tetapi tidak boleh mengganti secara diam-diam jika perubahan tersebut memengaruhi banyak component.

---

# 4. XOLVON DESIGN NORTH STAR

Xolvon harus terasa seperti:

> **A living digital production collective.**

Bukan:

```text
Corporate brochure
```

Bukan:

```text
Generic AI startup template
```

Bukan:

```text
Online course marketplace template
```

Bukan:

```text
Over-designed futuristic website
```

---

# 5. CORE VISUAL PERSONALITY

## [LOCKED]

Founder mendefinisikan overall style:

```text
Futuristic
Corporate
Simple
Startup
```

Master PRD menambahkan karakter:

```text
Builder
Professional
Modern
```

---

# 6. DESIGN ATTRIBUTES

Xolvon harus terasa:

| Attribute    | Target      |
| ------------ | ----------- |
| Modern       | High        |
| Technical    | High        |
| Professional | High        |
| Minimal      | High        |
| Futuristic   | Medium–High |
| Corporate    | Medium–High |
| Startup      | High        |
| Playful      | Low         |
| Decorative   | Low         |
| Flashy       | Low         |
| Luxury       | Low         |
| Academic     | Low         |

Tujuan tabel ini adalah membantu AI memilih ketika terdapat ambiguity.

Jika AI harus memilih antara:

```text
minimal card
```

dan:

```text
decorative card dengan banyak effects
```

pilih:

```text
minimal card
```

---

# 7. DESIGN PHILOSOPHY

Urutan prioritas design:

```text
CLARITY
↓
HIERARCHY
↓
USABILITY
↓
SPEED
↓
CONSISTENCY
↓
BRAND
↓
DECORATION
```

Jangan membalik urutan tersebut.

Visual tidak boleh mengorbankan readability dan usability hanya demi terlihat futuristic.

---

# 8. PRIMARY DESIGN REFERENCE

## [LOCKED]

Reference hierarchy:

### Primary Visual Reference

```text
mulai-ai.pages.dev
```

Digunakan terutama untuk:

* visual direction,
* layout inspiration,
* efficiency,
* interaction pattern.

### Secondary Structure References

```text
xolvontesting.web.app
xolvonai.web.app
```

Digunakan terutama untuk:

* content structure,
* section idea,
* information architecture inspiration.

Requirement tersebut dinyatakan secara eksplisit dalam Founder Q1–Q55.

---

# 9. REFERENCE RULE

Reference website adalah:

```text
INSPIRATION
```

bukan:

```text
SPECIFICATION
```

Jangan:

* copy visual mentah,
* copy text mentah,
* copy source code,
* copy component behavior tanpa evaluation.

Xolvon harus tetap memiliki visual identity sendiri.

---

# 10. BRAND EMOTION

Ketika visitor melihat Xolvon, target perception:

```text
"Ini orang-orang yang benar-benar build."

"Ini bukan website template."

"Mereka ngerti teknologi."

"Ini modern tapi tetap serius."

"Ini sebuah production ecosystem."
```

Bukan:

```text
"Ini website kursus biasa."

"Ini startup template."

"Ini AI-generated landing page."

"Ini terlalu ramai."
```

---

# 11. DARK MODE

## [LOCKED]

Dark mode merupakan primary visual direction.

Base atmosphere:

```text
Dark Purple
+
Dark Blue
```

Founder menetapkan dark mode sebagai dark purple/dark blue.

---

# 12. LIGHT MODE

## [LOCKED]

Light mode:

```text
Soft Blue
+
White
```

bukan pure white everywhere.

Tujuannya menjaga identitas Xolvon tetap terasa walaupun theme berubah.

---

# 13. COLOR SYSTEM

## Status

Base direction:

```text
[LOCKED]
```

Exact token values:

```text
[IMPLEMENTATION DEFAULT]
```

Karena source founder menentukan family warna tetapi tidak menetapkan exact hex token.

---

# 14. COLOR PHILOSOPHY

Gunakan:

```text
Neutral
+
Deep Blue/Purple
+
Subtle Green Accent
```

Master PRD menyatakan basis monokrom dengan aksen hijau yang merepresentasikan utility economics/growth, serta accent subtil bila diperlukan untuk sub-brand.

---

# 15. COLOR TOKEN STRUCTURE

Gunakan semantic tokens, bukan hardcoded color values di component.

Conceptual structure:

```text
background
foreground

surface
surface-muted
surface-elevated

border
border-subtle

primary
primary-foreground

secondary
secondary-foreground

accent
accent-foreground

success
warning
destructive
info

muted
muted-foreground
```

---

# 16. DARK COLOR DEFAULT

## [IMPLEMENTATION DEFAULT]

Gunakan palette yang berada dalam keluarga:

```text
Background:
Very Deep Blue / Purple

Surface:
Dark Blue / Purple

Elevated Surface:
Slightly lighter blue/purple

Border:
Low-contrast cool neutral

Text:
Near-white

Muted Text:
Cool gray

Accent:
Subtle green
```

Exact hex values harus dikunci kemudian pada token implementation apabila belum terdapat keputusan final design token.

Jangan menyebarkan random hex di JSX/Tailwind class.

---

# 17. LIGHT COLOR DEFAULT

## [IMPLEMENTATION DEFAULT]

Gunakan:

```text
Background:
White / Soft Blue

Surface:
White

Elevated Surface:
Very soft cool tint

Border:
Soft blue-gray

Text:
Deep blue-gray

Muted Text:
Medium cool gray

Accent:
Controlled green
```

---

# 18. COLOR USAGE RATIO

## [IMPLEMENTATION DEFAULT]

Secara visual:

```text
70–85%
Neutral / Base

10–20%
Blue / Purple identity

<10%
Accent
```

Ini bukan numerical brand requirement.

Tujuannya adalah mencegah halaman menjadi:

```text
too colorful
```

---

# 19. ACCENT RULE

Accent digunakan untuk:

* primary CTA,
* important state,
* selected item,
* progress,
* success,
* product emphasis.

Jangan memberi accent color kepada semua element.

Kalau semuanya accent:

```text
nothing feels important
```

---

# 20. GREEN ACCENT RULE

Green merupakan accent utility/growth.

Gunakan secara:

```text
subtle
controlled
intentional
```

Jangan menjadikan Xolvon sebagai:

```text
green website
```

Green adalah accent, bukan primary background.

---

# 21. TYPOGRAPHY

## [LOCKED]

Master PRD mengarahkan penggunaan modern sans-serif seperti:

```text
Inter
atau
Geist
```

untuk readability.

---

# 22. TYPOGRAPHY PRINCIPLE

Typography harus terasa:

```text
Sharp
Modern
Clean
Technical
Confident
Readable
```

Bukan:

```text
Rounded playful
Decorative
Luxury editorial
Handwritten
```

---

# 23. FONT STACK

## [IMPLEMENTATION DEFAULT]

Priority:

```text
Geist
↓
Inter
↓
System Sans
```

Fallback harus tersedia.

Jangan menggunakan 3–4 font family untuk satu page.

---

# 24. TYPE SCALE

## [IMPLEMENTATION DEFAULT]

Gunakan hierarchy:

```text
Display
H1
H2
H3
H4
Body Large
Body
Body Small
Caption
Label
```

Contoh baseline:

```text
Display:
56–72px

H1:
48–64px

H2:
36–48px

H3:
28–36px

H4:
22–28px

Body Large:
18–20px

Body:
16px

Body Small:
14px

Caption:
12–13px

Label:
12–14px
```

Nilai di atas adalah implementation default, bukan historical founder token.

---

# 25. TYPOGRAPHY RESPONSIVE

Display typography harus mengecil secara proporsional pada mobile.

Jangan membuat:

```text
Desktop H1 = 64px
Mobile H1 = 64px
```

jika menghasilkan:

```text
overflow
too many lines
weak hierarchy
```

---

# 26. HEADLINE RULE

Headline harus:

```text
short
strong
clear
```

Jangan membuat headline panjang hanya untuk memenuhi area kosong.

---

# 27. BODY TEXT RULE

Body text harus:

```text
readable
moderate line length
adequate line-height
```

Jangan menggunakan font terlalu kecil hanya agar lebih banyak content masuk dalam satu viewport.

---

# 28. TEXT WIDTH

## [IMPLEMENTATION DEFAULT]

Long-form text:

```text
max-width: 60–75ch
```

Headline:

```text
max-width:
10–18 words
```

tergantung content.

Tujuannya menjaga readability.

---

# 29. FONT WEIGHT

Default hierarchy:

```text
Regular
Medium
Semibold
Bold
```

Jangan membuat:

```text
everything = bold
```

Typography hierarchy harus terasa melalui:

```text
size
weight
spacing
contrast
```

bukan weight saja.

---

# 30. TEXT CONTRAST

Contrast hierarchy:

```text
Primary text
>
Secondary text
>
Muted text
```

Muted text tetap harus readable.

Jangan memakai gray terlalu gelap di dark mode hingga sulit dibaca.

---

# 31. SPACING SYSTEM

## Status

Exact system:

```text
[IMPLEMENTATION DEFAULT]
```

Gunakan spacing scale berbasis predictable increments.

Recommended:

```text
4
8
12
16
20
24
32
40
48
64
80
96
128
```

---

# 32. SPACING PRINCIPLE

Jangan memilih spacing random seperti:

```text
13px
27px
43px
57px
```

hanya karena AI menghasilkan angka tersebut.

Gunakan token.

---

# 33. SECTION SPACING

## [IMPLEMENTATION DEFAULT]

Desktop:

```text
80–128px
```

Tablet:

```text
64–96px
```

Mobile:

```text
48–72px
```

Actual section spacing harus mengikuti hierarchy halaman.

---

# 34. CONTAINER

## [IMPLEMENTATION DEFAULT]

Primary content container:

```text
max-width: 1200–1280px
```

dengan responsive horizontal padding.

Jangan membuat setiap section memiliki max-width berbeda tanpa alasan.

---

# 35. GLOBAL PAGE PADDING

## [IMPLEMENTATION DEFAULT]

Mobile:

```text
16–20px
```

Tablet:

```text
24–32px
```

Desktop:

```text
32px+
```

Large desktop dapat menambah whitespace melalui centered max-width, bukan membuat content terlalu lebar.

---

# 36. GRID SYSTEM

Default layout:

```text
12-column desktop grid
```

dapat disederhanakan pada mobile.

Concept:

```text
Desktop
12 columns

Tablet
6–8 logical columns

Mobile
1–2 columns
```

Exact grid implementation dapat mengikuti component need.

---

# 37. ALIGNMENT

Default:

```text
left-aligned content
```

Center alignment digunakan ketika:

* hero memang membutuhkan cinematic composition,
* CTA section,
* empty state,
* centered short message.

Jangan membuat semua section centered.

---

# 38. VISUAL RHYTHM

Page harus memiliki rhythm:

```text
Large whitespace
↓
Content cluster
↓
Whitespace
↓
Next section
```

Jangan membuat:

```text
section
section
section
section
```

tanpa breathing room.

---

# 39. SURFACE SYSTEM

Gunakan layered surfaces.

Concept:

```text
Page Background
↓
Section Surface
↓
Card Surface
↓
Elevated / Modal Surface
```

Perbedaan antar-layer harus subtle.

---

# 40. CARD STYLE

## [LOCKED DIRECTION]

UI harus:

```text
Sharp
Minimal
Clean
```

dan menggunakan styling bersih dari shadcn/ui sebagai base primitive.

---

# 41. CARD RULE

Default card:

```text
Subtle border
Moderate radius
Minimal shadow
Controlled padding
Clear hierarchy
```

Jangan menggunakan:

```text
Huge shadow
Heavy glow
Excessive gradient
Floating 3D effect
```

sebagai default.

---

# 42. CARD HIERARCHY

Card:

```text
Visual / icon
↓
Title
↓
Short description
↓
Metadata
↓
Action
```

Tidak semua card harus memiliki semua layer.

---

# 43. CARD DENSITY

Public marketing cards:

```text
Low–Medium density
```

Admin operational cards/tables:

```text
Medium–High density
```

Course cards:

```text
Medium
```

Portfolio:

```text
Medium
```

Marketplace:

```text
Medium
```

---

# 44. BORDER RADIUS

## [IMPLEMENTATION DEFAULT]

Baseline:

```text
sm: 8px
md: 12px
lg: 16px
xl: 24px
```

Tidak boleh ada radius random.

---

# 45. RADIUS PHILOSOPHY

Xolvon bukan:

```text
Ultra-rounded playful SaaS
```

Gunakan moderate rounding.

Avoid:

```text
every element = pill
```

Pill shape hanya untuk:

* tags,
* compact badges,
* status,
* certain segmented controls.

---

# 46. BORDER

Border:

```text
subtle
low contrast
purposeful
```

Gunakan border untuk:

* separation,
* card boundary,
* form control,
* table,
* navigation.

Jangan menggunakan border sangat terang di dark mode.

---

# 47. SHADOW

Shadows bersifat:

```text
subtle
functional
```

digunakan terutama pada:

* modal,
* dropdown,
* popover,
* elevated interactive surface.

Jangan memberi shadow berat pada setiap card.

---

# 48. GLOW RULE

Glow boleh digunakan sebagai:

```text
brand accent
hero detail
focused technology visual
```

Tetapi bukan:

```text
default card styling
```

Aturan:

> Glow adalah seasoning, bukan main dish.

---

# 49. GRADIENT RULE

Gradient diperbolehkan jika:

```text
subtle
brand-consistent
supports hierarchy
```

Jangan membuat setiap background menjadi gradient.

---

# 50. GLASSMORPHISM RULE

Glassmorphism bukan default Xolvon.

Jika digunakan:

```text
very subtle
high readability
clear contrast
```

Jangan membuat seluruh website:

```text
frosted glass
```

---

# 51. ICONOGRAPHY

Icon harus:

```text
minimal
consistent
functional
```

Gunakan satu icon language.

Jangan mencampur:

```text
outline icon
filled icon
3D icon
emoji
random icon pack
```

tanpa alasan.

---

# 52. ICON SIZE

## [IMPLEMENTATION DEFAULT]

Small:

```text
14–16px
```

Medium:

```text
18–20px
```

Large:

```text
24–32px
```

Hero decorative icon dapat lebih besar.

---

# 53. BUTTON SYSTEM

Buttons harus memiliki hierarchy:

```text
Primary
Secondary
Outline
Ghost
Destructive
```

Tidak semua page harus menggunakan semua variant.

---

# 54. PRIMARY BUTTON

Primary CTA:

```text
high contrast
clear label
medium radius
strong hierarchy
```

Primary button hanya untuk action utama.

---

# 55. SECONDARY BUTTON

Untuk:

```text
secondary navigation
alternative action
low-priority CTA
```

Visual harus jelas lebih rendah daripada primary.

---

# 56. GHOST BUTTON

Ghost digunakan untuk:

```text
low-emphasis action
navigation utility
secondary interaction
```

Jangan menggunakan ghost untuk action yang sangat penting jika user dapat dengan mudah melewatkannya.

---

# 57. DESTRUCTIVE BUTTON

Digunakan untuk:

```text
Delete
Revoke
Cancel destructive operation
```

harus memiliki confirmation bila action consequential.

---

# 58. BUTTON STATES

Semua interactive buttons harus mempertimbangkan:

```text
Default
Hover
Focus
Active
Disabled
Loading
```

---

# 59. BUTTON LABEL

Gunakan action-oriented wording:

```text
Explore Xolvon
View Project
Start Learning
Continue Learning
Publish Course
Save Changes
Activate Access
```

Hindari:

```text
Click Here
Submit
Do It
Go
```

jika label yang lebih jelas tersedia.

---

# 60. INPUT SYSTEM

Inputs harus:

```text
clear
accessible
consistent
```

States:

```text
Default
Focus
Filled
Disabled
Error
Success
```

---

# 61. FORM LABEL RULE

Form harus memiliki visible semantic label.

Placeholder bukan pengganti label.

---

# 62. FORM ERROR

Error message harus:

```text
specific
actionable
near relevant field
```

Contoh buruk:

```text
Invalid input
```

Contoh lebih baik:

```text
Email belum valid.
```

---

# 63. FORM LOADING

Ketika submit:

```text
button disabled
loading indicator
avoid duplicate submission
```

---

# 64. NAVBAR

Public navbar:

```text id="c6w0u8"
Home
Solve On
Course
Marketplace
About
Login
```

Founder menetapkan navigation tersebut.

---

# 65. NAVBAR VISUAL

Navbar harus terasa:

```text
minimal
stable
high readability
low distraction
```

Jangan membuat navbar menjadi hero kedua.

---

# 66. NAVBAR RESPONSIVE

Mobile:

```text
desktop links
→
mobile menu
```

Mobile navigation harus:

* mudah disentuh,
* keyboard-accessible,
* tidak overflow,
* tidak terlalu banyak nested layers.

---

# 67. ADMIN NAVIGATION

Admin navigation berbeda dari public navigation.

Admin dapat menggunakan:

```text
Dashboard
Users
Orders
Courses
Lessons
Media
Portfolio
Marketplace
Collective
Analytics
```

Exact IA mengikuti `PRD.md`.

---

# 68. FOOTER

Footer harus terasa:

```text
Professional
Structured
Trustworthy
```

Minimal:

```text
Xolvon
Description
Legal
Contact
Social
Copyright
```

---

# 69. HERO SYSTEM

Hero harus menjawab tiga hal:

```text
What is Xolvon?
Why should I care?
Where can I go?
```

Primary message:

> Solve On Society Conundrums / Human-AI Collaboration

CTA:

> Explore Xolvon

---

# 70. HERO VISUAL

Hero visual boleh menggunakan:

```text
technical visual
system representation
subtle gradient
abstract geometry
production imagery
```

tetapi:

```text
readability > spectacle
```

---

# 71. HERO BACKGROUND RULE

Jangan otomatis menggunakan:

```text
heavy video
particle system
3D scene
large animated canvas
```

hanya karena hero disebut “futuristic”.

Futuristic ≠ complex.

---

# 72. SOLVE ON DESIGN

Solve On harus terasa seperti:

```text
Capability Showcase
```

bukan:

```text
Generic service agency page
```

Visual hierarchy:

```text
Problem
↓
System
↓
Capability
↓
Proof
```

---

# 73. COURSE DESIGN

Course interface harus terasa:

```text
Outcome-driven
Clean
Structured
Trustworthy
```

Bukan:

```text
Cheap course marketplace
```

---

# 74. COURSE CARD VISUAL PRIORITY

```text
1. Course title
2. Outcome
3. Visual
4. Price
5. CTA
```

Jangan membuat badge/status lebih dominan daripada title.

---

# 75. PORTFOLIO DESIGN

Portfolio harus terasa:

```text
Case Study
```

bukan:

```text
Image Gallery
```

Visual harus membantu story:

```text
Problem
→
Solution
→
Tech
→
Result
→
Evidence
```

---

# 76. PORTFOLIO DETAIL VISUAL

Primary visual hierarchy:

```text
Project Title
↓
Summary
↓
Problem
↓
Solution
↓
Tech Stack
↓
Result
↓
Media
↓
Team
```

---

# 77. MARKETPLACE DESIGN

Marketplace harus terasa:

```text
SaaS Discovery
```

bukan:

```text
E-commerce checkout
```

CTA harus mengarahkan user ke external SaaS site sesuai product requirement.

---

# 78. MARKETPLACE CARD

Suggested hierarchy:

```text
Product Visual
↓
Product Name
↓
Description
↓
Capabilities
↓
CTA
```

Pricing tidak boleh mendominasi apabila pricing mengikuti external SaaS.

---

# 79. COLLECTIVE DESIGN

Collective harus terasa:

```text
Human
Production-oriented
Credible
Technical
```

Bukan:

```text
Generic team page
```

---

# 80. MEMBER CARD

Suggested hierarchy:

```text
Photo
Name
Role
Skills
Project association
```

Social CTA bersifat secondary.

---

# 81. COLLECTIVE CAROUSEL

Carousel harus:

```text
Touch friendly
Keyboard friendly
Predictable
```

Avoid:

```text
auto-scroll terlalu cepat
infinite movement yang mengganggu
animation berlebihan
```

---

# 82. ADMIN TABLE DESIGN

Admin Dashboard berbeda visual dengan public marketing page.

Admin UI:

```text
Dense
Efficient
Readable
Operational
```

Prioritas:

```text
Data
Status
Action
```

bukan:

```text
Decoration
```

Handbook menetapkan Admin Dashboard sebagai operational tool dan mengutamakan table, filter, search, status badge, action confirmation, dan audit trail.

---

# 83. TABLE DESIGN

Table harus memiliki:

```text
Column hierarchy
Row spacing
Header clarity
Status
Action area
Responsive strategy
```

---

# 84. TABLE RESPONSIVE

Jangan membuat table desktop dipaksa masuk mobile tanpa strategy.

Possible patterns:

```text
horizontal scroll
stacked cards
priority column reduction
responsive table
```

Pilih berdasarkan content density.

---

# 85. STATUS BADGE

Gunakan semantic status:

```text
Published
Draft
Pending
Active
Revoked
Cancelled
Coming Soon
```

Status badge harus:

```text
compact
clear
secondary to primary content
```

---

# 86. BADGE COLOR

Jangan menentukan status hanya dari warna.

Contoh:

```text
Success green
```

tetap membutuhkan:

```text
Active
```

text label.

Ini penting untuk accessibility.

---

# 87. MODAL / DIALOG

Modal digunakan untuk:

```text
confirmation
focused action
short form
important information
```

Jangan menggunakan modal untuk setiap interaction.

---

# 88. DELETE / REVOKE CONFIRMATION

Consequential action:

```text
Delete
Revoke
Cancel important operation
```

harus memberikan confirmation.

Confirmation minimal menjelaskan:

```text
What will happen?
What cannot be undone?
What should I click?
```

---

# 89. DROPDOWN / POPOVER

Harus:

```text
aligned
keyboard-accessible
dismissable
predictable
```

Jangan menggunakan tooltip sebagai tempat menyimpan informasi penting.

---

# 90. TOOLTIP

Tooltip hanya untuk:

```text
supplementary information
```

Bukan:

```text
primary instruction
```

---

# 91. TOAST

Toast digunakan untuk transient feedback.

Contoh:

```text
Course saved.
Course published.
Access activated.
Upload complete.
```

Critical information tidak boleh hanya muncul di toast lalu hilang.

---

# 92. SKELETON

Skeleton harus:

```text
match final layout
```

Tujuannya mencegah:

```text
layout shift
```

Jangan menggunakan satu giant spinner untuk seluruh page jika sebagian content sudah bisa ditampilkan.

---

# 93. EMPTY STATE

Empty state:

```text
Explain
Guide
Act
```

Contoh:

```text
Belum ada course.
Mulai tambahkan course pertama melalui Admin Dashboard.
```

---

# 94. 404 DESIGN

404 harus terasa:

```text
calm
clear
helpful
```

Tidak perlu animation besar.

CTA:

```text
Back to Home
```

atau relevant destination.

---

# 95. ERROR DESIGN

Error:

```text
Explain the problem
+
Give next action
```

Jangan:

```text
Something went wrong
```

tanpa context apabila context aman untuk diberikan.

---

# 96. AUTH PAGE DESIGN

Login/Register harus:

```text
minimal
focused
trustworthy
```

Kurangi distraction.

Primary focus:

```text
form
```

bukan decorative background.

---

# 97. DASHBOARD DESIGN

Dashboard user:

```text
Practical
Focused
Progress-oriented
```

Primary information:

```text
My Courses
Progress
Continue Learning
```

---

# 98. LEARNING EXPERIENCE DESIGN

Lesson page harus memprioritaskan:

```text
Lesson title
Content
Video/resource
Navigation
Progress
```

Jangan membebani learning page dengan marketing sections besar.

---

# 99. PREMIUM CONTENT UX

User harus mengetahui:

```text
access available
```

atau:

```text
access unavailable
```

tanpa membocorkan protected media URL.

---

# 100. ACCESS DENIED UX

Forbidden state:

```text
Clear
Non-judgmental
Actionable
```

Contoh action:

```text
Go to Dashboard
Contact Admin
Return to Course
```

sesuai context.

---

# 101. PAYMENT UX

Payment V1 harus terlihat:

```text
Manual Verification
```

bukan:

```text
Instant Payment
```

Jangan memberikan false expectation bahwa akses otomatis aktif setelah payment.

---

# 102. CHECKOUT INFORMATION HIERARCHY

```text
Course
↓
Price
↓
Payment Instruction
↓
Next Step
↓
WhatsApp Admin
```

User harus selalu tahu:

> “Setelah saya bayar, apa yang harus saya lakukan?”

---

# 103. ACTIVATION UX

Setelah admin mengaktifkan:

```text
Success
↓
Dashboard CTA
```

User harus dapat memahami bahwa course sudah bisa diakses.

---

# 104. RESPONSIVE DESIGN PRINCIPLE

## [LOCKED]

Responsive-first.

Founder menetapkan layout harus nyaman di mobile dan desktop.

Minimum test:

```text
320px
390px
768px
1024px
1440px
Large Desktop
```

---

# 105. MOBILE-FIRST RULE

Setiap component harus dipikirkan:

```text
Mobile
→
Tablet
→
Desktop
```

Bukan:

```text
Desktop
→
shrink everything
```

---

# 106. MOBILE NAVIGATION

Mobile navigation harus memiliki:

```text
clear open/close
focus management
touch target
escape/dismiss behavior
```

---

# 107. TOUCH TARGET

## [IMPLEMENTATION DEFAULT]

Interactive target idealnya tidak terlalu kecil.

Gunakan minimum practical touch area sekitar:

```text
44 × 44px
```

untuk primary interactive controls.

---

# 108. MOBILE TYPOGRAPHY

Jangan mengecilkan body text hingga sulit dibaca hanya agar layout “muat”.

Prioritaskan:

```text
readability
```

---

# 109. MOBILE CARD GRID

Contoh:

```text
Desktop:
3–4 columns

Tablet:
2 columns

Mobile:
1 column
```

Jumlah aktual mengikuti content.

---

# 110. MOBILE HERO

Hero harus:

```text
headline readable
CTA reachable
visual not overwhelming
```

Jangan membuat hero membutuhkan terlalu banyak scrolling sebelum user menemukan CTA.

---

# 111. RESPONSIVE IMAGE RULE

Image harus:

```text
fluid
aspect-ratio aware
not stretched
```

gunakan `object-fit` yang sesuai.

---

# 112. IMAGE RATIO CONSISTENCY

Dalam collection yang sama:

```text
Course Cards
Project Cards
Marketplace Cards
Member Cards
```

gunakan predictable ratio.

Jangan satu card 16:9 dan card lain 3:4 tanpa design reason.

---

# 113. ANIMATION PRINCIPLE

## [LOCKED]

Animation:

```text
Minimal
Smooth
```

Founder menegaskan clarity, speed, dan professionalism lebih penting daripada efek berat.

---

# 114. ANIMATION PURPOSE

Animation hanya digunakan apabila membantu:

```text
feedback
hierarchy
transition
orientation
discovery
```

Bukan hanya:

```text
"looks cool"
```

---

# 115. ANIMATION DEFAULT

## [IMPLEMENTATION DEFAULT]

Recommended:

```text
fast ease
subtle fade
small translate
scale < 1.05
```

Avoid:

```text
large movement
slow animation
constant motion
bouncy motion everywhere
```

---

# 116. HOVER

Hover digunakan untuk:

```text
affordance
feedback
```

Contoh:

```text
Card subtle elevation
Border emphasis
Color/contrast shift
```

Tidak perlu:

```text
3D rotation
huge scaling
neon glow
```

---

# 117. PAGE TRANSITION

Page transitions bukan requirement wajib.

Jika digunakan:

```text
subtle
fast
non-blocking
```

Jangan membuat route navigation terasa lambat hanya karena animation.

---

# 118. REDUCED MOTION

Harus respect:

```text
prefers-reduced-motion
```

Jika user memilih reduced motion:

```text
heavy animation
→
reduced / disabled
```

---

# 119. ACCESSIBILITY VISUAL CONTRACT

Design harus mempertahankan:

```text
contrast
focus
readability
semantic hierarchy
```

Handbook mewajibkan visible focus, adequate text contrast, accessible carousel, alt text, dan reduced-motion behavior.

---

# 120. FOCUS STATE

Focus harus:

```text
visible
consistent
high enough contrast
```

Jangan menghapus:

```css
outline: none;
```

tanpa menyediakan equivalent focus indicator.

---

# 121. COLOR IS NOT ONLY SIGNAL

Jangan menyampaikan status hanya melalui:

```text
green
red
yellow
```

Tambahkan:

```text
text
icon
shape
```

bila relevan.

---

# 122. DARK MODE CONTRAST

Dark interface tidak berarti:

```text
gray-on-gray
```

Pastikan:

```text
primary text
secondary text
interactive text
disabled text
```

memiliki hierarchy yang jelas.

---

# 123. LINK DESIGN

Text links harus:

```text
identifiable
consistent
interactive
```

Jangan membuat link indistinguishable dari body text.

---

# 124. SCROLL BEHAVIOR

Jangan menggunakan:

```text
scroll-jacking
```

Scroll native harus tetap predictable.

Handbook secara eksplisit meminta menghindari scroll-jacking.

---

# 125. STICKY ELEMENTS

Sticky:

```text
navbar
filters
lesson navigation
```

dapat digunakan apabila membantu usability.

Tetapi jangan membuat terlalu banyak sticky layers yang mengurangi viewport.

---

# 126. Z-INDEX SYSTEM

## [IMPLEMENTATION DEFAULT]

Gunakan hierarchy:

```text
Base
Sticky
Dropdown
Popover
Modal
Toast
Critical Overlay
```

Jangan menggunakan:

```text
z-index: 999999
```

secara random.

---

# 127. COMPONENT CONSISTENCY

Component yang sama harus memiliki:

```text
same anatomy
same states
same spacing logic
same interaction
same typography
```

di seluruh website.

---

# 128. BUTTON CONSISTENCY EXAMPLE

Primary button di:

```text
Home
Course
Portfolio
Marketplace
Admin
```

tidak boleh memiliki lima visual language berbeda.

Context boleh berbeda.

System tidak.

---

# 129. CARD CONSISTENCY EXAMPLE

Course card:

```text
radius
padding
title hierarchy
image treatment
CTA
```

Portfolio card boleh memiliki content berbeda, tetapi visual system harus terasa berasal dari family yang sama.

---

# 130. SECTION HEADER

Default anatomy:

```text
Eyebrow (optional)
↓
Heading
↓
Description (optional)
↓
Action (optional)
```

Jangan semua section menggunakan giant title.

---

# 131. EYEBROW

Eyebrow digunakan untuk:

```text
context
category
section label
```

Contoh:

```text
PORTFOLIO
COURSE
COLLECTIVE
```

Jangan menggunakan uppercase hanya untuk decorative styling pada semua text.

---

# 132. SECTION CTA

Section CTA harus:

```text
clear
relevant
single-primary
```

Example:

```text
Explore Marketplace
View Portfolio
Meet the Collective
Start Learning
```

---

# 133. DESIGN DENSITY

Public marketing:

```text
Spacious
```

Admin:

```text
Dense
```

Learning:

```text
Focused
```

Search/catalog:

```text
Scannable
```

---

# 134. PUBLIC PAGE DESIGN RULE

Public page harus selalu menjawab:

```text
What?
Why?
Evidence?
Next action?
```

---

# 135. ADMIN PAGE DESIGN RULE

Admin page harus menjawab:

```text
What data?
What state?
What action?
What happened?
```

---

# 136. DASHBOARD DESIGN RULE

User dashboard harus menjawab:

```text
What do I own?
Where am I?
What should I do next?
```

---

# 137. SEARCH PAGE DESIGN

Search UI:

```text
Input
↓
Query context
↓
Filters
↓
Results
↓
Empty state / pagination if applicable
```

---

# 138. FILTER DESIGN

Filter harus:

```text
discoverable
reversible
clear
```

User harus dapat mengetahui filter aktif.

---

# 139. ACTIVE FILTER

Gunakan:

```text
chip
badge
selected state
```

untuk menunjukkan filter aktif.

---

# 140. RESET FILTER

Jika filter aktif:

```text
Clear / Reset
```

harus mudah ditemukan.

---

# 141. EMPTY SEARCH

Empty search minimal:

```text
No result
+
query context
+
reset action
```

Handbook menetapkan search kosong harus menampilkan query dan reset filter.

---

# 142. LOADING DESIGN

Loading harus menjelaskan:

```text
what is loading
```

Gunakan:

```text
Skeleton
Progress
Button loading
```

sesuai context.

---

# 143. ERROR DESIGN LANGUAGE

Error bukan alarm visual yang berlebihan.

Gunakan:

```text
clear
calm
specific
actionable
```

Red hanya digunakan ketika memang relevan.

---

# 144. SUCCESS DESIGN LANGUAGE

Success:

```text
clear
brief
positive
```

tidak perlu confetti.

---

# 145. WARNING DESIGN

Warning digunakan untuk:

```text
potentially consequential action
```

bukan untuk setiap informational notice.

---

# 146. DIALOG DESIGN

Dialog structure:

```text
Title
↓
Explanation
↓
Action(s)
```

Primary action harus mudah ditemukan.

---

# 147. DIALOG WIDTH

## [IMPLEMENTATION DEFAULT]

Gunakan width berdasarkan task.

Small:

```text
short confirmation
```

Medium:

```text
forms
```

Large:

```text
complex admin content
```

Jangan membuat semua dialog fullscreen.

---

# 148. FORM GROUPING

Admin forms yang panjang harus dikelompokkan secara semantic:

```text
Basic Information
Media
Content
Settings
Publishing
```

Jangan menjadi satu giant form tanpa structure.

---

# 149. ADMIN CREATE/EDIT DESIGN

Admin editor harus memprioritaskan:

```text
Content completeness
Validation
Preview
Save
Publish
```

bukan visual marketing.

---

# 150. DRAFT VS PUBLISHED VISUAL

Draft:

```text
visible internal state
```

Published:

```text
public state
```

Visual status harus jelas.

---

# 151. COMING SOON

Coming Soon harus:

```text
clear
non-misleading
secondary
```

Jangan membuat Coming Soon terlihat seolah feature sudah usable.

---

# 152. PLACEHOLDER DESIGN

Placeholder harus terlihat seperti:

```text
placeholder
```

bukan:

```text
fake production content
```

---

# 153. FAKE CONTENT VISUAL RULE

Jangan membuat fake content terlalu realistic hingga user percaya itu data nyata.

Examples of things that must not be fabricated:

```text
users
revenue
client logos
testimonials
project results
success percentages
```

Handbook melarang klaim tersebut.

---

# 154. MEDIA CROPPING

Media harus menggunakan predictable treatment:

```text
cover
contain
natural
```

sesuai jenis asset.

---

# 155. PRODUCT IMAGE RULE

Product visual harus:

```text
sharp
clean
well-cropped
```

Jangan menambahkan frame/decorations random di setiap card.

---

# 156. PORTFOLIO MEDIA RULE

Portfolio screenshots sebaiknya menjadi:

```text
evidence
```

bukan decoration.

Gunakan media untuk mendukung case story.

---

# 157. VIDEO DESIGN RULE

Video player:

```text
clear controls
usable
responsive
```

Premium video tidak boleh menampilkan protected storage implementation details.

---

# 158. PDF / RESOURCE DESIGN

Resources:

```text
title
type
action
```

harus dapat dipahami dengan cepat.

---

# 159. LEARNING NAVIGATION

Lesson navigation sebaiknya membantu:

```text
Previous
Current
Next
```

tetapi jangan menenggelamkan lesson content.

---

# 160. PROGRESS VISUALIZATION

Progress harus:

```text
clear
subtle
useful
```

Jangan menggunakan giant chart untuk simple lesson progress.

---

# 161. ADMIN ANALYTICS DESIGN

Analytics harus:

```text
operational
scannable
actionable
```

Default visual:

```text
summary metrics
tables
small charts
trends if meaningful
```

Bukan dashboard penuh decorative charts.

---

# 162. METRIC CARD RULE

Metric cards harus menjawab:

```text
Metric
Current value
Context
```

Jangan membuat metric card hanya:

```text
big number
```

tanpa context jika context memang dibutuhkan.

---

# 163. DATA VISUALIZATION RULE

Chart digunakan hanya jika:

```text
trend
comparison
distribution
```

tidak mudah dipahami dari angka/table biasa.

Jangan membuat chart hanya supaya dashboard terlihat sophisticated.

---

# 164. PUBLIC VS ADMIN VISUAL DISTINCTION

Public:

```text
Brand-led
Spacious
Visual
Narrative
```

Admin:

```text
Data-led
Dense
Operational
Action-oriented
```

Keduanya masih harus terlihat sebagai Xolvon.

---

# 165. DESIGN TOKEN RULE

Semua repeated visual values harus memiliki token:

```text
color
spacing
radius
shadow
typography
breakpoint
```

Jangan hardcode repeated values di banyak component.

---

# 166. TOKEN NAMING

Gunakan semantic naming.

Contoh:

```text
--background
--foreground
--surface
--surface-muted
--border
--primary
--secondary
--accent
--success
--warning
--destructive
```

Bukan:

```text
--blue1
--blue2
--darkblue3
--green7
```

---

# 167. COMPONENT VARIANT RULE

Variant hanya dibuat apabila ada semantic reason.

Contoh:

```text
Button:
primary
secondary
ghost
destructive
```

Jangan:

```text
button-blue
button-blue-2
button-blue-dark
button-purple-special
```

tanpa semantic meaning.

---

# 168. COMPONENT STATE RULE

Component state harus berasal dari semantic state.

Contoh:

```text
disabled
loading
error
success
selected
active
```

bukan:

```text
isBlue
isFancy
isCool
```

---

# 169. DESIGN SYSTEM EXTENSION RULE

Jika designer/FE membutuhkan pattern baru:

```text
Need identified
↓
Check existing token
↓
Check existing component
↓
Check existing variant
↓
Extend system
```

bukan langsung:

```text
new custom component
```

---

# 170. SHADCN/UI RULE

## [LOCKED BASELINE]

shadcn/ui dapat digunakan sebagai UI primitive untuk menjaga konsistensi. Handbook dan Master PRD sama-sama menempatkannya sebagai baseline UI approach.
shadcn/ui adalah:

```text
foundation
```

bukan:

```text
final Xolvon visual identity
```

---

# 171. SHADCN CUSTOMIZATION

Allowed:

```text
color tokens
radius
typography
spacing
variants
states
```

Avoid:

```text
each team customizing the same primitive differently
```

---

# 172. DESIGN SYSTEM OWNERSHIP

Shared design tokens/component rules harus dianggap:

```text
shared infrastructure
```

Perubahan global memerlukan review karena dapat memengaruhi seluruh website.

---

# 173. VISUAL REGRESSION RULE

Jika shared component berubah:

```text
Button
Card
Input
Navbar
Dialog
Badge
```

cek minimal:

```text
Home
Course
Portfolio
Marketplace
Collective
Admin
```

sesuai component usage.

---

# 174. PAGE-LEVEL CUSTOMIZATION

Page boleh memiliki personality:

```text
Hero
Portfolio
Course
Marketplace
```

tetapi personality harus tetap berada di dalam:

```text
Xolvon Design System
```

---

# 175. NO PAGE-SPECIFIC DESIGN SYSTEM

Dilarang membuat:

```text
Home Design System
Course Design System
Marketplace Design System
```

yang tidak berbagi token/component language.

---

# 176. VISUAL HIERARCHY RULE

Primary:

```text
What matters most?
```

Secondary:

```text
What helps understand it?
```

Tertiary:

```text
What helps act?
```

Decorative:

```text
Last
```

---

# 177. CONTRAST HIERARCHY

Visual contrast harus digunakan untuk:

```text
importance
interaction
state
```

bukan untuk membuat setiap element “pop”.

---

# 178. WHITESPACE RULE

Whitespace adalah bagian dari design.

Jangan mengisi whitespace hanya karena:

> “kelihatannya kosong.”

Empty space dapat meningkatkan:

```text
focus
premium perception
clarity
hierarchy
```

---

# 179. VISUAL NOISE RULE

Hilangkan jika tidak diperlukan:

```text
gradient
glow
icon
border
shadow
animation
badge
background pattern
```

Jika dua atau lebih element mencoba mendapatkan attention yang sama:

```text
reduce one
```

---

# 180. FUTURISTIC RULE

Futuristic Xolvon berarti:

```text
technology
precision
systems
modernity
```

bukan:

```text
neon
cyberpunk
spaceship
3D everywhere
```

---

# 181. CORPORATE RULE

Corporate berarti:

```text
credible
structured
professional
clear
```

bukan:

```text
boring
generic
bureaucratic
```

---

# 182. STARTUP RULE

Startup berarti:

```text
fast
fresh
confident
simple
```

bukan:

```text
unfinished
sloppy
experimental everywhere
```

---

# 183. BUILDER RULE

Builder identity harus terasa melalui:

```text
real projects
systems
technology
team attribution
case studies
```

Bukan melalui:

```text
decoration
```

---

# 184. DESIGN DO — XOLVON

Gunakan:

```text
✓ Strong typography
✓ Deep dark surfaces
✓ Subtle blue/purple atmosphere
✓ Controlled green accent
✓ Clean grid
✓ Strong whitespace
✓ Minimal cards
✓ Clear CTA
✓ Real project evidence
✓ Technical imagery
✓ Smooth micro-interaction
✓ Responsive-first design
```

---

# 185. DESIGN DON'T — XOLVON

Hindari:

```text
✗ Excessive neon
✗ Rainbow gradients
✗ Giant glows
✗ Heavy glassmorphism
✗ Excessive rounded pills
✗ Excessive animation
✗ Giant decorative 3D
✗ Fake dashboards
✗ Fake metrics
✗ Fake testimonials
✗ Generic SaaS template appearance
✗ Overloaded sections
✗ Tiny unreadable text
```

---

# 186. MOBILE DO

```text
✓ One clear primary CTA
✓ Simple navigation
✓ Readable typography
✓ Comfortable spacing
✓ Vertical content flow
✓ Touch-friendly interaction
✓ Optimized media
```

---

# 187. MOBILE DON'T

```text
✗ Tiny buttons
✗ Desktop-width tables
✗ Horizontal overflow
✗ Giant hero text
✗ Excessive animations
✗ Dense multi-column layout
✗ Hidden CTA
```

---

# 188. ADMIN DO

```text
✓ Dense tables
✓ Clear status
✓ Fast scanning
✓ Strong filters
✓ Search
✓ Explicit actions
✓ Confirmation
✓ Operational hierarchy
```

---

# 189. ADMIN DON'T

```text
✗ Decorative dashboards
✗ Excessive gradients
✗ Giant cards
✗ Hidden actions
✗ Ambiguous status
✗ Marketing-style hero
```

---

# 190. ACCESSIBILITY DO

```text
✓ Visible focus
✓ Adequate contrast
✓ Semantic labels
✓ Keyboard navigation
✓ Touch support
✓ Reduced motion
✓ Alt text
```

---

# 191. ACCESSIBILITY DON'T

```text
✗ Color-only status
✗ Invisible focus
✗ Tiny touch targets
✗ Motion-dependent information
✗ Tooltip-only essential information
```

---

# 192. PAGE TEMPLATE SYSTEM

Public page templates:

```text
Marketing Page
Listing Page
Detail Page
Auth Page
Learning Page
Dashboard Page
Admin Operational Page
```

Gunakan template family yang konsisten.

---

# 193. MARKETING PAGE TEMPLATE

```text
Navbar
↓
Hero
↓
Context
↓
Main Content
↓
Proof / Evidence
↓
CTA
↓
Footer
```

---

# 194. LISTING PAGE TEMPLATE

```text
Navbar
↓
Page Header
↓
Search
↓
Filters
↓
Grid
↓
Pagination if applicable
↓
Footer
```

---

# 195. DETAIL PAGE TEMPLATE

```text
Navbar
↓
Hero / Header
↓
Primary Information
↓
Supporting Information
↓
Evidence / Media
↓
Related Content
↓
CTA
↓
Footer
```

---

# 196. AUTH PAGE TEMPLATE

```text
Focused Layout
↓
Heading
↓
Form
↓
Primary Action
↓
Support / Recovery
```

---

# 197. LEARNING PAGE TEMPLATE

```text
Learning Navigation
↓
Lesson Header
↓
Primary Learning Content
↓
Resources
↓
Progress / Navigation
```

---

# 198. DASHBOARD TEMPLATE

```text
Dashboard Header
↓
Primary Summary
↓
Main User Data
↓
Primary Next Action
```

---

# 199. ADMIN TEMPLATE

```text
Admin Navigation
↓
Page Header
↓
Filters/Search
↓
Main Table/Grid
↓
Actions
↓
Feedback
```

---

# 200. DESIGN QUALITY GATE

Sebuah UI dianggap sesuai `DESIGN.md` apabila:

```text id="v1dsgn"
[ ] Visual personality sesuai Xolvon
[ ] Typography konsisten
[ ] Color token digunakan
[ ] Spacing token digunakan
[ ] Radius konsisten
[ ] Border konsisten
[ ] Shadow konsisten
[ ] Button system konsisten
[ ] Card system konsisten
[ ] Loading state ada
[ ] Empty state ada
[ ] Error state ada
[ ] Responsive
[ ] Accessibility diperhatikan
[ ] Animation tidak berlebihan
[ ] Tidak ada fake data
[ ] Tidak terlihat seperti design system berbeda
```

---

# 201. AI DESIGN GENERATION PROTOCOL

Ketika AI diminta:

```text
"buat halaman baru"
```

AI harus terlebih dahulu mencari:

```text
Existing page pattern
Existing component
Existing token
Existing layout
Existing interaction
```

Kemudian:

```text
Reuse
↓
Extend
↓
Create
```

Urutan tersebut wajib dipertahankan.

---

# 202. AI VISUAL DECISION PROTOCOL

Jika AI memiliki dua pilihan:

```text
Option A:
simple + consistent

Option B:
flashy + novel
```

default Xolvon:

```text
OPTION A
```

kecuali PRD/design direction secara eksplisit membutuhkan Option B.

---

# 203. AI COLOR PROTOCOL

AI tidak boleh melakukan:

```text
"Let's use this nice purple."
```

lalu memasukkan random hex.

AI harus:

```text
Find semantic color token
↓
Reuse token
```

---

# 204. AI SPACING PROTOCOL

AI tidak boleh:

```text
margin-top: 37px
padding: 19px
gap: 27px
```

tanpa reason.

Gunakan spacing scale.

---

# 205. AI COMPONENT PROTOCOL

Sebelum membuat:

```text
CourseCard
```

AI harus memeriksa apakah:

```text
Card
ContentCard
ProductCard
```

sudah tersedia dan dapat diperluas.

---

# 206. AI ANIMATION PROTOCOL

Default:

```text
No animation
```

kecuali animation memiliki tujuan.

Kemudian:

```text
Subtle animation
```

sebelum:

```text
Complex animation
```

---

# 207. AI RESPONSIVE PROTOCOL

AI harus memeriksa minimal:

```text
320px
390px
768px
1024px
1440px
```

bukan hanya screenshot desktop.

---

# 208. AI ACCESSIBILITY PROTOCOL

AI harus memeriksa:

```text
keyboard
focus
contrast
labels
alt
reduced motion
touch
```

sebelum task dianggap complete.

---

# 209. VISUAL REGRESSION PROTOCOL

Ketika membuat page baru:

```text
Check:
Navbar
Footer
Typography
Container
Button
Card
Spacing
Theme
Mobile
```

Page baru tidak boleh introduce a new visual language.

---

# 210. THE "ONE PRODUCT" TEST

Setelah beberapa developer mengerjakan:

```text
Home
Course
Portfolio
Marketplace
Collective
Admin
```

screenshot harus terasa seperti:

```text
ONE BRAND
ONE PRODUCT
ONE DESIGN SYSTEM
```

Jika terlihat seperti lima website berbeda:

```text
DESIGN REVIEW REQUIRED
```

---

# 211. VISUAL CONSISTENCY TEST

Ambil component yang sama:

```text
Primary Button
Card
Input
Badge
Modal
Navbar
```

lalu tampilkan di:

```text
Home
Course
Portfolio
Marketplace
Collective
Admin
```

Mereka harus terlihat berasal dari system yang sama.

---

# 212. TYPOGRAPHY CONSISTENCY TEST

Bandingkan:

```text
H1
H2
Body
Caption
Button
Label
```

di beberapa page.

Scale dan hierarchy harus tetap terasa konsisten.

---

# 213. SPACING CONSISTENCY TEST

Bandingkan:

```text
Page section
Card
Form
Table
Modal
```

Spacing harus terasa mengikuti satu rhythm.

---

# 214. COLOR CONSISTENCY TEST

Tidak boleh ada:

```text
Home purple A
Course purple B
Marketplace purple C
Admin purple D
```

untuk semantic color yang sama.

---

# 215. INTERACTION CONSISTENCY TEST

Action yang sama harus memiliki feedback serupa.

Contoh:

```text
Save
Publish
Delete
Activate
Revoke
```

---

# 216. CONTENT CONSISTENCY

Visual tidak boleh mendorong content fabrication.

Jika data belum ada:

```text
Placeholder
Coming Soon
Empty State
```

bukan fake production card.

---

# 217. PERFORMANCE DESIGN RULE

Design harus memperhitungkan:

```text
image payload
video payload
client JavaScript
animation cost
layout complexity
```

Handbook meminta lazy loading media below-the-fold dan menghindari JavaScript client yang tidak perlu.

---

# 218. MEDIA OPTIMIZATION

Gunakan:

```text
correct dimensions
responsive image
lazy-loading when appropriate
efficient formats
```

Jangan mengirim asset 4K ke mobile jika tidak diperlukan.

---

# 219. HERO MEDIA

Hero media harus:

```text
optimized
non-blocking
responsive
```

Jangan membuat giant background video sebagai default.

Handbook secara eksplisit menyarankan menghindari background video/hero asset besar sebagai default.

---

# 220. DESIGN ACCESSIBILITY CHECK

Sebelum release:

```text
[ ] Text contrast
[ ] Focus visible
[ ] Keyboard
[ ] Form labels
[ ] Button state
[ ] Alt text
[ ] Carousel controls
[ ] Reduced motion
[ ] Mobile touch interaction
```

---

# 221. DESIGN SYSTEM MATURITY LEVEL

### Level 0

Random styling.

```text
NOT ACCEPTED
```

### Level 1

Shared colors/components.

```text
Basic
```

### Level 2

Tokens + shared components + responsive rules.

```text
REQUIRED
```

### Level 3

Tokens + components + variants + visual regression + documentation.

```text
TARGET
```

Xolvon harus minimal mencapai Level 2 dan ideally Level 3.

---

# 222. DESIGN CHANGE PROCESS

Jika FE ingin mengubah shared design:

```text
Identify Problem
↓
Check Existing System
↓
Propose Change
↓
Assess Impact
↓
Review
↓
Update DESIGN.md
↓
Update Shared Component
↓
Regression Check
```

Jangan mengubah shared styling langsung tanpa memperbarui contract.

---

# 223. DESIGN DECISION LOG

Untuk keputusan baru:

```text
Design Decision:
-

Problem:
-

Current Rule:
-

Proposed Change:
-

Reason:
-

Affected Components:
-

Owner:
-

Date:
-

Status:
```

---

# 224. OPEN DESIGN ITEMS

Items yang tidak memiliki exact source value harus dianggap:

```text
[IMPLEMENTATION DEFAULT]
```

atau:

```text
[OPEN]
```

contoh:

```text
Exact color hex
Exact typography scale
Exact spacing scale
Exact radius scale
Exact shadow token
Exact breakpoint token
Exact animation duration
```

Jangan menyebut implementation default sebagai:

```text
"Founder-approved"
```

kecuali memang telah disetujui.

---

# 225. FINAL DESIGN HIERARCHY

Ketika terjadi conflict:

```text
Explicit Founder Visual Decision
>
Approved Design Decision
>
DESIGN.md
>
Existing Shared Component
>
Implementation Default
>
Developer Preference
```

Developer preference berada paling bawah.

---

# 226. XOLVON VISUAL MANTRA

```text
Futuristic
without being flashy.

Corporate
without being boring.

Startup
without being sloppy.

Technical
without being intimidating.

Minimal
without being empty.

Professional
without being generic.

Human
without being childish.
```

---

# 227. FINAL RULE

> **Every new page must look like it belongs to Xolvon before it looks like it belongs to the developer who built it.**

---

# 228. FINAL VIBE CODING RULE

AI tidak bertugas menciptakan:

```text
"desain baru setiap prompt."
```

AI bertugas mengimplementasikan:

```text
ONE XOLVON DESIGN SYSTEM
```

Semua visual baru harus menjawab:

```text
Apakah token-nya sama?
Apakah typography-nya sama?
Apakah spacing-nya sama?
Apakah interaction-nya sama?
Apakah responsive behavior-nya sama?
Apakah hierarchy-nya sama?
Apakah ini masih terasa seperti Xolvon?
```

Jika jawabannya tidak:

```text
STOP
REVIEW DESIGN SYSTEM
```

---

# END OF DESIGN.md
