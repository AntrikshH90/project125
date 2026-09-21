// Smoke test: portal-bridge.js citizen mode + admin mode + outbox fallback.
// Simulates classic-script global binding semantics:
//   - citizen page: NO adminCases binding at all (admin.js absent)
//   - admin page:   adminCases binding initialized BEFORE bridge runs
const fs = require('fs');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'portal-bridge.js'), 'utf8');
const outboxCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'outbox.js'), 'utf8');

let pass = 0, fail = 0;
const t = (name, cond) => { if (cond) { pass++; console.log('PASS - ' + name); } else { fail++; console.log('FAIL - ' + name); } };

const store = {};
const localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
};

/* ---------- SCENARIO 1: CITIZEN PAGE (admin.js NOT loaded) ---------- */
{
    // No `adminCases` binding anywhere — exactly like citizen.html.
    const w1 = {};
    const fn = new Function('window', 'localStorage', code + '\nreturn window;');
    fn.call({}, w1, localStorage);
    t('citizen mode creates window.adminCases stand-in', !!w1.adminCases);

    w1.adminCases.unshift({ id: 'EM-1', type: 'Snakebite', trust: { score: 90, tier: 'HIGH' } });
    w1.adminCases.unshift({ id: 'EM-2', type: 'SOS' });
    t('unshift keeps both cases in memory', w1.adminCases.length === 2);

    const bus = JSON.parse(store['em_case_bus_v1']);
    t('both cases mirrored to bus, newest first',
        bus.length === 2 && bus[0].id === 'EM-2' && bus[1].id === 'EM-1');
    t('mirrored case preserves trust payload',
        bus[1].trust && bus[1].trust.score === 90);
}

/* ---------- SCENARIO 2: ADMIN PAGE (admin.js ran first) ---------- */
{
    const adminCases = [];   // admin.js's real list, initialized before bridge
    const w2 = {};
    const fn = new Function('window', 'localStorage', 'adminCases', code + '\nreturn window;');
    fn.call({}, w2, localStorage, adminCases);

    t('admin mode drains bus into real adminCases',
        adminCases.length === 2 && adminCases[0].id === 'EM-2' && adminCases[1].id === 'EM-1');
    t('bus emptied after drain', (store['em_case_bus_v1'] || '[]') === '[]');

    // Officer reopens the page later — nothing left to drain, no duplicates.
    const w2b = {};
    new Function('window', 'localStorage', 'adminCases', code)({}, w2b, localStorage, adminCases);
    t('re-drain is a no-op (no duplication)', adminCases.length === 2);
}

/* ---------- SCENARIO 3: OUTBOX citizen path parks case on bridge ----------
   Composed exactly like citizen.html: portal-bridge.js first (creates the
   adminCases stand-in whose unshift mirrors to the bus), then outbox.js. */
{
    store['em_outbox_v1'] = JSON.stringify([{
        id: 'Q-TEST1', kind: 'sos',
        payload: { patient: 'Test Patient', type: 'SOS' },
        queuedAt: new Date().toISOString()
    }]);

    const w3 = {};
    w3.addEventListener = () => {}; w3.removeEventListener = () => {};
    w3.dispatchEvent = () => {}; w3.CustomEvent = function () {};
    const boot = new Function('window', 'localStorage', code + '\nreturn window;');
    boot.call({}, w3, localStorage);

    const docStub = { getElementById: () => null, addEventListener: () => {}, dispatchEvent: () => {} };
    new Function('window', 'localStorage', 'document', outboxCode + '\nreturn window;')
        .call({}, w3, localStorage, docStub);
    w3.Outbox.sync();

    const bus = JSON.parse(store['em_case_bus_v1']);
    t('outbox case reached the bridge bus (via stand-in unshift)', bus.some(c => c.patient === 'Test Patient'));
    t('outbox queue cleared after bridge sync', JSON.parse(store['em_outbox_v1']).length === 0);
}

console.log('\n' + (fail === 0 ? 'ALL ' + pass + ' TESTS PASSED' : fail + ' FAILED / ' + pass + ' passed'));
process.exit(fail === 0 ? 0 : 1);
