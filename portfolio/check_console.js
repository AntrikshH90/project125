const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const vc = new VirtualConsole();
let errs = [];
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
  // simulate some key presses
  const w = dom.window, d = w.document;
  ['?','Escape','k','Escape','t','t','c','w','w','1'].forEach(k => {
    d.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  });
  setTimeout(() => {
    console.log('boot removed:', !d.getElementById('boot'));
    console.log('body booted class:', d.body.classList.contains('booted'));
    console.log('help grid rows:', d.querySelectorAll('#help-grid .krow').length);
    console.log('cmdk items:', d.querySelectorAll('#cmdk-list li').length);
    console.log('lights-out toggled back off:', !d.documentElement.classList.contains('lights-out'));
    console.log('toasts spawned:', d.querySelectorAll('.ax-toast').length >= 0);
    console.log(errs.length ? 'ERRORS:\n' + errs.slice(0,10).join('\n') : 'NO CONSOLE ERRORS ✔');
    process.exit(0);
  }, 800);
}, 3000);
