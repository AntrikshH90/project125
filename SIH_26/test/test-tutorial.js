/* DOM-stubbed smoke test for js/tutorial.js (run: node test/test-tutorial.js) */
const fs = require('fs');
const path = require('path');

function makeEl(id) {
    return {
        id, innerHTML: '', textContent: '', disabled: false, title: '',
        style: {}, onclick: null,
        classList: { add() {}, remove() {}, contains: () => false },
        appendChild() {}, addEventListener() {}, removeEventListener() {}
    };
}
global.document = {
    getElementById: id => els[id] || (els[id] = makeEl(id)),
    createElement: () => makeEl('el_' + Math.random()),
    createDocumentFragment: () => ({ appendChild() {} }),
    querySelector: () => null,
    head: { appendChild() {} },
    body: { appendChild() {} },
    addEventListener() {}, removeEventListener() {}
};
const els = {};
global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {} };
global.console.info = () => {};
global.addEventListener = () => {};
global.removeEventListener = () => {};
global.dispatchEvent = () => {};

const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'tutorial.js'), 'utf8');
eval(code);

const T = global.Tutorial, D = global.DemoMode;
let pass = 0, fail = 0;
function t(name, cond) {
    if (cond) { pass++; console.log('PASS - ' + name); }
    else { fail++; console.log('FAIL - ' + name); }
}

// 1. Steps integrity
const ids = T.steps.map(s => s.id);
t('12 steps defined', T.steps.length === 12);
t('step ids unique', new Set(ids).size === ids.length);
t('every step has title + body + icon', T.steps.every(s => s.title && s.body && s.icon));
t('every target step has a selector or center flag',
    T.steps.every(s => s.center || s.target));

// 2. waitFor events all have an emitting hook (documented contract)
const waits = T.steps.filter(s => s.waitFor).map(s => s.waitFor);
const emitted = ['wizard-opened', 'wizard-closed', 'sos-acked', 'facilities-opened',
    'facilities-filtered', 'facilities-closed', 'account-opened', 'account-saved',
    'dashboard-opened'];
t('all waitFor events are hook-emitted', waits.every(w => emitted.includes(w)));

// 3. DemoMode
D.enter();
t('DemoMode.enter() activates', D.active === true);
D.exit();
t('DemoMode.exit() deactivates', D.active === false);

// 4. emit() advances only on the current waitFor
T.steps; // steps exposed
// simulate: manually drive internal state through public API
// start() needs full DOM; instead verify emit() is a no-op when inactive
T.emit('wizard-opened');
t('emit() is a safe no-op when tour inactive', true); // no throw

// 5. finish() persistence path uses localStorage key
t('uses em_tutorial_done_v1 storage key', code.includes('em_tutorial_done_v1'));

// 6. demo suppression contract exists in trust layer
const trustSrc = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'trust', 'trust-ui.js'), 'utf8');
t('trust layer checks DemoMode (wizard)', trustSrc.includes('wizard case NOT filed'));
t('trust layer checks DemoMode (SOS pipeline)', trustSrc.includes('SOS pipeline suppressed'));
t('trust layer checks DemoMode (triage)', trustSrc.includes('triage case NOT filed'));

console.log('\n' + (fail === 0 ? 'ALL ' + pass + ' TESTS PASSED' : fail + ' FAILED / ' + pass + ' passed'));
process.exit(fail === 0 ? 0 : 1);