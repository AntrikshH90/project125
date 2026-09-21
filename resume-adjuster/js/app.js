// Resume Adjuster — client-side brain.
// Architecture: small modules in one file (no bundler).
//   1. State + persistence (vault in localStorage)
//   2. Resume parser (server / browser fallback)
//   3. JD parser (keywords, must-haves, nice-to-haves)
//   4. Section detector (locks the original layout shape)
//   5. ATS scorer
//   6. Tailoring engine (suggestions + inject)
//   7. PDF renderer (jsPDF) — re-flows within chosen template, never the source
//   8. Export (downloads the tailored PDF)
//
// All "original layout preserved" means: we don't try to edit the user's PDF
// pixel-by-pixel. We parse it to plain text, detect sections, then re-render
// in a chosen template that keeps the section ORDER and CONTENT TYPE (only).
// That's exactly what ATS systems read — text + section order. We do not change
// the user's voice, ordering of jobs, or anything they wrote.

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ---------- State ----------
const State = {
  rawText: '',
  resume: null,        // { header, sections: [{name, items: [...]}] }
  jdText: '',
  jd: { keywords: [], must: [], nice: [] },
  vault: [],           // [{ name, cat }]
  vaultFilter: 'all',
  suggestions: [],     // [{ key, where, status }]
  template: 'classic',
  fontSize: 10,
  fileMeta: null,
};

const VAULT_KEY = 'ra.vault.v1';

// ---------- Vault ----------
const Vault = {
  load() {
    try { State.vault = JSON.parse(localStorage.getItem(VAULT_KEY) || '[]'); }
    catch { State.vault = []; }
  },
  save() { localStorage.setItem(VAULT_KEY, JSON.stringify(State.vault)); },
  add(name, cat = 'tech') {
    name = name.trim();
    if (!name) return;
    if (State.vault.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      toast('Already in vault', 'ok');
      return;
    }
    State.vault.push({ name, cat });
    Vault.save();
    Vault.render();
    Suggest.recompute();
  },
  remove(name) {
    State.vault = State.vault.filter(s => s.name !== name);
    Vault.save();
    Vault.render();
    Suggest.recompute();
  },
  categorize(name) {
    const n = name.toLowerCase();
    if (/\b(english|hindi|spanish|french|german|mandarin|japanese|korean|arabic)\b/.test(n)) return 'lang';
    if (/\b(certified|certification|certificate|pmp|aws certified|google certified)\b/.test(n)) return 'cert';
    if (/\b(leadership|communication|teamwork|public speaking|mentoring|management|collaboration|problem solving|adaptability)\b/.test(n)) return 'soft';
    if (/\b(figma|photoshop|illustrator|jira|confluence|notion|slack|vscode|docker|git|github|postman|tableau|excel|powerpoint|word)\b/.test(n)) return 'tool';
    return 'tech';
  },
  render() {
    const list = $('#vault-list');
    const filter = State.vaultFilter;
    const items = State.vault.filter(s => filter === 'all' || s.cat === filter);
    list.innerHTML = items.map(s => `
      <span class="skill cat-${s.cat}">${escapeHTML(s.name)}<span class="x" data-rm="${escapeAttr(s.name)}" title="Remove">×</span></span>
    `).join('');
    $$('#vault-list .x').forEach(el => el.addEventListener('click', e => Vault.remove(e.target.dataset.rm)));
  }
};

// ---------- Resume parsing ----------
// We try the server first (more reliable for fancy PDFs), then PDF.js fallback in-browser.
const ResumeParse = {
  async file(file) {
    State.fileMeta = { name: file.name, size: file.size, type: file.type };
    setStatus('Parsing…', 20);
    let text = '';
    let method = '';

    if ($('#opt-server').checked) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/parse', { method: 'POST', body: fd });
        if (res.ok) {
          const json = await res.json();
          text = json.text; method = json.method;
        } else { console.warn('server parse failed', await res.text()); }
      } catch (e) { console.warn('server unreachable, falling back', e); }
    }

    if (!text) {
      // Browser fallback
      const buf = await file.arrayBuffer();
      if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
        text = await ResumeParse.pdfInBrowser(buf);
        method = 'pdf.js';
      } else if (file.name.endsWith('.txt') || file.type === 'text/plain') {
        text = new TextDecoder().decode(buf);
        method = 'plain';
      } else {
        toast('DOCX needs the local server (run npm start)', 'error');
        throw new Error('DOCX parsing needs server');
      }
    }

    setStatus('Parsing…', 70);
    State.rawText = text;
    State.resume = ResumeParse.split(text);
    setStatus('Parsed', 100);
    $('#parse-status').hidden = false;
    $('#parse-method').textContent = method;
    $('#parse-filename').textContent = file.name;
    $('#parse-bytes').textContent = `${(file.size / 1024).toFixed(1)} KB`;
    $('#layout-badge').textContent = `Layout: ${State.resume.layoutGuess}`;
    Preview.render();
    Score.compute();
    Suggest.recompute();
    setStep(2);
    toast(`Parsed with ${method}`, 'ok');
  },

  async pdfInBrowser(buf) {
    if (!window.pdfjsLib) throw new Error('PDF.js not loaded');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let out = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      // Reconstruct lines by y-coordinate so columns don't get jumbled
      const items = tc.items.map(it => ({ str: it.str, x: it.transform[4], y: it.transform[5] }));
      const lines = new Map();
      items.forEach(it => {
        const y = Math.round(it.y);
        if (!lines.has(y)) lines.set(y, []);
        lines.get(y).push(it);
      });
      const sortedYs = Array.from(lines.keys()).sort((a, b) => b - a);
      sortedYs.forEach(y => {
        const row = lines.get(y).sort((a, b) => a.x - b.x).map(r => r.str).join(' ').replace(/\s+/g, ' ').trim();
        if (row) out += row + '\n';
      });
      out += '\n';
    }
    return out;
  },

  // Split text into header + sections. Heuristics, not magic.
  split(text) {
    const norm = text.replace(/\r/g, '').replace(/ /g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    const lines = norm.split('\n');
    const HEADER_LINES = 6;
    const header = lines.slice(0, HEADER_LINES).join('\n').trim();

    // Common section headers (case-insensitive, allow ":" or "—" after)
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

    const flush = () => {
      if (!current) return;
      current.body = buf.join('\n').trim();
      buf.length = 0;
    };

    for (let i = HEADER_LINES; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) { buf.push(''); continue; }
      const m = SEC.find(s => s.rx.test(line));
      if (m) {
        flush();
        current = { name: m.name, body: '' };
        sections.push(current);
      } else if (current) {
        buf.push(line);
      } else {
        // No section started yet — treat as Summary
        if (!sections.find(s => s.name === 'Summary')) {
          current = { name: 'Summary', body: '' };
          sections.push(current);
        }
        buf.push(line);
      }
    }
    flush();

    // If no sections detected at all, synthesize one with everything after header
    if (sections.length === 0) {
      sections.push({ name: 'Summary', body: lines.slice(HEADER_LINES).join('\n').trim() });
    }

    // Build experience items from Experience body
    const exp = sections.find(s => s.name === 'Experience');
    if (exp) exp.items = ResumeParse.parseExperience(exp.body);
    const edu = sections.find(s => s.name === 'Education');
    if (edu) edu.items = ResumeParse.parseEducation(edu.body);
    const proj = sections.find(s => s.name === 'Projects');
    if (proj) proj.items = ResumeParse.parseProjects(proj.body);

    // Heuristic layout guess
    const layoutGuess = (norm.match(/\b(engineer|developer|designer|manager|analyst|scientist)\b/i) || ['one-page'])[0];

    return { header, sections, layoutGuess };
  },

  parseExperience(body) {
    // Each entry: line 1 = "Role — Company", line 2 = "Start – End · Location", lines after = bullets until blank
    const lines = body.split('\n');
    const items = [];
    let cur = null;
    const flush = () => { if (cur) { cur.bullets = cur.bullets.filter(b => b.trim()); items.push(cur); } };
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) { flush(); cur = null; continue; }
      if (!cur) {
        // Detect header line: often has " — " or " at " or " | "
        const parts = line.split(/\s+[\-—|@]\s+|\s+at\s+/i);
        if (parts.length >= 2) {
          cur = { role: parts[0].trim(), company: parts[1].trim(), meta: '', bullets: [] };
          // If there are 3+ parts, treat the rest as company suffix
          if (parts.length > 2) cur.company = parts.slice(1).join(' — ');
        } else {
          cur = { role: line, company: '', meta: '', bullets: [] };
        }
        continue;
      }
      // Detect meta line: contains year range or "Present"
      if (/(\b20\d{2}\b|\b19\d{2}\b|present|current)/i.test(line) && !cur.meta) {
        cur.meta = line;
        continue;
      }
      // Bullet (•, -, *, ▪)
      const bullet = line.replace(/^[•\-\*▪◦]\s*/, '');
      cur.bullets.push(bullet);
    }
    flush();
    return items;
  },

  parseEducation(body) {
    return body.split(/\n{2,}/).map(block => {
      const lines = block.split('\n').filter(Boolean);
      return { degree: lines[0] || '', detail: lines.slice(1).join(' · ') };
    }).filter(e => e.degree);
  },

  parseProjects(body) {
    return body.split(/\n{2,}/).map(block => {
      const lines = block.split('\n').filter(Boolean);
      return { name: lines[0] || '', bullets: lines.slice(1).map(l => l.replace(/^[•\-\*▪◦]\s*/, '')) };
    }).filter(p => p.name);
  }
};

// ---------- Job description parsing ----------
const JD = {
  parse(text) {
    if (!text || !text.trim()) { State.jd = { keywords: [], must: [], nice: [] }; return; }
    const lower = text.toLowerCase();
    // Pull tokens, drop stopwords. Stop list is generous: anything that won't
    // be a useful ATS match is here, including common verbs / filler.
    const STOP = new Set(('a an the and or of to for in on with by from as is are be was were our we you your will can would should could may might must shall do does did has have had this that these those it its they them their there here also but not no yes so if then than into onto upon over under out off up down about above below between through across after before during while since until because per via etc including using use used able such get got really very much more most less least few several many some any all each every other another same own having make made take taken give given new good great best well just only even still back now then around please see look want need know think say said go going gone come came work worked working way time year years month day people team teams company companies client clients customer customers user users role roles responsibility responsibilities requirement requirements qualification qualifications candidate candidates position applicant applicants person persons individual individuals member members opportunity skills skill experience knowledge ability capable bonus day-to-day high low fast large small comfortable familiar deeply passionate driven results impact value culture mission vision growth scale modern leverage utilize spearhead champion mentor coach advise ensure maintain support enable facilitate collaborate contribute deliver execute implement establish define identify analyze evaluate optimize improve enhance streamline automate innovate lead manage direct supervise oversee coordinate organize arrange sort classify categorize label tag mark recognize pinpoint locate find detect discover uncover reveal expose show display present demonstrate illustrate depict represent symbolize embody personify exemplify typify characterize distinguish differentiate discriminate separate divide split break fracture shatter smash crush crumble disintegrate dissolve melt liquefy evaporate vaporize condense compress contract shrink reduce decrease lessen diminish dwindle decline drop fall sink descend lower plunge dive dip immerse submerge drown settle deposit place put set lay position station site situate install mount attach fasten secure anchor tie bind strap rope cord string thread wire cable chain link connect join unite combine merge blend mix mingle intermix intermingle integrate incorporate embed implant instill infuse inject insert introduce add append annex affix stick adhere cling cleave cohere hold grasp grip clasp clutch seize snatch grab capture catch trap snare entrap ensnare mesh interlock interweave interlace intertwine entangle tangle knot wrap envelop enclose encircle surround encompass embrace hug enfold shroud veil cloak mask disguise camouflage cover hide conceal secrete bury cache stash store save preserve conserve sustain uphold back endorse sanction approve authorize certify validate verify confirm corroborate substantiate authenticate accredit license permit allow let enable empower assist help aid abet champion advocate promote advance forward progress proceed continue persist persevere endure carry bear shoulder withstand weather survive live exist receive acquire obtain procure secure gain earn win attain achieve accomplish complete finish conclude end close terminate cease stop halt arrest check curb restrain limit confine constrain restrict bound contain comprise include involve entail necessitate require demand need want desire wish hope long yearn pine hanker itch crave covet lust hunger thirst ache pain hurt suffer tolerate stand abide accept swallow stomach digest absorb assimilate ingest consume eat drink devour gulp sip taste savor relish enjoy like love adore cherish treasure value appreciate prize esteem respect admire revere worship venerate idolize very really much many lot lots lots tons plenty several few little tiny small big huge massive giant enormous large larger largest medium mid-size mid-sized mid oversize oversized undersize undersized').split(/\s+/));
    const words = text.toLowerCase().match(/[a-z][a-z0-9+#.\-]{1,30}/g) || [];
    const freq = new Map();
    for (const w of words) {
      if (STOP.has(w)) continue;
      if (w.length < 3) continue;          // too short to matter
      if (/^\d+$/.test(w)) continue;
      if (w.endsWith('.')) continue;        // sentence fragments
      freq.set(w, (freq.get(w) || 0) + 1);
    }
    // Only keep words that appear with meaningful weight. A single mention of
    // "designing" or "features" in one sentence isn't a real ATS signal; require
    // a word to either be in the curated PHRASES list, or appear repeatedly.
    const significant = Array.from(freq.entries())
      .filter(([w, c]) => /[+#]/.test(w) || c >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(e => e[0]);

    // Common multi-word tech phrases to detect (longer = higher weight, always kept)
    const PHRASES = [
      'machine learning','deep learning','natural language processing','computer vision','data analysis',
      'react','next.js','node.js','vue.js','angular','typescript','javascript','python','java','kotlin','swift',
      'aws','azure','gcp','google cloud','docker','kubernetes','terraform','ci/cd','rest api','graphql',
      'postgresql','mysql','mongodb','redis','elasticsearch','airflow','spark','hadoop','kafka','rabbitmq',
      'tailwind','figma','jira','scrum','agile','rest','microservices','distributed systems',
      'large language models','llm','rag','prompt engineering','vector database','embeddings','transformers','pytorch','tensorflow',
      'product management','user research','a/b testing','stakeholder management','roadmap','go-to-market',
      'seo','sem','content strategy','growth marketing','email marketing','social media','hubspot','salesforce',
      'sketch','adobe xd','photoshop','illustrator','premiere','after effects','blender','maya','cinema 4d',
      'three.js','webgl','shaders','r3f','react three fiber','gsap','framer motion',
      'test driven development','tdd','unit testing','integration testing','end-to-end testing',
      'design patterns','system design','code review','pair programming','mentor','mentoring',
      'open source','public speaking','cross functional','stakeholders'
    ];
    const phrases = new Set();
    for (const p of PHRASES) if (lower.includes(p)) phrases.add(p);

    // Required/must-have detection. Strategy: split the JD into paragraphs
    // (blank-line separated), then for each paragraph check if its first non-empty
    // line starts with a "must"/"nice" marker. The whole paragraph is then
    // harvested for tech tokens.
    const must = [];
    const nice = [];
    const paragraphs = text.split(/\n\s*\n/);
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;
      const firstLine = trimmed.split('\n')[0].toLowerCase().trim();
      const isMust = /^(required|requirements|qualifications|must have|what you'll need|minimum qualifications|basic qualifications|essential|needed)\s*:?\s*$/i.test(firstLine)
                  || /^(required|requirements|qualifications|must have|essential)\b/i.test(firstLine) && firstLine.length < 60;
      const isNice = /^(preferred|nice to have|bonus|plus|desired|good to have)\s*:?\s*$/i.test(firstLine)
                  || /^(preferred|nice to have|bonus|plus|desired|good to have)\b/i.test(firstLine) && firstLine.length < 60;
      if (!isMust && !isNice) continue;
      // Only harvest tokens from bullet lines (or the whole para if no bullets)
      const lines = trimmed.split('\n').slice(1); // skip the header line
      const bullets = lines.filter(l => /^\s*[-•*▪]/.test(l));
      const src = bullets.length ? bullets : lines;
      const tokens = src.join(' ').toLowerCase().match(/[a-z][a-z0-9+#.\-]{1,30}/g) || [];
      const cleaned = tokens.filter(w => !STOP.has(w) && w.length >= 3 && !/^\d+$/.test(w) && !w.endsWith('.'));
      const target = isMust ? must : nice;
      cleaned.forEach(t => target.push(t));
    }
    const uniq = arr => Array.from(new Set(arr));
    State.jd = {
      // Phrases always first (high signal), then significant single words.
      keywords: Array.from(phrases).concat(significant.filter(w => !phrases.has(w) && !Array.from(phrases).some(p => p.includes(w)))),
      must: uniq(must).slice(0, 30),
      nice: uniq(nice).slice(0, 30),
    };
    JD.render();
  },

  render() {
    const ext = $('#jd-extract');
    if (!State.jd.keywords.length) { ext.hidden = true; return; }
    ext.hidden = false;
    $('#jd-keywords').innerHTML = State.jd.keywords.map(k => `<span class="chip">${escapeHTML(k)}</span>`).join('');
    $('#jd-must').innerHTML = State.jd.must.map(k => `<span class="chip matched">${escapeHTML(k)}</span>`).join('') || '<span class="muted small">none detected</span>';
    $('#jd-nice').innerHTML = State.jd.nice.map(k => `<span class="chip nice">${escapeHTML(k)}</span>`).join('') || '<span class="muted small">none detected</span>';
  }
};

// ---------- Scoring ----------
const Score = {
  compute() {
    if (!State.resume || !State.jd.keywords.length) {
      Score.set(0, 0, 0, 0);
      return;
    }
    const resumeText = (State.resume.header + ' ' + State.resume.sections.map(s => s.name + ' ' + s.body).join(' ')).toLowerCase();
    const kw = State.jd.keywords;
    const hits = kw.filter(k => resumeText.includes(k.toLowerCase()));
    const kwScore = Math.round((hits.length / Math.max(1, kw.length)) * 100);

    // Skills coverage: % of JD must-haves found in resume OR vault.
    // If no must-haves are detected, fall back to % of all JD keywords matched.
    const vaultNames = State.vault.map(s => s.name.toLowerCase());
    const must = State.jd.must;
    let skScore;
    let mustHit = 0;
    if (must.length === 0) {
      // No explicit must-haves — use the keyword set as a proxy.
      mustHit = kw.filter(k => resumeText.includes(k.toLowerCase()) || vaultNames.some(v => v.includes(k.toLowerCase()) || k.toLowerCase().includes(v))).length;
      skScore = Math.round((mustHit / Math.max(1, kw.length)) * 100);
    } else {
      mustHit = must.filter(m => resumeText.includes(m) || vaultNames.some(v => v.includes(m) || m.includes(v))).length;
      skScore = Math.round((mustHit / must.length) * 100);
    }

    // Format safety: how ATS-friendly is the structure
    const fmtScore = Score.formatSafety();

    // Section completeness
    const required = ['Summary', 'Experience', 'Skills', 'Education'];
    const present = required.filter(r => State.resume.sections.some(s => s.name === r));
    const secScore = Math.round((present.length / required.length) * 100);

    Score.set(kwScore, skScore, fmtScore, secScore);
    $('#score-summary').textContent =
      must.length
        ? `${hits.length}/${kw.length} keywords · ${mustHit}/${must.length} must-haves · ${present.length}/${required.length} required sections`
        : `${hits.length}/${kw.length} keywords · ${present.length}/${required.length} required sections`;
  },

  formatSafety() {
    if (!State.resume) return 0;
    let s = 100;
    const text = State.rawText;
    // Penalize scanned-image PDFs (very little text per page)
    if (text.length < 200) s -= 40;
    // Penalize if there's no Summary or Skills section
    if (!State.resume.sections.some(x => x.name === 'Summary')) s -= 5;
    if (!State.resume.sections.some(x => x.name === 'Skills')) s -= 10;
    // Penalize non-standard bullets
    const odd = (text.match(/[▪◦◆◇■□●○★☆]/g) || []).length;
    if (odd > 5) s -= 10;
    // Penalize column-y output (heuristic: many short lines)
    const lines = text.split('\n').filter(Boolean);
    const avg = lines.reduce((a, l) => a + l.length, 0) / Math.max(1, lines.length);
    if (avg < 25 && lines.length > 30) s -= 8;
    return Math.max(0, s);
  },

  set(kw, sk, fmt, sec) {
    const overall = Math.round((kw * 0.4) + (sk * 0.35) + (fmt * 0.15) + (sec * 0.10));
    $('#score-num').textContent = overall;
    const ring = $('#ring-fg');
    const dash = 326 - (326 * overall / 100);
    ring.style.strokeDashoffset = dash;
    ring.style.stroke = overall >= 80 ? 'var(--good)' : overall >= 60 ? 'var(--warn)' : 'var(--bad)';
    setBar('#bar-kw', kw, '#bar-kw-n');
    setBar('#bar-sk', sk, '#bar-sk-n');
    setBar('#bar-fmt', fmt, '#bar-fmt-n');
    setBar('#bar-sec', sec, '#bar-sec-n');
    function setBar(sel, val, lab) {
      $(sel).style.width = val + '%';
      $(sel).style.background = val >= 80 ? 'var(--good)' : val >= 60 ? 'var(--warn)' : 'var(--bad)';
      $(lab).textContent = val;
    }
  }
};

// ---------- Suggestions engine ----------
const Suggest = {
  recompute() {
    if (!State.resume || !State.jd.keywords.length) {
      State.suggestions = [];
      Suggest.render();
      return;
    }
    const resumeText = (State.resume.header + ' ' + State.resume.sections.map(s => s.name + ' ' + s.body).join(' ')).toLowerCase();
    const vaultNames = new Set(State.vault.map(s => s.name.toLowerCase()));
    const out = [];
    for (const k of State.jd.keywords) {
      const kl = k.toLowerCase();
      if (resumeText.includes(kl)) continue; // already in resume
      // Match against vault (exact or contains)
      const vaultHit = State.vault.find(v => v.name.toLowerCase() === kl
        || v.name.toLowerCase().includes(kl) || kl.includes(v.name.toLowerCase()));
      const must = State.jd.must.includes(k);
      const nice = State.jd.nice.includes(k);
      out.push({
        key: k,
        where: vaultHit ? `Vault → Skills: "${vaultHit.name}"` : (must ? 'Required — add to Skills' : (nice ? 'Preferred — add to Skills' : 'Add to Skills')),
        status: 'pending',
        canInject: !!vaultHit,
        vaultHit
      });
    }
    State.suggestions = out.sort((a, b) => (b.canInject - a.canInject) || (a.key > b.key ? 1 : -1));
    Suggest.render();
  },

  inject(idx) {
    const s = State.suggestions[idx];
    if (!s || !s.canInject) return;
    let skills = State.resume.sections.find(x => x.name === 'Skills');
    if (!skills) {
      skills = { name: 'Skills', body: '' };
      State.resume.sections.push(skills);
    }
    // Avoid dupes
    if (!skills.body.toLowerCase().includes(s.vaultHit.name.toLowerCase())) {
      skills.body = skills.body ? `${skills.body.trim()}\n${s.vaultHit.name}` : s.vaultHit.name;
    }
    s.status = 'injected';
    Preview.render(true);
    Score.compute();
    Suggest.render();
    toast(`Injected "${s.vaultHit.name}"`, 'ok');
  },

  skip(idx) { State.suggestions[idx].status = 'skipped'; Suggest.render(); },
  injectAll() {
    State.suggestions.forEach((s, i) => { if (s.canInject && s.status === 'pending') Suggest.inject(i); });
  },

  render() {
    const list = $('#suggest-list');
    if (!State.suggestions.length) { list.innerHTML = '<div class="empty">No suggestions yet.</div>'; return; }
    list.innerHTML = State.suggestions.map((s, i) => `
      <div class="suggest" data-i="${i}">
        <div>
          <div class="key">${escapeHTML(s.key)}</div>
          <div class="where">${escapeHTML(s.where)}${s.status === 'injected' ? ' · <span style="color:var(--good)">injected</span>' : s.status === 'skipped' ? ' · skipped' : ''}</div>
        </div>
        <div class="actions">
          <button class="ok" title="Inject" ${s.canInject ? '' : 'disabled style="opacity:.4;cursor:not-allowed"'}>✓</button>
          <button class="no" title="Skip">⨯</button>
        </div>
      </div>
    `).join('');
    $$('#suggest-list .suggest').forEach(el => {
      const i = +el.dataset.i;
      $('.ok', el).addEventListener('click', () => Suggest.inject(i));
      $('.no', el).addEventListener('click', () => Suggest.skip(i));
    });
  }
};

// ---------- Preview ----------
const Preview = {
  render(highlightInjected = false) {
    const paper = $('#paper');
    if (!State.resume) {
      paper.innerHTML = `
        <div class="paper-empty" id="paper-empty">
          <h3>No resume loaded yet</h3>
          <p>Upload a PDF/DOCX/TXT resume and paste a job description to get a tailored, ATS-clean version.</p>
        </div>`;
      paper.className = 'paper';
      return;
    }
    paper.className = `paper tpl-${State.template} size-${State.fontSize}`;
    const r = State.resume;
    const [nameLine, ...headerRest] = r.header.split('\n');
    const contact = headerRest.join(' · ').trim();
    const section = (s) => {
      if (!s) return '';
      const body = s.body || '';
      if (s.name === 'Experience' && s.items?.length) {
        return `<h2 class="section">${s.name}</h2>` + s.items.map(it => `
          <h3 class="role">${escapeHTML(it.role || '')}${it.company ? ` <span style="font-weight:500;color:#5a5e6b">— ${escapeHTML(it.company)}</span>` : ''}</h3>
          ${it.meta ? `<div class="meta">${escapeHTML(it.meta)}</div>` : ''}
          <ul class="bullets">${it.bullets.map(b => `<li>${maybeMark(b, highlightInjected)}</li>`).join('')}</ul>
        `).join('');
      }
      if (s.name === 'Education' && s.items?.length) {
        return `<h2 class="section">${s.name}</h2>` + s.items.map(it => `
          <h3 class="role">${escapeHTML(it.degree)}</h3>
          ${it.detail ? `<div class="meta">${escapeHTML(it.detail)}</div>` : ''}
        `).join('');
      }
      if (s.name === 'Projects' && s.items?.length) {
        return `<h2 class="section">${s.name}</h2>` + s.items.map(it => `
          <h3 class="role">${escapeHTML(it.name)}</h3>
          <ul class="bullets">${it.bullets.map(b => `<li>${maybeMark(b, highlightInjected)}</li>`).join('')}</ul>
        `).join('');
      }
      if (s.name === 'Skills') {
        const items = body.split(/[\n,•·]/).map(x => x.trim()).filter(Boolean);
        return `<h2 class="section">${s.name}</h2>
          <div class="skills-grid">${items.map(i => `<span>${maybeMark(i, highlightInjected)}</span>`).join('')}</div>`;
      }
      if (s.name === 'Summary') {
        return `<h2 class="section">${s.name}</h2><p>${escapeHTML(body)}</p>`;
      }
      if (!body.trim()) return '';
      return `<h2 class="section">${s.name}</h2><p>${escapeHTML(body)}</p>`;
    };

    const header = State.template === 'modern'
      ? `<div class="header">
          <div>
            <h1 class="name">${escapeHTML(nameLine || 'Your Name')}</h1>
            <div class="contact">${escapeHTML(contact)}</div>
          </div>
        </div>`
      : `<h1 class="name">${escapeHTML(nameLine || 'Your Name')}</h1>
         <div class="contact">${escapeHTML(contact)}</div>`;

    // Modern template: main column = Summary + Experience + Projects, sidebar = Skills + Education + Certs + Languages
    let sectionsHTML;
    if (State.template === 'modern') {
      const mainNames = ['Summary', 'Experience', 'Projects'];
      const sideNames = ['Skills', 'Education', 'Certifications', 'Languages', 'Awards', 'Interests'];
      const main = r.sections.filter(s => mainNames.includes(s.name)).map(section).join('');
      const side = r.sections.filter(s => sideNames.includes(s.name)).map(section).join('');
      sectionsHTML = `<div class="body"><div class="main">${main}</div><aside class="sidebar">${side}</aside></div>`;
    } else {
      sectionsHTML = r.sections.map(section).join('');
    }

    paper.innerHTML = header + sectionsHTML;
  }
};

function maybeMark(text, doMark) {
  const safe = escapeHTML(text);
  if (!doMark || !State.jd.keywords.length) return safe;
  // Wrap any JD keyword occurrences in <mark class="injected">
  const pattern = new RegExp('\\b(' + State.jd.keywords.map(escapeRegex).join('|') + ')\\b', 'gi');
  return safe.replace(pattern, '<mark class="injected">$1</mark>');
}

// ---------- PDF export ----------
const ExportPDF = {
  async go() {
    if (!State.resume) { toast('Upload a resume first', 'error'); return; }
    if (!window.jspdf) { toast('PDF library not loaded', 'error'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 56;
    const contentW = pageW - margin * 2;
    const sizeMap = { 11: 11, 10: 10, 9: 9 };
    const base = sizeMap[State.fontSize] || 10;
    const lineH = (pt) => pt * 1.35;
    let y = margin;
    let pageNum = 1;

    const ensureSpace = (need) => {
      if (y + need > pageH - margin) {
        doc.addPage();
        pageNum++;
        y = margin;
      }
    };

    const writeLine = (text, opts = {}) => {
      const { font = 'helvetica', style = 'normal', size = base, color = [20, 22, 29], gap = 2 } = opts;
      doc.setFont(font, style);
      doc.setFontSize(size);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(text, contentW);
      for (const line of lines) {
        ensureSpace(lineH(size) + gap);
        doc.text(line, margin, y);
        y += lineH(size) + gap;
      }
    };

    // Header
    const [nameLine, ...headerRest] = State.resume.header.split('\n');
    writeLine(nameLine || 'Your Name', { size: base + 12, style: 'bold' });
    writeLine(headerRest.join(' · '), { size: base - 1, color: [90, 94, 107] });

    y += 6;

    // Sections
    for (const s of State.resume.sections) {
      if (!s.body || !s.body.trim()) continue;
      ensureSpace(lineH(base + 2) + 8);
      writeLine(s.name.toUpperCase(), { size: base, style: 'bold', gap: 1 });
      // underline
      ensureSpace(4);
      doc.setDrawColor(208, 211, 219);
      doc.line(margin, y, pageW - margin, y);
      y += 6;

      if (s.name === 'Experience' && s.items?.length) {
        for (const it of s.items) {
          const header = [it.role, it.company && `— ${it.company}`].filter(Boolean).join(' ');
          writeLine(header, { style: 'bold', size: base + 0.5, gap: 0 });
          if (it.meta) writeLine(it.meta, { size: base - 1, color: [90, 94, 107], gap: 2 });
          for (const b of it.bullets) writeLine('• ' + b, { size: base, gap: 0 });
          y += 4;
        }
      } else if (s.name === 'Education' && s.items?.length) {
        for (const it of s.items) {
          writeLine(it.degree, { style: 'bold', size: base + 0.5, gap: 0 });
          if (it.detail) writeLine(it.detail, { size: base - 1, color: [90, 94, 107] });
          y += 2;
        }
      } else if (s.name === 'Projects' && s.items?.length) {
        for (const it of s.items) {
          writeLine(it.name, { style: 'bold', size: base + 0.5, gap: 0 });
          for (const b of it.bullets) writeLine('• ' + b, { size: base, gap: 0 });
          y += 2;
        }
      } else if (s.name === 'Skills') {
        const items = s.body.split(/[\n,•·]/).map(x => x.trim()).filter(Boolean);
        // Flow as a paragraph separated by bullet, wrapped
        const text = items.join('  •  ');
        writeLine(text, { size: base });
      } else {
        writeLine(s.body, { size: base });
      }
      y += 6;
    }

    // Footer with page numbers
    const total = doc.internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${total}`, pageW - margin, pageH - 24, { align: 'right' });
    }

    const filename = `resume-tailored-${Date.now()}.pdf`;
    doc.save(filename);
    toast('PDF exported: ' + filename, 'ok');
  }
};

// ---------- Utilities ----------
function escapeHTML(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(s) { return escapeHTML(s); }
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function setStatus(_msg, pct) { const p = $('#parse-progress'); if (p) p.value = pct; }
function toast(msg, kind = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast ' + kind;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.hidden = true, 2400);
}
function setStep(n) {
  $$('.step').forEach(el => el.classList.toggle('active', +el.dataset.step <= n));
}

// ---------- Wiring ----------
function wire() {
  // File upload
  const dz = $('#dropzone');
  const input = $('#file-input');
  dz.addEventListener('click', () => input.click());
  input.addEventListener('change', e => e.target.files[0] && ResumeParse.file(e.target.files[0]));
  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('dragover'); }));
  dz.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) ResumeParse.file(f); });

  // JD
  $('#jd-input').addEventListener('input', e => {
    State.jdText = e.target.value;
    $('#jd-stats').textContent = `${State.jdText.trim().split(/\s+/).filter(Boolean).length} words`;
    JD.parse(State.jdText);
    Score.compute();
    Suggest.recompute();
  });
  $('#jd-sample').addEventListener('click', () => {
    $('#jd-input').value = SAMPLE_JD;
    $('#jd-input').dispatchEvent(new Event('input'));
  });
  $('#jd-clear').addEventListener('click', () => { $('#jd-input').value = ''; $('#jd-input').dispatchEvent(new Event('input')); });

  // Vault
  $('#vault-add').addEventListener('click', () => {
    const v = $('#vault-input').value.split(',').map(s => s.trim()).filter(Boolean);
    v.forEach(name => Vault.add(name, Vault.categorize(name)));
    $('#vault-input').value = '';
  });
  $('#vault-input').addEventListener('keydown', e => { if (e.key === 'Enter') $('#vault-add').click(); });
  $$('.vault-tabs .tab').forEach(t => t.addEventListener('click', () => {
    $$('.vault-tabs .tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    State.vaultFilter = t.dataset.cat;
    Vault.render();
  }));
  $('#vault-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(State.vault, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'skills-vault.json';
    a.click();
  });
  $('#vault-import').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (Array.isArray(data)) {
        State.vault = data.filter(d => d && d.name);
        Vault.save(); Vault.render(); Suggest.recompute();
        toast(`Imported ${State.vault.length} skills`, 'ok');
      }
    } catch { toast('Invalid JSON', 'error'); }
  });
  $('#vault-clear').addEventListener('click', () => {
    if (confirm('Clear all skills from the vault?')) { State.vault = []; Vault.save(); Vault.render(); Suggest.recompute(); }
  });

  // Template & size
  $('#tpl-select').addEventListener('change', e => { State.template = e.target.value; Preview.render(); });
  $('#size-select').addEventListener('change', e => { State.fontSize = +e.target.value; Preview.render(); });

  // Suggestions
  $('#inject-all').addEventListener('click', Suggest.injectAll);
  $('#recompute').addEventListener('click', () => { JD.parse(State.jdText); Score.compute(); Suggest.recompute(); });

  // Export
  $('#btn-export').addEventListener('click', ExportPDF.go);

  // Step nav
  $$('.step').forEach(el => el.addEventListener('click', () => {
    const n = +el.dataset.step;
    if (n === 1) { document.querySelector('.col-left').scrollIntoView({ behavior: 'smooth' }); }
    if (n === 2) { $('#jd-input').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('#jd-input').focus(); }
    if (n === 3) { document.querySelector('.col-right').scrollIntoView({ behavior: 'smooth' }); }
    if (n === 4) { document.querySelector('.preview-card').scrollIntoView({ behavior: 'smooth' }); }
  }));
}

const SAMPLE_JD = `Senior Full-Stack Engineer

We are looking for a Senior Full-Stack Engineer to join our product team. You will own features end-to-end, from architecture through deployment, and partner closely with design and product.

Required:
- 5+ years of experience with React, Next.js, and TypeScript
- Strong Node.js / Express or Fastify background
- PostgreSQL, Prisma or similar ORM
- Docker, CI/CD, and AWS or GCP experience
- Experience designing REST APIs and GraphQL
- Solid understanding of testing (Jest, Playwright or Cypress)
- Excellent communication and collaboration skills

Preferred:
- Experience with Kubernetes and Terraform
- Familiarity with vector databases, embeddings, or LLM/RAG systems
- Product mindset; comfortable with user research and A/B testing
- Contributions to open-source

You will:
- Ship customer-facing features in a fast-paced environment
- Mentor junior engineers and lead code reviews
- Partner with design on UX decisions
- Help shape our engineering culture and roadmap`;

document.addEventListener('DOMContentLoaded', () => {
  Vault.load();
  Vault.render();
  wire();
});
