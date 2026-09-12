#!/usr/bin/env python3
from pathlib import Path
import json
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    KeepTogether, Preformatted
)

ROOT = Path(__file__).resolve().parents[1]
COLLECTION = ROOT / 'Xolvon-API.postman_collection.json'
OUTPUT = ROOT / 'docs' / 'Xolvon-API-Documentation.pdf'

collection = json.loads(COLLECTION.read_text(encoding='utf-8'))
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='CoverTitle', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=25, leading=31, alignment=TA_CENTER, textColor=colors.HexColor('#17324D'), spaceAfter=10))
styles.add(ParagraphStyle(name='CoverSub', parent=styles['Normal'], fontSize=12, leading=18, alignment=TA_CENTER, textColor=colors.HexColor('#496579'), spaceAfter=6))
styles.add(ParagraphStyle(name='H1x', parent=styles['Heading1'], fontSize=17, leading=21, textColor=colors.HexColor('#17324D'), spaceBefore=12, spaceAfter=8))
styles.add(ParagraphStyle(name='H2x', parent=styles['Heading2'], fontSize=12, leading=15, textColor=colors.HexColor('#247B8F'), spaceBefore=8, spaceAfter=5))
styles.add(ParagraphStyle(name='Bodyx', parent=styles['BodyText'], fontSize=8.8, leading=13, spaceAfter=5))
styles.add(ParagraphStyle(name='Smallx', parent=styles['BodyText'], fontSize=7.3, leading=9.5, textColor=colors.HexColor('#425466')))
styles.add(ParagraphStyle(name='CodeX', parent=styles['Code'], fontName='Courier', fontSize=7.1, leading=9, backColor=colors.HexColor('#F2F5F7'), borderPadding=5, leftIndent=4, rightIndent=4, spaceBefore=3, spaceAfter=6))


def esc(value):
    return str(value).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def p(text, style='Bodyx'):
    return Paragraph(text, styles[style])


def walk(items, group=''):
    rows = []
    for item in items or []:
        if 'request' in item:
            req = item['request']
            url = req.get('url', '')
            if isinstance(url, dict):
                url = url.get('raw', '')
            rows.append((group, item.get('name', ''), req.get('method', ''), url))
        else:
            rows.extend(walk(item.get('item', []), item.get('name', group)))
    return rows

requests = walk(collection.get('item', []))
variables = [(v.get('key', ''), v.get('value', '')) for v in collection.get('variable', [])]


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor('#D8E1E8'))
    canvas.line(15*mm, 13*mm, 195*mm, 13*mm)
    canvas.setFont('Helvetica', 7)
    canvas.setFillColor(colors.HexColor('#687B89'))
    canvas.drawString(15*mm, 8*mm, 'Xolvon API Documentation')
    canvas.drawRightString(195*mm, 8*mm, f'Halaman {doc.page}')
    canvas.restoreState()

story = []
story += [Spacer(1, 35*mm), p('XOLVON API', 'CoverTitle'), p('Dokumentasi REST API dan Postman Collection', 'CoverSub'), Spacer(1, 8*mm)]
story += [p('Dokumen ini dibuat dari endpoint aktif di source code NestJS dan collection Postman proyek Xolvon. Tidak ada secret, password, API key, atau token yang disimpan di dokumen.', 'CoverSub'), Spacer(1, 35*mm)]
summary = [['Versi', 'V1'], ['Base URL lokal', '{{baseUrl}} = http://localhost:3000/api'], ['Format', 'JSON over HTTP'], ['Autentikasi', 'Bearer JWT'], ['Jumlah request Postman', str(len(requests))]]
t = Table([[p(esc(a), 'Smallx'), p(esc(b), 'Smallx')] for a,b in summary], colWidths=[45*mm, 120*mm])
t.setStyle(TableStyle([('BACKGROUND',(0,0),(0,-1),colors.HexColor('#EAF2F5')),('GRID',(0,0),(-1,-1),0.3,colors.HexColor('#CBD7DE')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
story += [t, PageBreak()]

story += [p('1. Ringkasan Arsitektur', 'H1x'), p('Backend menggunakan NestJS. Semua route memiliki global prefix <b>/api</b>. Validasi request memakai ValidationPipe dengan whitelist, forbidNonWhitelisted, dan transform. Respons error diproses oleh global exception filter tanpa stack trace internal.', 'Bodyx'), p('Konvensi umum:', 'H2x')]
for text in ['Gunakan header <b>Content-Type: application/json</b> untuk request dengan body JSON.', 'Endpoint terlindungi memakai <b>Authorization: Bearer {{accessToken}}</b>.', 'Role user adalah role default. Endpoint admin memerlukan JWT dengan role admin.', 'Pagination memakai <b>page</b> 1-based dan <b>limit</b> maksimal 100, default 20.', 'Field yang tidak ada di DTO ditolak oleh server.', 'Status order: pending, paid, cancelled. Status enrollment: active, revoked.']:
    story.append(p('• ' + text))

story += [p('2. Setup Postman', 'H1x'), p('Import file berikut ke Postman:', 'Bodyx'), p(str(COLLECTION), 'CodeX'), p('Set collection variables berikut. Jalankan Login user atau Login admin sebelum endpoint private.', 'Bodyx')]
var_rows = [[p('<b>Variable</b>','Smallx'), p('<b>Nilai awal</b>','Smallx')]] + [[p(esc(k),'Smallx'), p(esc(v) or '(kosong)', 'Smallx')] for k,v in variables]
t = Table(var_rows, colWidths=[48*mm, 117*mm], repeatRows=1)
t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#17324D')),('TEXTCOLOR',(0,0),(-1,0),colors.white),('GRID',(0,0),(-1,-1),0.25,colors.HexColor('#CBD7DE')),('VALIGN',(0,0),(-1,-1),'TOP'),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white, colors.HexColor('#F7FAFB')]),('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4)]))
story += [t, PageBreak()]

story += [p('3. Alur Autentikasi', 'H1x'), p('Urutan normal untuk pengujian:', 'Bodyx')]
for text in ['POST /auth/register untuk membuat user baru.', 'POST /auth/login. Test script collection menyimpan accessToken dan refreshToken otomatis.', 'Gunakan {{accessToken}} pada endpoint user atau admin.', 'Jika access token kedaluwarsa, POST /auth/refresh lalu token baru disimpan otomatis.', 'POST /auth/logout untuk mencabut refresh token.']:
    story.append(p('• ' + text))
story += [p('Contoh login:', 'H2x'), Preformatted('{\n  "email": "{{email}}",\n  "password": "{{password}}"\n}', styles['CodeX'])]

story += [p('4. Daftar Endpoint Lengkap', 'H1x'), p(f'Collection berisi {len(requests)} request yang dikelompokkan berdasarkan modul. Endpoint di bawah memakai base URL {{baseUrl}}.', 'Bodyx')]
current = None
for group, name, method, url in requests:
    if group != current:
        current = group
        story.append(p(esc(group), 'H2x'))
    row = [[p('<b>Method</b>','Smallx'), p('<b>Request</b>','Smallx'), p('<b>Path</b>','Smallx')], [p(esc(method),'Smallx'), p(esc(name),'Smallx'), p(esc(url),'Smallx')]]
    t = Table(row, colWidths=[20*mm, 55*mm, 90*mm])
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#247B8F')),('TEXTCOLOR',(0,0),(-1,0),colors.white),('GRID',(0,0),(-1,-1),0.25,colors.HexColor('#CBD7DE')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),4),('RIGHTPADDING',(0,0),(-1,-1),4),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4)]))
    story.append(t)

story += [PageBreak(), p('5. Contoh Payload Penting', 'H1x'), p('Register user', 'H2x'), Preformatted('{\n  "name": "Xolvon User",\n  "email": "user@example.com",\n  "phone": "+6281234567890",\n  "password": "Password123!"\n}', styles['CodeX']), p('Create course (admin)', 'H2x'), Preformatted('{\n  "title": "Course Contoh",\n  "slug": "course-contoh",\n  "description": "Deskripsi course.",\n  "price": 150000,\n  "thumbnailUrl": "https://example.com/thumb.webp"\n}', styles['CodeX']), p('Checkout order (user)', 'H2x'), Preformatted('{\n  "courseIds": ["00000000-0000-4000-8000-000000000000"],\n  "notes": "Pembayaran via transfer."\n}', styles['CodeX']), p('Update progress (user)', 'H2x'), Preformatted('{\n  "lessonId": "00000000-0000-4000-8000-000000000000",\n  "completed": true\n}', styles['CodeX']), p('Create media upload URL (admin)', 'H2x'), Preformatted('{\n  "prefix": "public/site",\n  "contentType": "image/webp",\n  "size": 102400,\n  "filename": "hero.webp"\n}', styles['CodeX'])]

story += [p('6. Keamanan dan Batasan', 'H1x')]
for text in ['Jangan masukkan JWT, password, API key, atau credential produksi ke collection yang dibagikan.', 'Jangan mengirim field role saat register. Registrasi publik tidak dapat membuat admin.', 'Object key media privat tidak boleh dipakai melalui endpoint public.', 'Order dihitung server-side. Client tidak boleh dipercaya untuk mengirim total harga.', 'Ownership order, enrollment, progress, dan video diverifikasi dari subject JWT untuk mencegah IDOR.', 'Rate limit register dan login adalah 5 request per menit per IP.', 'Gunakan HTTPS pada staging dan production.']:
    story.append(p('• ' + text))

story += [p('7. Referensi File', 'H1x')]
for path in ['docs/api-contract.md', 'src/main.ts', 'Xolvon-API.postman_collection.json', 'README.md']:
    story.append(p('• ' + path))
story += [Spacer(1, 8*mm), p('Dokumen ini adalah dokumentasi teknis untuk pengujian dan integrasi API. Response aktual dapat berbeda berdasarkan data database dan environment.', 'Smallx')]

story += [PageBreak(), p('8. Matriks Akses Endpoint', 'H1x'), p('Matriks berikut membantu tim frontend, QA, dan backend memahami batas akses setiap modul. Semua endpoint private menggunakan Bearer JWT. Endpoint bertanda admin membutuhkan JWT dengan role admin.', 'Bodyx')]
access_rows = [[p('<b>Modul</b>','Smallx'), p('<b>Public</b>','Smallx'), p('<b>User</b>','Smallx'), p('<b>Admin</b>','Smallx'), p('<b>Catatan</b>','Smallx')],
 [p('Health / Home / Search','Smallx'),p('GET','Smallx'),p('—','Smallx'),p('—','Smallx'),p('Published content only','Smallx')],
 [p('Auth','Smallx'),p('register, login, refresh, logout','Smallx'),p('me','Smallx'),p('admin check','Smallx'),p('Login menyimpan token otomatis','Smallx')],
 [p('Courses','Smallx'),p('list, detail, lessons','Smallx'),p('—','Smallx'),p('CRUD + publish','Smallx'),p('Draft tidak tampil public','Smallx')],
 [p('Projects','Smallx'),p('list, detail','Smallx'),p('—','Smallx'),p('CRUD + media + members','Smallx'),p('Media public/private dibatasi','Smallx')],
 [p('Collective','Smallx'),p('list, detail','Smallx'),p('—','Smallx'),p('CRUD + publish','Smallx'),p('Email/telepon tidak public','Smallx')],
 [p('Marketplace','Smallx'),p('list, detail','Smallx'),p('—','Smallx'),p('CRUD + media + publish','Smallx'),p('Showcase; bukan checkout internal','Smallx')],
 [p('Orders','Smallx'),p('—','Smallx'),p('checkout, proof','Smallx'),p('verify, activate, cancel','Smallx'),p('Ownership order wajib cocok JWT','Smallx')],
 [p('Learning','Smallx'),p('—','Smallx'),p('enrollment, progress, video URL','Smallx'),p('revoke, lesson CRUD','Smallx'),p('Enrollment aktif diperlukan','Smallx')],
 [p('Admin / Media','Smallx'),p('—','Smallx'),p('—','Smallx'),p('dashboard, users, orders, R2','Smallx'),p('Object key privat tidak public','Smallx')]]
t = Table(access_rows, colWidths=[30*mm, 35*mm, 35*mm, 42*mm, 43*mm], repeatRows=1)
t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#17324D')),('TEXTCOLOR',(0,0),(-1,0),colors.white),('GRID',(0,0),(-1,-1),0.25,colors.HexColor('#CBD7DE')),('VALIGN',(0,0),(-1,-1),'TOP'),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#F7FAFB')]),('LEFTPADDING',(0,0),(-1,-1),4),('RIGHTPADDING',(0,0),(-1,-1),4),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4)]))
story += [t, p('9. Kontrak Validasi Request', 'H1x'), p('Server menjalankan validasi DTO secara global. Request dengan field tambahan akan ditolak karena <b>forbidNonWhitelisted</b>. Gunakan tipe dan format berikut:', 'Bodyx')]
validation_rows = [[p('<b>Field / Area</b>','Smallx'),p('<b>Aturan</b>','Smallx'),p('<b>Dampak jika salah</b>','Smallx')],
 [p('UUID resource', 'Smallx'),p('UUID v4 untuk courseId, lessonId, orderId, dan ID relasi','Smallx'),p('400 Bad Request','Smallx')],
 [p('Slug', 'Smallx'),p('lowercase kebab-case, contoh: course-contoh','Smallx'),p('400 Bad Request','Smallx')],
 [p('Email', 'Smallx'),p('Format email valid; dinormalisasi lowercase','Smallx'),p('400 Bad Request','Smallx')],
 [p('Phone', 'Smallx'),p('8–20 karakter angka/spasi/simbol telepon','Smallx'),p('400 Bad Request','Smallx')],
 [p('Price', 'Smallx'),p('Integer 0–1.000.000.000; total order dihitung server','Smallx'),p('400 atau total ditolak','Smallx')],
 [p('Pagination', 'Smallx'),p('page 1-based; limit default 20, maksimum 100','Smallx'),p('400 Bad Request','Smallx')],
 [p('Media', 'Smallx'),p('Content type dan prefix harus dari allowlist; size 1–524.288.000 byte','Smallx'),p('400 Bad Request','Smallx')],
 [p('External URL', 'Smallx'),p('Marketplace memakai URL HTTPS valid','Smallx'),p('400 Bad Request','Smallx')]]
t = Table(validation_rows, colWidths=[35*mm, 92*mm, 58*mm], repeatRows=1)
t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#247B8F')),('TEXTCOLOR',(0,0),(-1,0),colors.white),('GRID',(0,0),(-1,-1),0.25,colors.HexColor('#CBD7DE')),('VALIGN',(0,0),(-1,-1),'TOP'),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#F7FAFB')]),('LEFTPADDING',(0,0),(-1,-1),4),('RIGHTPADDING',(0,0),(-1,-1),4),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4)]))
story += [t, p('10. Alur Bisnis End-to-End', 'H1x'), p('A. Pembelian course', 'H2x')]
for text in ['User login dan memperoleh access token.', 'User melihat GET /courses dan memilih course published.', 'User membuat POST /orders. Backend menghitung total berdasarkan database.', 'User mengirim object key bukti pembayaran melalui POST /orders/:id/payment-proof.', 'Admin memeriksa GET /admin/orders atau GET /admin/overview.', 'Admin menjalankan PATCH /orders/:id/verify untuk mengubah pending menjadi paid.', 'Admin menjalankan POST /orders/:id/activate untuk membuat enrollment aktif secara idempoten.', 'User memeriksa GET /enrollments/me, mengambil video URL, lalu menyimpan progress.']:
    story.append(p('• ' + text))
story += [p('B. Publikasi konten', 'H2x')]
for text in ['Admin membuat entitas dengan status draft.', 'Admin melengkapi field wajib dan relasi media bila dibutuhkan.', 'Admin menjalankan endpoint publish khusus.', 'Frontend public membaca hanya endpoint published.', 'Unpublish mengembalikan entitas ke draft tanpa menghapus data.']:
    story.append(p('• ' + text))
story += [p('11. Standar Respons dan Error', 'H1x'), p('Gunakan status HTTP sebagai sinyal utama. Body error diproses oleh AllExceptionsFilter dan tidak boleh dianggap sebagai sumber stack trace internal.', 'Bodyx')]
error_rows = [[p('<b>Status</b>','Smallx'),p('<b>Makna</b>','Smallx'),p('<b>Tindakan</b>','Smallx')], [p('200','Smallx'),p('Request berhasil','Smallx'),p('Baca response JSON','Smallx')], [p('201','Smallx'),p('Resource berhasil dibuat','Smallx'),p('Simpan ID hasil response','Smallx')], [p('400','Smallx'),p('DTO atau state transition tidak valid','Smallx'),p('Periksa body, UUID, slug, dan field ekstra','Smallx')], [p('401','Smallx'),p('Token tidak ada atau tidak valid','Smallx'),p('Login ulang atau refresh token','Smallx')], [p('403','Smallx'),p('Role tidak cukup','Smallx'),p('Gunakan akun admin untuk route admin','Smallx')], [p('404','Smallx'),p('Resource tidak ditemukan atau tidak terlihat','Smallx'),p('Periksa ID/slug dan status published','Smallx')], [p('409','Smallx'),p('Konflik state atau slug unik','Smallx'),p('Jangan retry tanpa memperbaiki state','Smallx')], [p('429','Smallx'),p('Rate limit','Smallx'),p('Tunggu window reset; jangan spam retry','Smallx')], [p('500','Smallx'),p('Kesalahan server','Smallx'),p('Simpan request ID jika ada dan cek log server','Smallx')]]
t = Table(error_rows, colWidths=[22*mm, 72*mm, 91*mm], repeatRows=1)
t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#17324D')),('TEXTCOLOR',(0,0),(-1,0),colors.white),('GRID',(0,0),(-1,-1),0.25,colors.HexColor('#CBD7DE')),('VALIGN',(0,0),(-1,-1),'TOP'),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#F7FAFB')]),('LEFTPADDING',(0,0),(-1,-1),4),('RIGHTPADDING',(0,0),(-1,-1),4),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4)]))
story += [t, PageBreak(), p('12. Runbook QA Postman', 'H1x')]
for text in ['Import collection dan pilih environment/local variables.', 'Jalankan Health check. Pastikan server hidup sebelum testing bisnis.', 'Register user hanya sekali per email. Jika sudah ada, langsung login.', 'Login admin untuk menguji route admin. Jangan memakai token user pada route admin.', 'Buat course/project/marketplace dalam status draft, lalu uji publish dan unpublish.', 'Simpan ID dari response ke collection variables secara manual bila test script belum disediakan.', 'Uji negative cases: body field ekstra, UUID invalid, slug uppercase, token kosong, role user ke admin route, dan object ID lintas user.', 'Untuk setiap mutation, verifikasi response dan ulangi GET public/private yang relevan.', 'Jangan menjalankan cancel, revoke, delete, atau unpublish terhadap data produksi tanpa fixture dan persetujuan.']:
    story.append(p('• ' + text))
story += [p('13. Checklist Release', 'H1x')]
for text in ['CORS hanya mengizinkan origin environment terkait.', 'JWT_SECRET memenuhi panjang minimum dan tidak masuk repository.', 'Storage credentials hanya berada di environment server.', 'Seed admin dijalankan terkontrol, bukan pada proses aplikasi normal.', 'Rate limit login/register aktif.', 'Security headers aktif melalui Helmet.', 'Migration/database sudah siap pada environment target.', 'Postman collection menggunakan placeholder, bukan credential nyata.', 'Smoke test health, auth, public catalog, checkout, admin verification, dan enrollment lulus.']:
    story.append(p('□ ' + text))

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
doc = SimpleDocTemplate(str(OUTPUT), pagesize=A4, rightMargin=15*mm, leftMargin=15*mm, topMargin=15*mm, bottomMargin=18*mm, title='Xolvon API Documentation', author='Xolvon Project')
doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print(f'WROTE {OUTPUT}')
print(f'REQUESTS {len(requests)}')
