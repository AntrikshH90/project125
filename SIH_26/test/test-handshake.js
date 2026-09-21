/* Smoke tests for the Pre-Arrival Handshake role split
   (run: node test/test-handshake.js)

   Simulates the cross-page flow exactly as the browser does:
     citizen page  -> HandshakeStore.create + read-only render
     admin page    -> AdminHandshake.render + decide
     cross-page    -> storage event sync (same localStorage)      */
const fs = require('fs');
const path = require('path');

function makeEl(id) {
    return {
        id, innerHTML: '', textContent: '', value: '', disabled: false, style: {}, className: '',
        classList: {
            _s: new Set(),
            add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
            toggle(c, f) { if (f === undefined) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); } else if (f) this._s.add(c); else this._s.delete(c); },
            contains(c) { return this._s.has(c); }
        },
        parentNode: { querySelector: () => null },
        appendChild() {}, addEventListener() {}, removeEventListener() {},
        scrollTop: 0, scrollHeight: 0, focus() {}
    };
}
const els = {};
global.document = {
    getElementById: id => els[id] || (els[id] = makeEl(id)),
    createElement: () => makeEl('el_' + Math.random()),
    head: { appendChild() {} },
    addEventListener() {}, removeEventListener() {}
};

const store = {};
global.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
};
global.window = global;
global.CustomEvent = function (name, opts) { this.type = name; this.detail = opts && opts.detail; };
const listeners = {};
global.addEventListener = (n, f) => { (listeners[n] = listeners[n] || []).push(f); };
global.removeEventListener = () => {};
global.dispatchEvent = e => { (listeners[e.type] || []).forEach(f => f(e)); };
global.console.info = () => {};

const toastLog = [];
global.showToast = (m, i) => toastLog.push(m + '|' + i);

/* ---------- load modules in page order ---------- */
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'handshake.js'), 'utf8'));        // shared store
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'network-cards.js'), 'utf8'));    // citizen page
global.openModal = id => { const m = els[id] || (els[id] = makeEl(id)); m.classList.add('show'); };
global.closeModal = id => { const m = els[id]; if (m) m.classList.remove('show'); };
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'admin-handshake.js'), 'utf8'));  // admin page

let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n); } };

/* ---------- 1. store basics ---------- */
t('store empty at start', window.HandshakeStore.count() === 0);
const req = window.HandshakeStore.create({
    hospital: 'District Hospital Wardha', caseType: 'Snakebite Case 🐍',
    patient: 'Ramesh Pawar (42/M)', bed: '4', bedType: 'ICU',
    etaMin: 12, trust: 91, tier: 'HIGH', antivenom: '4 vials polyvalent'
});
t('create -> PENDING with id', req.status === 'PENDING' && /^HS-\d+$/.test(req.id));
t('reroute target preset', req.rerouteTo === 'Rural Hospital Sevagram');

/* ---------- 2. citizen view (read-only) ---------- */
window.Network.handshakeOpen();
const body = els['handshake-body'] ? els['handshake-body'].innerHTML : '';
t('citizen view opens with status', body.indexOf('AWAITING HOSPITAL') >= 0);
t('citizen has NO acknowledge button', body.indexOf('handshakeAck') < 0 && body.indexOf('Acknowledge &amp; Reserve') < 0);
t('citizen has NO decline button', body.indexOf('Decline &amp; Reroute') < 0);
t('citizen sees waiting banner', body.indexOf('duty officer') >= 0);
t('citizen sees replay only', body.indexOf('Replay simulation') >= 0);

/* ---------- 3. officer decides (admin side) ---------- */
els['hs-admin-queue'] = els['hs-admin-queue'] || makeEl('hs-admin-queue');
window.AdminHandshake.render();
const queueHtml = els['hs-admin-queue'].innerHTML;
t('admin queue shows acknowledge button', queueHtml.indexOf('Acknowledge &amp; Reserve') >= 0);
t('admin queue shows decline button', queueHtml.indexOf('Decline &amp; Reroute') >= 0);
t('admin queue shows patient + trust', queueHtml.indexOf('Ramesh Pawar') >= 0 && queueHtml.indexOf('91') >= 0);

window.AdminHandshake.decide(req.id, true);
const after = window.HandshakeStore.get(req.id);
t('decide(true) -> ACK with officer signature', after.status === 'ACK' && after.decidedBy === 'officer');
t('admin toast confirms reservation', toastLog.some(m => m.indexOf('ACKNOWLEDGED') >= 0));

/* citizen view refreshes live (storage/event already fired; render again) */
const bodyAfter = els['handshake-body'].innerHTML;
t('citizen view now shows ACKNOWLEDGED', bodyAfter.indexOf('ACKNOWLEDGED') >= 0);
t('citizen sees bed RESERVED + facilities ready',
    bodyAfter.indexOf('RESERVED') >= 0 && bodyAfter.indexOf('NOTIFIED') >= 0);
t('citizen still has no decision buttons after ACK', bodyAfter.indexOf('handshakeAck') < 0);

/* ---------- 4. decline + reroute path ---------- */
const req2 = window.HandshakeStore.create({ caseType: 'RTA', patient: 'B', bed: '9', bedType: 'Trauma Bay', etaMin: 10, trust: 60, tier: 'MEDIUM', antivenom: '—' });
window.AdminHandshake.decide(req2.id, false);
const after2 = window.HandshakeStore.get(req2.id);
t('decide(false) -> DECLINED', after2.status === 'DECLINED');
t('declined toast mentions reroute', toastLog.some(m => m.indexOf('rerouted') >= 0));

/* ---------- 5. decide is one-shot ---------- */
window.AdminHandshake.decide(req.id, false);
t('already-decided request cannot be re-decided', window.HandshakeStore.get(req.id).status === 'ACK');

/* ---------- 6. reset (replay) ---------- */
window.HandshakeStore.reset(req.id);
t('reset -> back to PENDING', window.HandshakeStore.get(req.id).status === 'PENDING');

/* ---------- 7. KPI + badge wiring ---------- */
window.AdminHandshake.render();
t('KPI card reflects live count', els['stat-handshakes'].innerHTML.indexOf(String(window.HandshakeStore.count())) >= 0);
t('tab badge shows pending count', els['hs-pending-badge'].textContent === window.HandshakeStore.pendingCount() + ' New');
t('panel counters populated',
    els['hs-panel-pending-count'].textContent.indexOf('PENDING') >= 0 &&
    els['hs-panel-ack-count'].textContent.indexOf('ACK') >= 0 &&
    els['hs-panel-declined-count'].textContent.indexOf('REROUTED') >= 0);

/* ---------- 8. remaining-minutes countdown ---------- */
const r2 = window.HandshakeStore.get(req2.id);
r2.createdAt = Date.now() - 4 * 60000;                 // 4 min elapsed of 10
t('remaining minutes computed live', window.HandshakeStore.remainingMin(r2) === 6);
r2.createdAt = Date.now() - 99 * 60000;
t('countdown floors at 0', window.HandshakeStore.remainingMin(r2) === 0);

console.log('\n' + (fail === 0 ? 'ALL ' + pass + ' TESTS PASSED' : fail + ' FAILED / ' + pass + ' passed'));
process.exit(fail === 0 ? 0 : 1);
