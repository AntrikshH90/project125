# Resume Adjuster

Upload a PDF / DOCX / TXT resume once, paste any job description, get a tailored, ATS-clean PDF in under a minute. Your skills vault is persistent, so you build it once and re-tailor forever.

## What it does

- **Parses** PDF / DOCX / TXT resumes and extracts sections (Summary, Experience, Skills, Education, Projects, Certifications, Languages, …)
- **Extracts keywords** from the job description — phrases, must-haves, nice-to-haves
- **Scores ATS-friendliness** in real time: keyword match, skills coverage, format safety, section completeness
- **Suggests injections** from your Skills Vault into the resume for missing keywords
- **Renders** the tailored resume in a clean template (Classic / Modern / Compact / Minimal)
- **Exports** a real, parseable PDF (Helvetica + bullet points + page numbers — every ATS will read it)

## Quick start

```bash
cd resume-adjuster
npm install
npm start
# open http://localhost:4173
```

## Workflow

1. **Upload** — drop your resume. We extract text on the local server (or in-browser via PDF.js if you skip the server).
2. **Skills Vault** — add every skill you have, comma-separated. They're auto-categorized (tech / tool / soft / language / cert) and persisted in `localStorage`. Import / export as JSON.
3. **Job description** — paste the posting. Keywords, must-haves, and nice-to-haves are extracted automatically. Click "Load sample JD" to see how it works.
4. **Tailor** — review suggestions, click ✓ to inject from the vault or ⨯ to skip. The score updates live.
5. **Export** — pick a template (Classic / Modern / Compact / Minimal) and font size, then **Export PDF**.

## What "ATS 100%" means

The PDF exporter:
- Uses **Helvetica**, the safest resume font
- Renders **real text** (not images) — every keyword is selectable
- Uses **standard section names** (EXPERIENCE, EDUCATION, SKILLS, …)
- **Single column** body for the Classic and Compact templates
- No icons, no fancy headers, no two-column body that breaks on some parsers
- Plain bullet character (•)
- Contact info in plain text at the top

Format safety is one of the four ATS sub-scores shown in the UI.

## Privacy

- Resume parsing happens on your local server (`/api/parse`) or in-browser (PDF.js fallback)
- The Skills Vault lives in your browser's `localStorage` only
- No external services, no telemetry, no third-party requests beyond the two CDN-hosted JS libraries (PDF.js + jsPDF)

## Files

- `server.js` — Express + multer + pdf-parse + mammoth, serves static files
- `index.html` — 3-column UI: inputs / live preview / score+suggestions
- `css/styles.css` — dark theme, responsive (1280px / 880px breakpoints)
- `js/app.js` — all client logic: parse, score, suggest, inject, render, export
- `samples/antriksh-resume.txt` — sample resume for testing
- `samples/jd-sample.txt` — sample job description for testing
- `scripts/smoke-test.mjs` — headless pipeline test (parse → score → inject)
- `scripts/visual-verify.mjs` — Playwright headless visual test with screenshots
- `scripts/test-pdf-export.mjs` — full end-to-end test including PDF download

## Stack

Express, Multer, PDF-parse, Mammoth, PDF.js, jsPDF. No build step, no framework. Open `index.html` and it works (PDF parsing excepted, which needs the server).
