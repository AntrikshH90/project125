// Final end-to-end: load app, drive flow, click Export PDF,
// intercept the download, verify the file is a valid PDF.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'exports');
fs.mkdirSync(OUT, { recursive: true });

const sample = path.join(ROOT, 'samples', 'antriksh-resume.txt');
const jd = path.join(ROOT, 'samples', 'jd-sample.txt');

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1500, height: 950 },
  deviceScaleFactor: 2,
  acceptDownloads: true
});
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGE: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await page.locator('#file-input').setInputFiles(sample);
await page.waitForTimeout(500);
await page.click('#jd-sample');
await page.waitForTimeout(300);

// Add missing skills to vault
for (const s of ['Kubernetes', 'Terraform', 'CI/CD', 'LLM', 'RAG', 'vector database', 'embeddings', 'A/B testing']) {
  await page.locator('#vault-input').fill(s);
  await page.click('#vault-add');
  await page.waitForTimeout(50);
}
await page.click('#inject-all');
await page.waitForTimeout(500);

// Use compact template so the resume fits on one page
await page.selectOption('#tpl-select', 'compact');
await page.waitForTimeout(300);

// Click export and capture the download
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.click('#btn-export')
]);
const dest = path.join(OUT, download.suggestedFilename());
await download.saveAs(dest);
const size = fs.statSync(dest).size;
const head = fs.readFileSync(dest).slice(0, 8).toString('latin1');
const isPdf = head.startsWith('%PDF-');
console.log('PDF saved:', dest);
console.log('Size:', size, 'bytes');
console.log('Magic:', JSON.stringify(head));
console.log('Is valid PDF:', isPdf);
console.log('---JS errors---');
errs.forEach(e => console.log(e));
console.log('---');

await browser.close();
process.exit(isPdf && size > 1000 ? 0 : 1);
