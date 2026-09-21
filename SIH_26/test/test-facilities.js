/* DOM-stubbed smoke test for js/facilities.js (run: node test/test-facilities.js) */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Minimal DOM stub
const elements = {};
function makeEl(id) {
    return {
        id, innerHTML: '', textContent: '', disabled: false, className: '',
        classList: { add() {}, remove() {}, add() {} },
        appendChild() {}, addEventListener() {}
    };
}
global.document = {
    getElementById: id => (elements[id] = elements[id] || makeEl(id)),
    createElement: tag => makeEl('el_' + Math.random()),
    head: { appendChild() {} },
    addEventListener() {}
};
global.window = global;
global.navigator = { geolocation: null };

const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'facilities.js'), 'utf8');
eval(code);

const F = global.Facilities;
let pass = 0, fail = 0;
function t(name, cond) {
    if (cond) { pass++; console.log('PASS - ' + name); }
    else { fail++; console.log('FAIL - ' + name); }
}

F.setChip('all');   // triggers renderChips() + render() through the public API
const html1 = document.getElementById('facility-results').innerHTML;
t('renders 11 facility cards', (html1.match(/class="ff-card[" ]/g) || []).length === 11);
t('renders stats strip', html1.includes('ff-stats'));
t('renders chips', document.getElementById('ff-chips').innerHTML.split('ff-chip').length >= 9);

F.setQuery('blood');
F.render();
const html2 = document.getElementById('facility-results').innerHTML;
t('search "blood" narrows results', html2.includes('Blood Bank') && !html2.includes('Seloo'));

F.setQuery('');
F.setChip('antivenom');
const html3 = document.getElementById('facility-results').innerHTML;
t('antivenom chip filters to 6 facilities', (html3.match(/class="ff-card[" ]/g) || []).length === 6);

F.setChip('open24');
const html4 = document.getElementById('facility-results').innerHTML;
t('24x7 chip excludes PHCs (9AM-4PM)', !html4.includes('Deoli'));

F.setChip('all');
// Simulate GPS: use internal sort via userLoc is private; test distance fallback path
t('book() confirms and marks requested', (() => {
    F.book('dh');
    return document.getElementById('facility-results').innerHTML.includes('Requested');
})());
t('book() ignores duplicate requests', (() => {
    const before = document.getElementById('facility-results').innerHTML;
    F.book('dh');
    return before === document.getElementById('facility-results').innerHTML;
})());

console.log('\n' + (fail === 0 ? 'ALL ' + pass + ' TESTS PASSED' : fail + ' FAILED / ' + pass + ' passed'));
process.exit(fail === 0 ? 0 : 1);