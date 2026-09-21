// Smoke test: AI FAB creation + behavior (simulates browser buildUi)
global.Node = { ELEMENT_NODE: 1, TEXT_NODE: 3 };
const els = {};
const domListeners = {};
function makeEl(id) {
    const n = {
        id: id || '', style: {}, attrs: {}, className: '', innerHTML: '', childNodes: [],
        classList: {
            _s: new Set(),
            add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
            toggle() {}, contains(c) { return this._s.has(c); }
        },
        hasAttribute() { return false; }, getAttribute() { return null; },
        setAttribute() {}, appendChild() {},
        addEventListener() {}, removeEventListener() {}, onclick: null
    };
    if (id) els[id] = n;
    return n;
}
global.document = {
    getElementById: id => els[id] || null,
    createElement: () => makeEl(''),
    /* fragment.appendChild registers children like real DOM adoption */
    createDocumentFragment: () => { const f = makeEl('frag'); f.appendChild = c => { if (c && c.id) els[c.id] = c; }; return f; },
    head: makeEl(), documentElement: makeEl('html'), body: makeEl('body'),
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener(n, f) { if (n === 'DOMContentLoaded') (domListeners[n] = domListeners[n] || []).push(f); },
    removeEventListener() {}, readyState: 'loading'
};
global.window = global;
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.CustomEvent = function (n) { this.type = n; };
global.addEventListener = () => {}; global.dispatchEvent = () => {};
global.console.info = () => {};
global.DemoMode = { enter() {}, exit() {}, active: false };

eval(require('fs').readFileSync('js/tutorial.js', 'utf8'));

/* fire DOMContentLoaded so buildUi() runs, exactly like the browser */
(domListeners.DOMContentLoaded || []).forEach(f => f());

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } };

const fab = els['mitra-ai-fab'];
const help = els['tut-help'];
t('AI FAB created', !!fab);
t('help button created', !!help);
t('human doctor emoji (🧑‍⚕️) as icon', fab && fab.innerHTML.indexOf('mitra-ai-emoji') >= 0 &&
    fab.innerHTML.indexOf('\u{1F9D1}\u200D\u2695\uFE0F') >= 0);
t('no material ligature text (no raw "doctor" word)', fab && fab.innerHTML.indexOf('>doctor<') < 0);
t('red plus badge', fab && fab.innerHTML.indexOf('mitra-fab-plus') >= 0);
t('hover tag "Ask Mitra AI"', fab && fab.innerHTML.indexOf('Ask Mitra AI') >= 0);
t('doctor emoji in tag', fab && fab.innerHTML.indexOf('\u{1F9D1}\u200D\u2695\uFE0F') >= 0);

let opened = false, tabbed = '';
global.MitraTriage = { open() { opened = true; }, tab(x) { tabbed = x; } };
fab.onclick();
t('click opens triage modal', opened);
t('click switches to chat tab', tabbed === 'chat');

/* fallback path: no MitraTriage -> openModal('modal-triage') */
delete global.MitraTriage;
let modalOpened = '';
global.openModal = id => { modalOpened = id; };
fab.onclick();
t('fallback opens modal-triage', modalOpened === 'modal-triage');

console.log('\n' + (fail === 0 ? 'ALL ' + pass + ' TESTS PASSED' : fail + ' FAILED'));
process.exit(fail === 0 ? 0 : 1);
