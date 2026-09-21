// Render the app in headless Chromium, drive it through the full flow,
// and capture screenshots. This is the only reliable visual verification
// on this Windows host — browser_exec has been flaky.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

const sample = path.join(ROOT, 'samples', 'antriksh-resume.txt');
const jd = path.join(ROOT, 'samples', 'jd-sample.txt');

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGE ERR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ERR: ' + m.text()); });

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(OUT, '01-initial.png'), fullPage: false });
console.log('1. Initial load captured');

// Upload resume
const fileInput = page.locator('#file-input');
await fileInput.setInputFiles(sample);
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(OUT, '02-resume-loaded.png'), fullPage: false });
console.log('2. Resume loaded');

// Click "Load sample JD"
await page.click('#jd-sample');
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, '03-jd-loaded.png'), fullPage: false });
console.log('3. JD loaded');

// Add some vault skills (these are the missing ones the smoke test found)
const vaultInput = page.locator('#vault-input');
for (const s of ['Kubernetes', 'Terraform', 'CI/CD', 'LLM', 'RAG', 'vector database', 'embeddings', 'A/B testing']) {
  await vaultInput.fill(s);
  await page.click('#vault-add');
  await page.waitForTimeout(80);
}
await page.screenshot({ path: path.join(OUT, '04-vault-populated.png'), fullPage: false });
console.log('4. Vault populated');

// Inject all suggestions
await page.click('#inject-all');
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, '05-after-injection.png'), fullPage: true });
console.log('5. After injection');

// Read the score
const score = await page.locator('#score-num').textContent();
const summary = await page.locator('#score-summary').textContent();
console.log('SCORE:', score + '%');
console.log('SUMMARY:', summary);

// Switch template
await page.selectOption('#tpl-select', 'modern');
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, '06-modern-template.png'), fullPage: false });
console.log('6. Modern template');

await page.selectOption('#tpl-select', 'compact');
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, '07-compact-template.png'), fullPage: false });
console.log('7. Compact template');

console.log('---ERRORS---');
errs.forEach(e => console.log(e));
console.log('---END---');

await browser.close();
