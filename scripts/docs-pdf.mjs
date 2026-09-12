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

const style = `@page{size:A4;margin:18mm 15mm 17mm}body{font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.48;color:#17202a}h1{color:#17324d;font-size:23px;border-bottom:2px solid #247b8f;padding-bottom:7px;margin:0 0 18px}h2{color:#17324d;font-size:17px;margin:22px 0 8px;border-left:4px solid #247b8f;padding-left:9px}h3{color:#247b8f;font-size:13px;margin:16px 0 6px}h4{color:#496579;font-size:11px;margin:12px 0 4px}p{margin:0 0 8px}ul{margin:3px 0 10px 19px;padding:0}li{margin:3px 0}code{font-family:Menlo,Monaco,monospace;font-size:9px;background:#eef3f5;color:#17324d;padding:1px 3px;border-radius:3px}pre{font-family:Menlo,Monaco,monospace;font-size:8.5px;line-height:1.4;background:#f2f5f7;border:1px solid #d8e1e8;border-left:4px solid #247b8f;padding:9px;white-space:pre-wrap;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;margin:9px 0 14px;font-size:8.5px;page-break-inside:auto}thead{display:table-header-group}tr{page-break-inside:avoid}th{background:#17324d;color:white;text-align:left}td,th{border:1px solid #cbd7de;padding:5px;vertical-align:top}tbody tr:nth-child(even){background:#f7fafb}a{color:#247b8f;text-decoration:none}strong{color:#17324d}.doc-footer{position:fixed;bottom:-10mm;left:0;right:0;border-top:1px solid #d8e1e8;padding-top:4px;color:#687b89;font-size:8px}`;
const titleOf = (markdown, fallback) => markdown.match(/^#\s+(.+)$/m)?.[1] ?? fallback;
const wrap = (title, file, body) => `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${style}</style></head><body><div class="doc-footer">Xolvon Backend Documentation · ${escapeHtml(file)}</div>${body}</body></html>`;

await mkdir(outputDirectory, { recursive: true });
const sources = await Promise.all(markdownFiles.map(async (fileName) => ({ fileName, markdown: await readFile(path.join(docsDirectory, fileName), 'utf8') })));
const browser = await chromium.launch();
try {
  for (const source of sources) {
    const page = await browser.newPage();
    await page.setContent(wrap(titleOf(source.markdown, source.fileName), source.fileName, markdownToHtml(source.markdown)), { waitUntil: 'load' });
    await page.pdf({ path: path.join(outputDirectory, source.fileName.replace(/\.md$/, '.pdf')), format: 'A4', printBackground: true });
    await page.close();
  }
  const combined = sources.map((source) => `<section style="break-before:page;page-break-before:always">${markdownToHtml(source.markdown)}</section>`).join('');
  const page = await browser.newPage();
  await page.setContent(wrap('Xolvon Backend Full Documentation', combinedFileName, combined), { waitUntil: 'load' });
  await page.pdf({ path: path.join(outputDirectory, combinedFileName), format: 'A4', printBackground: true });
  await page.close();
} finally { await browser.close(); }
console.log(`Generated ${sources.length} individual documentation PDFs plus ${combinedFileName} in docs/pdf/`);
