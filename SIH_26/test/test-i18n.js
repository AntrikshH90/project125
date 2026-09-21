/* Smoke tests for the full-page language engine (js/translations.js)
   (run: node test/test-i18n.js) */
const fs = require('fs');
const path = require('path');

/* ---- minimal DOM stubs (walker works on plain objects) ---- */
global.Node = { ELEMENT_NODE: 1, TEXT_NODE: 3 };
const els = {};
function makeEl(id) {
    return {
        id, innerHTML: '', textContent: '', value: '', style: {}, className: '',
        attrs: {},
        classList: {
            _s: new Set(),
            add(...c) { c.forEach(x => this._s.add(x)); },
            remove(...c) { c.forEach(x => this._s.delete(x)); },
            toggle() {}, contains(c) { return this._s.has(c); }
        },
        hasAttribute(k) { return k in this.attrs; },
        getAttribute(k) { return this.attrs[k]; },
        setAttribute(k, v) { this.attrs[k] = v; },
        appendChild() {}, addEventListener() {}, removeEventListener() {},
        setAttribute_original: null
    };
}
function txt(v) {
    const n = makeEl('t' + Math.random());
    n.nodeType = 3; n.nodeValue = v; n.childNodes = [];
    return n;
}
function el(tag, opts) {
    const n = makeEl('e' + Math.random());
    n.nodeType = 1; n.tagName = tag.toUpperCase(); n.childNodes = (opts && opts.children) || [];
    if (opts && opts.cls) opts.cls.forEach(c => n.classList.add(c));
    if (opts && opts.attrs) Object.assign(n.attrs, opts.attrs);
    return n;
}

global.document = {
    getElementById: id => els[id] || (els[id] = makeEl(id)),
    createElement: () => makeEl('el_' + Math.random()),
    head: { appendChild() {} },
    documentElement: makeEl('html'),
    addEventListener() {}, removeEventListener() {},
    readyState: 'loading'
};
const store = {};
global.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
};
global.window = global;
global.CustomEvent = function (name, opts) { this.type = name; this.detail = opts && opts.detail; };
const fired = [];
global.addEventListener = (n, f) => {};
global.dispatchEvent = e => { fired.push(e); };

eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'translations.js'), 'utf8'));

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } };

/* ---- 1. dictionary integrity ---- */
const T = window.appTranslations;
const hi = Object.keys(T.hi), mr = Object.keys(T.mr);
t('mr dictionary is complete (>= 150 keys)', mr.length >= 150);
t('hi/mr key parity', hi.every(k => T.mr[k]) && mr.every(k => T.hi[k]));
t('no empty/undefined values',
    hi.every(k => T.hi[k] && T.mr[k] && T.hi[k] !== 'undefined' && T.mr[k] !== 'undefined'));
t('new-UI strings covered (Officer Login, Symptom Checker, handshake admin panel)',
    T.hi['Officer Login'] && T.hi['Symptom Checker'] && T.hi['Acknowledge & Reserve Bed'] &&
    T.mr['Officer Login'] && T.mr['Symptom Checker'] && T.mr['Acknowledge & Reserve Bed']);

/* ---- 2. build a real body tree — walker needs document.body ---- */
let bodyChildren = [];
document.body = makeEl('body');
document.body.nodeType = 1;                       // ELEMENT — walker recurses
document.body.tagName = 'BODY';
Object.defineProperty(document.body, 'childNodes', {
    get: () => bodyChildren, set: () => {}
});
function mount(node) { bodyChildren.push(node); }
function clearBody() { bodyChildren = []; }

/* exact-match translation + lossless EN restore */
const hero = el('span', { children: [txt('Right Care.')] });
mount(hero);
window.translatePage('hi');
t('exact match -> hi', hero.childNodes[0].nodeValue === 'सही देखभाल।');
window.translatePage('en');
t('switch back -> lossless EN restore', hero.childNodes[0].nodeValue === 'Right Care.');
clearBody();

/* substring sweep for mixed nodes */
const mixed = el('p', { children: [txt('Tap Explore to open the Pre-Arrival Handshake flow.')] });
mount(mixed);
window.translatePage('mr');
t('substring sweep translates mixed text (mr)', mixed.childNodes[0].nodeValue.indexOf('आगमन-पूर्व रुग्णालय समन्वय') >= 0);
window.translatePage('en');
t('mixed node restores to EN', mixed.childNodes[0].nodeValue === 'Tap Explore to open the Pre-Arrival Handshake flow.');
clearBody();

/* nbsp normalization (Sign In button uses &nbsp;) */
const nbsp = el('span', { children: [txt('Sign\u00A0In')] });
mount(nbsp);
window.translatePage('hi');
t('&nbsp; variants translate (Sign\u00A0In)', nbsp.childNodes[0].nodeValue === 'साइन इन');
window.translatePage('en');
t('&nbsp; restores', nbsp.childNodes[0].nodeValue === 'Sign\u00A0In');
clearBody();

/* placeholder + title attributes */
const inp = el('input', { attrs: { placeholder: 'Search facilities, services, or locations...' } });
mount(inp);
window.translatePage('hi');
t('placeholder translated', inp.getAttribute('placeholder') === 'सुविधाएं, सेवाएं या स्थान खोजें...');
window.translatePage('en');
t('placeholder restores', inp.getAttribute('placeholder') === 'Search facilities, services, or locations...');
clearBody();

/* skips icons / code */
const icon = el('span', { cls: ['material-symbols-outlined'], children: [txt('check_circle')] });
mount(icon);
window.translatePage('hi');
t('material icons untouched', icon.childNodes[0].nodeValue === 'check_circle');
clearBody();

/* ---- 7. global state + persistence + event ---- */
window.translatePage('hi');
t('window.currentLang synced (TTS speaks hi)', window.currentLang === 'hi');
t('choice persisted', store['selected_lang'] === 'hi');
t('em:language-changed dispatched', fired.some(e => e.type === 'em:language-changed' && e.detail.lang === 'hi'));
t('html lang attribute set', document.documentElement.attrs.lang === 'hi');
window.translatePage('en');
t('invalid lang falls back to EN', (window.translatePage('zz'), window.currentLang === 'en'));

/* ---- 8. role-chooser keys exist (index.html coverage) ---- */
t('chooser strings covered in hi+mr',
    T.hi['Who are you?'] && T.mr['Who are you?'] &&
    T.hi['I am a Patient / Citizen'] && T.mr['I am a Patient / Citizen'] &&
    T.hi['Enter Citizen Portal'] && T.mr['Enter Citizen Portal']);

console.log('\n' + (fail === 0 ? 'ALL ' + pass + ' TESTS PASSED' : fail + ' FAILED / ' + pass + ' passed'));
process.exit(fail === 0 ? 0 : 1);
