const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const vc = new VirtualConsole(); let errs = [];
vc.on('jsdomError', e => errs.push('JSDOM: ' + e.message));
vc.on('error', (...a) => errs.push('console.error: ' + a.join(' ')));
const html = fs.readFileSync('index.html', 'utf8');
const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) {
    w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (t, p) => (p === 'measureText' ? () => ({ width: 10 }) : (p === 'createRadialGradient' ? () => ({ addColorStop: () => {} }) : () => {})), set: () => true });
    w.Element.prototype.getBoundingClientRect = () => ({ width: 760, height: 520, top: 100, left: 100, right: 860, bottom: 620 });
    w.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
    w.IntersectionObserver = class { constructor(cb){this.cb=cb;} observe(t){ this.cb([{isIntersecting:true, target:t}], this); } unobserve(){} disconnect(){} };
  }
});
setTimeout(() => {
  const w = dom.window, d = w.document;
  const cards = d.querySelectorAll('#cs-grid .cs-card');
  console.log('case cards:', cards.length, '(expect 4)');
  console.log('section position ok:', !!d.querySelector('#work + * #case-studies, #case-studies') && d.getElementById('case-studies').compareDocumentPosition(d.getElementById('apex')) & 4 ? 'before apex ✔' : 'WRONG');
  // open case 0 via exposed API
  w.axOpenCase(0);
  console.log('dialog open:', d.getElementById('case-dialog').classList.contains('open'));
  console.log('case title:', d.getElementById('case-dialog-title').textContent.slice(0, 40));
  console.log('metrics blocks:', d.querySelectorAll('.case-metric').length);
  console.log('loom slot armed:', !!d.getElementById('loom-slot'));
  // sahayak should pull ARCH_DATA flowchart
  w.axOpenCase(1);
  console.log('sahayak flowchart embedded:', !!d.querySelector('.case-arch svg'));
  // next/prev
  d.getElementById('case-next').click();
  console.log('next -> case 03 title:', d.getElementById('case-dialog-title').textContent.slice(0, 30));
  // escape closes + unlocks
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  console.log('escape closed:', !d.getElementById('case-dialog').classList.contains('open'), 'lock released:', w.__axOverlayLock === false);
  // key 7 scrolls (guarded scrollIntoView) + palette has CASE entries
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: '7', bubbles: true }));
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'k', bubbles: true }));
  const caseCmds = [...d.querySelectorAll('#cmdk-list li')].filter(li => li.textContent.includes('CASE'));
  console.log('palette case commands:', caseCmds.length);
  console.log('help rows incl case studies:', [...d.querySelectorAll('#help-grid .krow')].some(r => r.textContent.includes('Case studies')));
  console.log(errs.length ? 'ERRORS:\n' + errs.slice(0, 8).join('\n') : 'NO CONSOLE ERRORS ✔');
  process.exit(0);
}, 3200);
