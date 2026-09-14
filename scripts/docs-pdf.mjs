import { mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const docsDirectory = path.join(root, 'docs');
const outputDirectory = path.join(docsDirectory, 'pdf');
const combinedFileName = 'xolvon-backend-full-documentation.pdf';
const markdownFiles = (await readdir(docsDirectory)).filter((file) => file.endsWith('.md')).sort();

const escapeHtml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const inline = (value) => escapeHtml(value).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

function markdownToHtml(markdown) {
  const lines = markdown.replaceAll('\r', '').split('\n');
  const out = [];
  let code = false, codeLines = [], list = false, table = false, tableRows = 0;
  const closeList = () => { if (list) { out.push('</ul>'); list = false; } };
  const closeTable = () => { if (table) { out.push('</tbody></table>'); table = false; tableRows = 0; } };
  for (const line of lines) {
    if (line.startsWith('```')) {
      if (!code) { closeList(); closeTable(); code = true; codeLines = []; }
      else { out.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`); code = false; }
      continue;
    }
    if (code) { codeLines.push(line); continue; }
    if (!line.trim()) { closeList(); closeTable(); continue; }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) { closeList(); closeTable(); const level = heading[1].length; out.push(`<h${level}>${inline(heading[2])}</h${level}>`); continue; }
    if (/^\s*[-*]\s+/.test(line)) { closeTable(); if (!list) { out.push('<ul>'); list = true; } out.push(`<li>${inline(line.replace(/^\s*[-*]\s+/, ''))}</li>`); continue; }
    if (line.includes('|')) {
      const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
      if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
      closeList();
      if (!table) { out.push('<table><thead><tr>'); table = true; }
      const tag = tableRows === 0 ? 'th' : 'td';
      out.push(cells.map((cell) => `<${tag}>${inline(cell)}</${tag}>`).join(''));
      out.push('</tr>');
      if (tableRows === 0) out.push('</thead><tbody>');
      tableRows += 1;
      continue;
    }
    closeList(); closeTable(); out.push(`<p>${inline(line)}</p>`);
  }
  if (code) out.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  closeList(); closeTable();
  return out.join('\n');
}

/* ---- Individual per-document PDF (unchanged rendering) ---- */
const style = `@page{size:A4;margin:18mm 15mm 17mm}body{font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.48;color:#17202a}h1{color:#17324d;font-size:23px;border-bottom:2px solid #247b8f;padding-bottom:7px;margin:0 0 18px}h2{color:#17324d;font-size:17px;margin:22px 0 8px;border-left:4px solid #247b8f;padding-left:9px}h3{color:#247b8f;font-size:13px;margin:16px 0 6px}h4{color:#496579;font-size:11px;margin:12px 0 4px}p{margin:0 0 8px}ul{margin:3px 0 10px 19px;padding:0}li{margin:3px 0}code{font-family:Menlo,Monaco,monospace;font-size:9px;background:#eef3f5;color:#17324d;padding:1px 3px;border-radius:3px}pre{font-family:Menlo,Monaco,monospace;font-size:8.5px;line-height:1.4;background:#f2f5f7;border:1px solid #d8e1e8;border-left:4px solid #247b8f;padding:9px;white-space:pre-wrap;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;margin:9px 0 14px;font-size:8.5px;page-break-inside:auto}thead{display:table-header-group}tr{page-break-inside:avoid}th{background:#17324d;color:white;text-align:left}td,th{border:1px solid #cbd7de;padding:5px;vertical-align:top}tbody tr:nth-child(even){background:#f7fafb}a{color:#247b8f;text-decoration:none}strong{color:#17324d}.doc-footer{position:fixed;bottom:-10mm;left:0;right:0;border-top:1px solid #d8e1e8;padding-top:4px;color:#687b89;font-size:8px}`;
const titleOf = (markdown, fallback) => markdown.match(/^#\s+(.+)$/m)?.[1] ?? fallback;
const wrap = (title, file, body) => `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${style}</style></head><body><div class="doc-footer">Xolvon Backend Documentation · ${escapeHtml(file)}</div>${body}</body></html>`;

/* ---- Enhanced combined "Full Documentation" rendering ---- */
const combStyle = `
@page{size:A4;margin:20mm 16mm 18mm}
:root{color-scheme:light}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:Georgia,'Times New Roman',serif;font-size:10.5px;line-height:1.6;color:#1c2430;margin:0}
h1{color:#14243b;font-size:24px;line-height:1.25;border-bottom:3px solid #1f6f8b;padding-bottom:8px;margin:34px 0 14px;letter-spacing:-0.2px}
h2{color:#14243b;font-size:17px;margin:26px 0 9px;border-left:5px solid #1f6f8b;padding-left:10px}
h3{color:#1f6f8b;font-size:13.5px;margin:18px 0 6px}
h4{color:#3e5a70;font-size:11.5px;margin:13px 0 4px;text-transform:uppercase;letter-spacing:0.4px}
p{margin:0 0 9px}
ul{margin:4px 0 12px 20px;padding:0}li{margin:4px 0}
code{font-family:Menlo,Monaco,Consolas,monospace;font-size:9px;background:#eef3f5;color:#17505f;padding:1px 4px;border-radius:3px}
pre{font-family:Menlo,Monaco,Consolas,monospace;font-size:8.6px;line-height:1.45;background:#f4f6f8;border:1px solid #dbe4ea;border-left:4px solid #1f6f8b;padding:10px;white-space:pre-wrap;overflow-wrap:anywhere;border-radius:2px}
table{width:100%;border-collapse:collapse;margin:10px 0 16px;font-size:8.8px;page-break-inside:auto}
thead{display:table-header-group}tr{page-break-inside:avoid}
th{background:#14243b;color:#fff;text-align:left;font-weight:600}
td,th{border:1px solid #ccd7de;padding:6px;vertical-align:top}
tbody tr:nth-child(even){background:#f6f9fa}
a{color:#1f6f8b;text-decoration:none}strong{color:#14243b}
blockquote{margin:10px 0;padding:8px 14px;border-left:4px solid #2ec467;background:#f2fbf6;color:#2a5a44}

.cover{min-height:255mm;display:flex;flex-direction:column}
.cover-band{height:14mm;background:linear-gradient(90deg,#14243b,#1f6f8b 55%,#2ec467);border-radius:0 0 8px 8px;margin-bottom:26mm}
.cover-kicker{font-family:Arial,sans-serif;font-size:11px;letter-spacing:5px;color:#1f6f8b;font-weight:700;text-transform:uppercase}
.cover h1{font-size:42px;margin:8px 0 4px;border:none;letter-spacing:-1px}
.cover-sub{font-family:Arial,sans-serif;font-size:17px;color:#4a6276;font-style:italic}
.cover-badges{margin:26px 0 30px;display:flex;flex-wrap:wrap;gap:8px}
.cover-badges span{font-family:Arial,sans-serif;font-size:9px;background:#eaf2f6;color:#17505f;border:1px solid #bfd4dd;padding:5px 11px;border-radius:20px;letter-spacing:0.4px}
.cover-meta{margin-top:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:14px;border-top:2px solid #14243b;padding-top:16px}
.cover-meta>div span{font-family:Arial,sans-serif;font-size:9px;color:#687b89;text-transform:uppercase;letter-spacing:1px;display:block}
.cover-meta>div strong{font-family:Arial,sans-serif;font-size:16px;color:#14243b;display:block;margin-top:3px}

.toc-page{break-before:page;page-break-before:always}
.toc-page h1{border-bottom:3px solid #1f6f8b}
ul.toc{list-style:none;margin:16px 0 0;padding:0}
ul.toc>li{display:flex;align-items:baseline;gap:12px;padding:10px 4px;border-bottom:1px dashed #ccd7de}
ul.toc .toc-idx{font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#1f6f8b;min-width:22px}
ul.toc .toc-row{flex:1}
ul.toc a{font-size:13px;font-weight:600;color:#14243b}
ul.toc .toc-file{font-family:Menlo,monospace;font-size:8.4px;color:#8a99a6;display:block;margin-top:1px}
ul.toc ul.toc-sub{list-style:disc;margin:5px 0 0 18px;padding:0}
ul.toc ul.toc-sub li{font-size:9.6px;color:#3e5a70;margin:2px 0}

.chapter{break-before:page;page-break-before:always}
.chapter-head{border:1px solid #ccd7de;border-left:8px solid #1f6f8b;background:#f4f8fa;padding:11px 15px;margin-bottom:18px;border-radius:2px}
.chapter-kicker{font-family:Arial,sans-serif;font-size:10px;letter-spacing:4px;color:#17505f;font-weight:700;text-transform:uppercase}
.chapter-path{font-family:Menlo,monospace;font-size:9px;color:#687b89;margin-top:4px}
.chapter>h1:first-child{margin-top:0}
`;
const wrapComb = (title, body) => `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${combStyle}</style></head><body>${body}</body></html>`;

const buildCover = (count) => {
  const today = new Date().toISOString().slice(0, 10);
  return `<section class="cover"><div class="cover-band"></div>
  <div class="cover-kicker">XOLVON &middot; Backend Engineering</div>
  <h1>Backend Documentation</h1>
  <div class="cover-sub">Full Technical Reference &mdash; Platform</div>
  <div class="cover-badges"><span>NestJS 12</span><span>Cloudflare Workers</span><span>D1 &middot; SQLite</span><span>R2 Storage</span><span>Argon2id</span><span>JWT Stateless</span></div>
  <div class="cover-meta">
    <div><span>Modules</span><strong>${count} documents</strong></div>
    <div><span>Generated</span><strong>${today}</strong></div>
    <div><span>Edition</span><strong>Production Readiness</strong></div>
  </div></section>`;
};

const buildToc = (sources) => {
  const items = sources.map((s, i) => {
    const title = titleOf(s.markdown, s.fileName);
    const subs = (s.markdown.match(/^##\s+(.+)$/gm) || []).slice(0, 6).map((h) => h.replace(/^##\s+/, ''));
    const subList = subs.length
      ? `<ul class="toc-sub">${subs.map((x) => `<li>${inline(x)}</li>`).join('')}</ul>`
      : '';
    return `<li><span class="toc-idx">${String(i + 1).padStart(2, '0')}</span><div class="toc-row"><a href="#doc-${i}">${inline(title)}</a><span class="toc-file">${escapeHtml(s.fileName)}</span>${subList}</div></li>`;
  }).join('');
  return `<section class="toc-page"><h1>Daftar Isi</h1><ul class="toc">${items}</ul></section>`;
};

const buildChapter = (fileName, html, idx) =>
  `<section class="chapter" id="doc-${idx}"><div class="chapter-head"><div class="chapter-kicker">Chapter ${idx + 1}</div><div class="chapter-path">${escapeHtml(fileName)}</div></div>${html}</section>`;

const headerTemplate =
  '<div style="width:100%;font-size:8px;color:#687b89;padding:0 16mm;display:flex;justify-content:flex-end;font-family:Arial,Helvetica,sans-serif;letter-spacing:0.3px;border-bottom:1px solid #dbe4ea"><span>XOLVON &middot; BACKEND &middot; FULL DOCUMENTATION</span></div>';
const footerTemplate =
  '<div style="width:100%;font-size:8px;color:#687b89;padding:0 16mm;display:flex;justify-content:space-between;font-family:Arial,Helvetica,sans-serif;border-top:1px solid #dbe4ea;padding-top:4px"><span>Xolvon &mdash; Backend Documentation</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>';

await mkdir(outputDirectory, { recursive: true });
const sources = await Promise.all(markdownFiles.map(async (fileName) => ({ fileName, markdown: await readFile(path.join(docsDirectory, fileName), 'utf8') })));
const browser = await chromium.launch();
try {
  // Individual PDFs — unchanged rendering
  for (const source of sources) {
    const page = await browser.newPage();
    await page.setContent(wrap(titleOf(source.markdown, source.fileName), source.fileName, markdownToHtml(source.markdown)), { waitUntil: 'load' });
    await page.pdf({ path: path.join(outputDirectory, source.fileName.replace(/\.md$/, '.pdf')), format: 'A4', printBackground: true });
    await page.close();
  }
  // Combined "Full Documentation" — enhanced (cover + TOC + chapters + page numbers)
  const chapters = sources.map((s, i) => buildChapter(s.fileName, markdownToHtml(s.markdown), i)).join('');
  const page = await browser.newPage();
  await page.setContent(wrapComb('Xolvon Backend Full Documentation', buildCover(sources.length) + buildToc(sources) + chapters), { waitUntil: 'load' });
  await page.pdf({
    path: path.join(outputDirectory, combinedFileName),
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate,
    footerTemplate,
    margin: { top: '20mm', bottom: '18mm', left: '16mm', right: '16mm' },
  });
  await page.close();
} finally { await browser.close(); }
console.log(`Generated ${sources.length} individual documentation PDFs plus ${combinedFileName} in docs/pdf/`);
