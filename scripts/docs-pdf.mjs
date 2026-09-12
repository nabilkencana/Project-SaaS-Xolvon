import { mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const docsDirectory = path.join(root, 'docs');
const outputDirectory = path.join(docsDirectory, 'pdf');

const markdownFiles = (await readdir(docsDirectory))
  .filter((file) => file.endsWith('.md'))
  .sort();

if (markdownFiles.length === 0) {
  throw new Error('No Markdown documents found in docs/');
}

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch();

try {
  for (const markdownFile of markdownFiles) {
    const markdown = await readFile(path.join(docsDirectory, markdownFile), 'utf8');
    const title = markdown.match(/^#\s+(.+)$/m)?.[1] ?? markdownFile;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial,sans-serif;line-height:1.5;margin:2cm;color:#17202a}pre{white-space:pre-wrap}h1{border-bottom:1px solid #ccd6dd;padding-bottom:.3em}</style></head><body><pre>${markdown.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</pre></body></html>`;
    const page = await browser.newPage();
    await page.setContent(html);
    await page.pdf({
      path: path.join(outputDirectory, `${markdownFile.replace(/\.md$/, '')}.pdf`),
      format: 'A4',
      printBackground: true,
    });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(`Generated ${markdownFiles.length} documentation PDF(s) in docs/pdf/`);
