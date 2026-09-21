// Smoke test the full pipeline: parse → split → JD extract → score → suggest
// Runs the same logic the browser would, headless.

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ----- Re-implement split (matches js/app.js ResumeParse.split) -----
function split(text) {
  const norm = text.replace(/\r/g, '').replace(/ /g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const lines = norm.split('\n');
  const HEADER_LINES = 6;
  const header = lines.slice(0, HEADER_LINES).join('\n').trim();
  const SEC = [
    { name: 'Summary', rx: /^\s*(summary|professional summary|profile|objective|about)\s*:?\s*$/i },
    { name: 'Skills', rx: /^\s*(skills|technical skills|core skills|key skills|technologies|tech stack)\s*:?\s*$/i },
    { name: 'Experience', rx: /^\s*(experience|work experience|professional experience|employment(\s+history)?|career)\s*:?\s*$/i },
    { name: 'Education', rx: /^\s*(education|academic background|qualifications)\s*:?\s*$/i },
    { name: 'Projects', rx: /^\s*(projects|selected projects|key projects|side projects)\s*:?\s*$/i },
    { name: 'Certifications', rx: /^\s*(certifications?|licenses?|accreditations?)\s*:?\s*$/i },
    { name: 'Awards', rx: /^\s*(awards|honors|achievements)\s*:?\s*$/i },
    { name: 'Languages', rx: /^\s*(languages?)\s*:?\s*$/i },
    { name: 'Interests', rx: /^\s*(interests|hobbies)\s*:?\s*$/i },
  ];
  const sections = [];
  let current = null;
  const buf = [];
  const flush = () => { if (current) { current.body = buf.join('\n').trim(); buf.length = 0; } };
  for (let i = HEADER_LINES; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) { buf.push(''); continue; }
    const m = SEC.find(s => s.rx.test(line));
    if (m) { flush(); current = { name: m.name, body: '' }; sections.push(current); }
    else if (current) buf.push(line);
    else {
      if (!sections.find(s => s.name === 'Summary')) { current = { name: 'Summary', body: '' }; sections.push(current); }
      buf.push(line);
    }
  }
  flush();
  return { header, sections };
}

function parseExperience(body) {
  const lines = body.split('\n');
  const items = [];
  let cur = null;
  const flush = () => { if (cur) { cur.bullets = cur.bullets.filter(b => b.trim()); items.push(cur); } };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flush(); cur = null; continue; }
    if (!cur) {
      const parts = line.split(/\s+[\-—|@]\s+|\s+at\s+/i);
      cur = parts.length >= 2
        ? { role: parts[0].trim(), company: parts.slice(1).join(' — ').trim(), meta: '', bullets: [] }
        : { role: line, company: '', meta: '', bullets: [] };
      continue;
    }
    if (/(\b20\d{2}\b|\b19\d{2}\b|present|current)/i.test(line) && !cur.meta) { cur.meta = line; continue; }
    cur.bullets.push(line.replace(/^[•\-\*▪◦]\s*/, ''));
  }
  flush();
  return items;
}

function jdParse(text) {
  const STOP = new Set(('a an the and or of to for in on with by from as is are be was were our we you your will can would should could may might must shall do does did has have had this that these those it its they them their there here also but not no yes so if then than into onto upon over under out off up down about above below between through across after before during while since until because while per via etc including required preferred strong plus bonus using use used able like such get got really very much more most less least few several many some any all each every other another same own having make made take taken give given new good great best well just only even still back now then around please see look want need know think say said go going gone come came want need make made work worked working way time year years month day people team teams company companies client clients customer customers user users role roles responsibility responsibilities requirement requirements qualification qualifications candidate candidates position applicant applicants person persons individual individuals member members plus opportunity skills skill experience knowledge ability capable strong good great excellent bonus').split(/\s+/));
  const lower = text.toLowerCase();
  const words = text.toLowerCase().match(/[a-z][a-z0-9+#.\-]{1,30}/g) || [];
  const freq = new Map();
  for (const w of words) {
    if (STOP.has(w) || w.length < 3 || /^\d+$/.test(w) || w.endsWith('.')) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  const significant = Array.from(freq.entries())
    .filter(([w, c]) => /[+#]/.test(w) || c >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20).map(e => e[0]);
  const PHRASES = ['machine learning','deep learning','react','next.js','node.js','typescript','javascript','python','postgresql','prisma','docker','aws','kubernetes','terraform','ci/cd','rest api','graphql','llm','rag','vector database','embeddings','transformers','pytorch','tensorflow','ci/cd','tdd','test driven development','pair programming','code review','mentor','mentoring','open source','public speaking','cross functional','stakeholders','design patterns','system design','a/b testing'];
  const phrases = new Set();
  for (const p of PHRASES) if (lower.includes(p)) phrases.add(p);
  return {
    keywords: Array.from(phrases).concat(significant.filter(w => !phrases.has(w) && !Array.from(phrases).some(p => p.includes(w)))),
  };
}

function score(resume, jd) {
  const resumeText = (resume.header + ' ' + resume.sections.map(s => s.name + ' ' + s.body).join(' ')).toLowerCase();
  const kw = jd.keywords;
  const hits = kw.filter(k => resumeText.includes(k.toLowerCase()));
  return { hits, total: kw.length, score: Math.round((hits.length / Math.max(1, kw.length)) * 100) };
}

// ----- Run -----
const resumeText = fs.readFileSync(path.join(ROOT, 'samples/antriksh-resume.txt'), 'utf8');
const jdText = fs.readFileSync(path.join(ROOT, 'samples/jd-sample.txt'), 'utf8');
const resume = split(resumeText);
const exp = resume.sections.find(s => s.name === 'Experience');
if (exp) exp.items = parseExperience(exp.body);

console.log('=== RESUME PARSE ===');
console.log('Header:', resume.header.split('\n')[0]);
console.log('Sections detected:', resume.sections.map(s => s.name).join(' | '));
const expCount = exp?.items?.length || 0;
const expBullets = exp?.items?.reduce((a, it) => a + it.bullets.length, 0) || 0;
console.log(`Experience: ${expCount} roles, ${expBullets} bullets`);
exp?.items?.forEach(it => console.log(`  - ${it.role} @ ${it.company} (${it.bullets.length} bullets)`));

const skills = resume.sections.find(s => s.name === 'Skills');
console.log(`Skills body: ${skills?.body?.length || 0} chars`);

console.log('\n=== JD PARSE ===');
const jd = jdParse(jdText);
console.log(`Keywords: ${jd.keywords.length}`);
console.log('Top:', jd.keywords.slice(0, 15).join(', '));

console.log('\n=== ATS SCORE ===');
const s = score(resume, jd);
console.log(`Score: ${s.score}% (${s.hits.length}/${s.total} matches)`);
console.log('Matched:', s.hits.join(', '));
console.log('Missing:', jd.keywords.filter(k => !s.hits.includes(k)).join(', '));

// Inject test: add missing keyword to skills, re-score
const missing = jd.keywords.filter(k => !s.hits.includes(k));
if (missing.length) {
  console.log(`\n=== INJECTION TEST ===`);
  console.log(`Would inject: ${missing.slice(0, 5).join(', ')}`);
  const newSkills = skills.body + '\n' + missing.slice(0, 5).join(', ');
  const injected = { ...resume, sections: resume.sections.map(sec => sec.name === 'Skills' ? { ...sec, body: newSkills } : sec) };
  const s2 = score(injected, jd);
  console.log(`After injection: ${s2.score}% (${s2.hits.length}/${s2.total} matches) — gained ${s2.hits.length - s.hits.length}`);
}
