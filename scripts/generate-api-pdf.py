from pathlib import Path
import json
import re
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Preformatted

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / 'docs' / 'api-contract.md'
COLLECTION = ROOT / 'Xolvon-API.postman_collection.json'
OUTPUT = ROOT / 'docs' / 'Xolvon-API-Documentation.pdf'

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='Cover', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=26, leading=31, alignment=TA_CENTER, textColor=colors.HexColor('#17324D'), spaceAfter=10))
styles.add(ParagraphStyle(name='CoverSub', parent=styles['Normal'], fontSize=12, leading=18, alignment=TA_CENTER, textColor=colors.HexColor('#496579')))
styles.add(ParagraphStyle(name='H1x', parent=styles['Heading1'], fontSize=17, leading=21, textColor=colors.HexColor('#17324D'), spaceBefore=11, spaceAfter=7))
styles.add(ParagraphStyle(name='H2x', parent=styles['Heading2'], fontSize=11.5, leading=14, textColor=colors.HexColor('#247B8F'), spaceBefore=8, spaceAfter=4))
styles.add(ParagraphStyle(name='Bodyx', parent=styles['BodyText'], fontSize=8.8, leading=13, spaceAfter=5))
styles.add(ParagraphStyle(name='Smallx', parent=styles['BodyText'], fontSize=7.1, leading=9.2, textColor=colors.HexColor('#304858')))
styles.add(ParagraphStyle(name='Codex', parent=styles['Code'], fontName='Courier', fontSize=7.2, leading=9, backColor=colors.HexColor('#F2F5F7'), borderPadding=5, leftIndent=4, rightIndent=4, spaceBefore=3, spaceAfter=6))

def esc(value):
    return str(value).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

def P(value, style='Bodyx'):
    return Paragraph(str(value), styles[style])

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor('#D8E1E8'))
    canvas.line(15*mm, 13*mm, 195*mm, 13*mm)
    canvas.setFont('Helvetica', 7)
    canvas.setFillColor(colors.HexColor('#687B89'))
    canvas.drawString(15*mm, 8*mm, 'Xolvon API Documentation')
    canvas.drawRightString(195*mm, 8*mm, f'Halaman {doc.page}')
    canvas.restoreState()

def table(rows, widths, header='#17324D'):
    result = Table(rows, colWidths=widths, repeatRows=1)
    result.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor(header)),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('GRID', (0,0), (-1,-1), 0.25, colors.HexColor('#CBD7DE')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F7FAFB')]),
        ('LEFTPADDING', (0,0), (-1,-1), 4), ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4), ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    return result

def postman_count():
    if not COLLECTION.exists():
        return 'tidak tersedia'
    data = json.loads(COLLECTION.read_text(encoding='utf-8'))
    def count(items):
        return sum(1 if 'request' in item else count(item.get('item', [])) for item in items or [])
    return str(count(data.get('item', [])))

contract = CONTRACT.read_text(encoding='utf-8')
endpoints = []
module = 'General'
for line in contract.splitlines():
    heading = re.match(r'^###\s+(.+?)(?:\s+\([^)]*\))?$', line)
    if heading:
        module = heading.group(1).strip()
    if line.startswith('|') and not line.startswith('|---') and 'Method' not in line and re.match(r'^\|\s*(GET|POST|PATCH|DELETE|PUT)\s*\|', line):
        cells = [cell.strip().replace('`', '') for cell in line.strip('|').split('|')]
        if len(cells) >= 5:
            endpoints.append((module, cells[0], cells[1], cells[2], cells[4], cells[5] if len(cells) > 5 else ''))

story = [Spacer(1, 32*mm), P('XOLVON API', 'Cover'), P('Dokumentasi Integrasi REST API', 'CoverSub'), Spacer(1, 9*mm), P('Dokumentasi ini dibuat dari kontrak endpoint aktif repository dan collection Postman Xolvon. Isinya fokus pada integrasi, pengujian, autentikasi, payload, keamanan, dan alur bisnis yang benar-benar tersedia.', 'CoverSub'), Spacer(1, 28*mm)]
story.append(table([[P('Scope','Smallx'), P('Backend API Xolvon V1','Smallx')], [P('Global prefix','Smallx'), P('/api','Smallx')], [P('Auth','Smallx'), P('Bearer JWT; role user dan admin','Smallx')], [P('Pagination','Smallx'), P('page 1-based; limit default 20, maksimum 100','Smallx')], [P('Postman requests','Smallx'), P(postman_count(),'Smallx')]], [45*mm, 120*mm]))
story.append(PageBreak())

story += [P('1. Konvensi API', 'H1x'), P('Semua route backend menggunakan global prefix <b>/api</b>. Format utama adalah JSON over HTTP. Route private menggunakan Authorization Bearer JWT. Validasi global memakai whitelist, forbidNonWhitelisted, dan transform.', 'Bodyx')]
for item in ['Endpoint public hanya mengembalikan konten published dan field aman.', 'Endpoint admin memerlukan JWT dengan role admin.', 'Pagination memakai page mulai 1 dan limit maksimum 100.', 'Mutation sensitif publish, verify, activate, revoke, dan cancel dicatat dalam audit internal.', 'Tidak ada endpoint publik untuk membuat admin, mengubah role, atau membaca audit log.']:
    story.append(P('• ' + item))

story += [P('2. Auth Flow', 'H1x')]
for item in ['POST /auth/register membuat user biasa. Field role tidak diterima.', 'POST /auth/login mengembalikan accessToken, refreshToken, dan user.', 'Gunakan accessToken pada header Authorization untuk route private.', 'POST /auth/refresh menerbitkan access token baru.', 'POST /auth/logout mencabut refresh session.', 'AuthGuard dan RolesGuard memeriksa token serta role di server.']:
    story.append(P('• ' + item))
story += [P('Payload login', 'H2x'), Preformatted('{\n  "email": "user@example.com",\n  "password": "Password123!"\n}', styles['Codex'])]

story += [P('3. Endpoint Aktif', 'H1x'), P(f'Endpoint di bawah diparsing dari docs/api-contract.md. Total route terdeteksi: {len(endpoints)}.', 'Bodyx')]
current = None
for current_module, method, path, auth, status, description in endpoints:
    if current_module != current:
        current = current_module
        story.append(P(esc(current), 'H2x'))
    story.append(table([[P('<b>Method</b>','Smallx'), P('<b>Path</b>','Smallx'), P('<b>Auth / Role</b>','Smallx'), P('<b>Deskripsi</b>','Smallx')], [P(esc(method),'Smallx'), P(esc(path),'Smallx'), P(esc(auth),'Smallx'), P(esc(description),'Smallx')]], [18*mm, 58*mm, 35*mm, 64*mm], '#247B8F'))

story += [PageBreak(), P('4. Payload Integrasi', 'H1x'), P('Payload create tidak menerima status. Resource dibuat sebagai draft lalu berpindah status melalui endpoint publish atau unpublish.', 'Bodyx'), P('Register', 'H2x'), Preformatted('{\n  "name": "Xolvon User",\n  "email": "user@example.com",\n  "phone": "+6281234567890",\n  "password": "Password123!"\n}', styles['Codex']), P('Create course', 'H2x'), Preformatted('{\n  "title": "Course Contoh",\n  "slug": "course-contoh",\n  "description": "Deskripsi course.",\n  "price": 150000,\n  "thumbnailUrl": "https://example.com/thumb.webp"\n}', styles['Codex']), P('Checkout order', 'H2x'), Preformatted('{\n  "courseIds": ["00000000-0000-4000-8000-000000000000"],\n  "notes": "Pembayaran via transfer."\n}', styles['Codex']), P('Update progress', 'H2x'), Preformatted('{\n  "lessonId": "00000000-0000-4000-8000-000000000000",\n  "completed": true\n}', styles['Codex'])]

story += [P('5. Validasi dan Query', 'H1x'), table([[P('<b>Area</b>','Smallx'), P('<b>Aturan</b>','Smallx'), P('<b>Hasil salah</b>','Smallx')], [P('UUID','Smallx'),P('ID internal harus UUID v4','Smallx'),P('400 Bad Request','Smallx')], [P('Slug','Smallx'),P('lowercase kebab-case dan unik','Smallx'),P('400 atau 409','Smallx')], [P('Pagination','Smallx'),P('page 1-based; limit maksimal 100','Smallx'),P('400 Bad Request','Smallx')], [P('Media','Smallx'),P('prefix, MIME, dan ukuran memakai allowlist','Smallx'),P('400 Bad Request','Smallx')], [P('Marketplace URL','Smallx'),P('externalUrl harus HTTPS valid','Smallx'),P('400 Bad Request','Smallx')]], [35*mm, 95*mm, 45*mm], '#17324D')]
for item in ['200 request berhasil.', '201 resource dibuat.', '400 DTO, format, atau state transition salah.', '401 token tidak ada atau tidak valid.', '403 role tidak cukup.', '404 resource tidak ditemukan atau tidak terlihat.', '409 konflik slug atau state.', '429 rate limit tercapai.', '500 kegagalan server; jangan tampilkan stack trace ke client.']:
    story.append(P('• ' + item))

story += [P('6. Alur Bisnis Utama', 'H1x'), P('Checkout sampai enrollment', 'H2x')]
for item in ['User membaca course published melalui GET /courses.', 'User membuat POST /orders; total dihitung server-side.', 'User mengirim POST /orders/:id/payment-proof.', 'Admin menjalankan PATCH /orders/:id/verify untuk pending → paid.', 'Admin menjalankan POST /orders/:id/activate untuk membuat enrollment idempoten.', 'User membaca GET /enrollments/me.', 'User meminta signed video URL dan menyimpan progress lesson.']:
    story.append(P('• ' + item))
story += [P('Publikasi konten', 'H2x')]
for item in ['Admin membuat resource draft.', 'Admin mengubah data melalui PATCH.', 'Admin menjalankan endpoint publish.', 'Endpoint publik hanya membaca published.', 'Unpublish mengembalikan resource ke draft tanpa menghapus data.']:
    story.append(P('• ' + item))

story += [PageBreak(), P('7. Security Contract', 'H1x')]
for item in ['Ownership order, progress, enrollment, dan video diturunkan dari JWT subject untuk mencegah IDOR.', 'Response tidak memuat password hash, refresh token, object key privat, kredensial R2, atau stack trace.', 'Media privat memakai signed URL berdurasi terbatas.', 'Login dan register dibatasi 5 request per menit per IP.', 'Helmet security headers dan explicit CORS origin whitelist aktif.', 'Search memakai validasi query dan parameter binding.', 'Jangan memasukkan token, password, API key, atau credential ke Postman collection maupun PDF.']:
    story.append(P('• ' + item))

story += [P('8. Runbook QA Postman', 'H1x')]
for item in ['Set {{baseUrl}} ke http://localhost:3000/api atau environment target.', 'Import Xolvon-API.postman_collection.json.', 'Jalankan Health check.', 'Login user untuk enrollment/progress; login admin untuk CRUD dan moderation.', 'Simpan UUID hasil create ke collection variables.', 'Uji happy path order → payment proof → verify → activate → enrollment → video URL → progress.', 'Uji negative path: token kosong, role user ke route admin, UUID invalid, field ekstra, ID lintas user, draft pada endpoint public, dan repeated transition.', 'Jangan menguji cancel, revoke, delete, atau upload ke production tanpa fixture dan persetujuan.']:
    story.append(P('• ' + item))

story += [P('9. Referensi Source', 'H1x')]
for path in ['docs/api-contract.md', 'src/main.ts', 'src/auth/auth.controller.ts', 'src/orders/orders.controller.ts', 'src/courses/courses.controller.ts', 'src/projects/projects.controller.ts', 'src/marketplace/marketplace.controller.ts', 'Xolvon-API.postman_collection.json']:
    story.append(P('• ' + path))
story += [Spacer(1, 7*mm), P('Dokumen ini dibuat dari keadaan repository saat generate. Jika controller atau DTO berubah, regenerate PDF agar kontrak tetap sinkron.', 'Smallx')]

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
doc = SimpleDocTemplate(str(OUTPUT), pagesize=A4, rightMargin=15*mm, leftMargin=15*mm, topMargin=15*mm, bottomMargin=18*mm, title='Xolvon API Documentation', author='Xolvon Project')
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(f'WROTE {OUTPUT}')
print(f'ENDPOINTS {len(endpoints)}')
print(f'POSTMAN_REQUESTS {postman_count()}')
