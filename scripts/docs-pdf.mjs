import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const docsDirectory = path.join(root, 'docs');
const outputDirectory = path.join(docsDirectory, 'pdf');

// Official handover documents only, in canonical combined order (DL-019/DL-026).
const officialDocuments = [
  'README.md',
  'architecture.md',
  'security.md',
  'deployment-runbook.md',
];

const combinedFileName = 'xolvon-backend-full-documentation.pdf';

const escapeHtml = (value) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const pageStyle = `
  body { font-family: Arial, sans-serif; line-height: 1.5; margin: 2cm; color: #17202a; }
  pre { white-space: pre-wrap; }
  h1 { border-bottom: 1px solid #ccd6dd; padding-bottom: 0.3em; }
  section + section { break-before: page; page-break-before: always; }
`;

const wrapDocument = (title, sectionsHtml) => `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${pageStyle}</style></head><body>${sectionsHtml}</body></html>`;

const renderSection = (markdown) =>
  `<section><pre>${escapeHtml(markdown)}</pre></section>`;

const headingOf = (markdown, fallback) => markdown.match(/^#\s+(.+)$/m)?.[1] ?? fallback;

const sources = [];
for (const fileName of officialDocuments) {
  sources.push({
    fileName,
    markdown: await readFile(path.join(docsDirectory, fileName), 'utf8'),
  });
}

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch();

try {
  for (const { fileName, markdown } of sources) {
    const html = wrapDocument(headingOf(markdown, fileName), renderSection(markdown));
    const page = await browser.newPage();
    await page.setContent(html);
    await page.pdf({
      path: path.join(outputDirectory, `${fileName.replace(/\.md$/, '')}.pdf`),
      format: 'A4',
      printBackground: true,
    });
    await page.close();
  }

  // Combined PDF: README -> Architecture -> Security -> Deployment Runbook.
  const combinedHtml = wrapDocument(
    'Xolvon Backend — Full Documentation',
    sources.map(({ markdown }) => renderSection(markdown)).join(''),
  );
  const combinedPage = await browser.newPage();
  await combinedPage.setContent(combinedHtml);
  await combinedPage.pdf({
    path: path.join(outputDirectory, combinedFileName),
    format: 'A4',
    printBackground: true,
  });
  await combinedPage.close();
} finally {
  await browser.close();
}

console.log(
  `Generated ${sources.length} official documentation PDF(s) plus ${combinedFileName} in docs/pdf/`,
);
