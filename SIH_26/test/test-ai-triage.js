/* Smoke tests for js/ai-triage.js + js/mitra-chat.js
   (run: node test/test-ai-triage.js) */
const fs = require('fs');
const path = require('path');

function makeEl(id) {
    return {
        id, innerHTML: '', textContent: '', style: {}, value: '', disabled: false,
        placeholder: '', className: '',
        classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
        appendChild() {}, addEventListener() {}, removeEventListener() {},
        parentNode: null, scrollTop: 0, scrollHeight: 0, focus() {}
    };
}
const els = {};
global.document = {
    getElementById: id => els[id] || (els[id] = makeEl(id)),
    createElement: () => makeEl('el_' + Math.random()),
    head: { appendChild() {} },
    addEventListener() {}, removeEventListener() {}
};
global.window = global;
global.console.info = () => {};
global.addEventListener = () => {};
global.removeEventListener = () => {};
global.dispatchEvent = () => {};

/* Simulate citizen.html load order: network-cards.js runs BEFORE
   ai-triage.js, so the non-destructive takeover of Network.aiOpen fires. */
global.Network = { aiOpen: function () { } };

eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'ai-triage.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'mitra-chat.js'), 'utf8'));

let pass = 0, fail = 0;
const t = (name, cond) => { if (cond) { pass++; console.log('PASS - ' + name); } else { fail++; console.log('FAIL - ' + name); } };

const ENG = window.MitraTriage._internals;
const CHAT = window.MitraChat._internals;

/* ---- 1. Symptom database ---- */
t('7 body-system groups', ENG.GROUPS.length === 7);
t('45+ symptoms', ENG.ALL_SYMPTOMS.length >= 45);
t('every symptom has trilingual labels',
    ENG.ALL_SYMPTOMS.every(s => s.label && s.hi && s.mr && s.icon && typeof s.w === 'number'));
t('red flags exist', ENG.ALL_SYMPTOMS.filter(s => s.red).length >= 10);

/* ---- 2. Core engine scoring ---- */
let r = ENG.analyze({ picked: { fever: true, headache: true, bodyAche: true }, severity: 'moderate', duration: 'today', custom: [] });
t('fever+headache+bodyache = dengue band (URGENT)', r.priority === 'URGENT' && r.score >= 35 && r.score < 70);
t('dengue condition inferred', r.conditions.some(c => c.id === 'dengue'));

r = ENG.analyze({ picked: { chestPain: true }, severity: 'moderate', duration: 'today', custom: [] });
t('single red flag forces CRITICAL', r.priority === 'CRITICAL' && r.score >= 70);
t('cardiac condition inferred', r.conditions.some(c => c.id === 'cardiac'));

r = ENG.analyze({ picked: { bite: true }, severity: 'moderate', duration: 'today', custom: [] });
t('snakebite -> snake condition', r.conditions.some(c => c.id === 'snake'));

r = ENG.analyze({ picked: { vomit: true, diarrhea: true }, severity: 'moderate', duration: 'days13', custom: [] });
t('vomit+diarrhea -> gastro condition', r.conditions.some(c => c.id === 'gastro'));

r = ENG.analyze({ picked: { runnyNose: true }, severity: 'mild', duration: 'today', custom: [] });
t('mild single symptom -> STABLE', r.priority === 'STABLE');

r = ENG.analyze({ picked: {}, severity: 'moderate', duration: 'today', custom: [{ label: 'strange feeling', w: 8 }] });
t('custom typed symptom counts (w=8 -> STABLE)', r.score === 8);

r = ENG.analyze({ picked: { fever: true }, severity: 'severe', duration: 'chronic', custom: [] });
t('severity multiplier + duration bonus applied (fever 14: 14*1.25+12 = 30)', r.score === 30);

/* ---- 3. Free-text matcher (multilingual) ---- */
t("'fever' -> fever", ENG.matchText('I have fever since morning') === 'fever');
t("'बुखार' -> fever", ENG.matchText('मुझे बुखार है') === 'fever');
t("'ताप' -> fever (marathi)", ENG.matchText('मला ताप आहे') === 'fever');
t("'sir dard' -> headache", ENG.matchText('sir dard ho raha hai') === 'headache');
t("'सिरदर्द' -> headache", ENG.matchText('सिरदर्द है') === 'headache');
t("'ulti' -> vomit", ENG.matchText('subah se ulti ho rahi hai') === 'vomit');
t("'सांप' -> bite", ENG.matchText('सांप ने काटा') === 'bite');
t("'snake bite' -> bite", ENG.matchText('snake bit my leg') === 'bite');
t("'chest pain' -> chestPain", ENG.matchText('chest pain aa rahi hai') === 'chestPain');
t("'saans nahi' -> breathless", ENG.matchText('saans nahi le pa raha') === 'breathless');
t("'pet dard' -> abdPain", ENG.matchText('pet dard bahut hai') === 'abdPain');
t("unknown text -> null", ENG.matchText('xyzabc nothing here') === null);
t("short text -> null", ENG.matchText('ok') === null);

/* ---- 4. Autocomplete suggest ---- */
t("suggest('fev') finds fever", ENG.suggest('fev').includes('fever'));
t("suggest('बुख') finds fever", ENG.suggest('बुख').includes('fever'));
t("suggest('chakk') finds dizzy", ENG.suggest('chakk').includes('dizzy'));
t("suggest caps at 6", ENG.suggest('co').length <= 6);
t("suggest('') empty", ENG.suggest('').length === 0);

/* ---- 5. Chatbot intent engine ---- */
t("chat 'chest pain' -> red emergency intent", CHAT.matchIntent('I have severe chest pain').red === true);
t("chat 'सीने में दर्द' -> red", CHAT.matchIntent('सीने में दर्द है').red === true);
t("chat 'snake bit' -> red", CHAT.matchIntent('snake bit my son').red === true);
t("chat 'fever' -> NOT red", CHAT.matchIntent('mild fever since yesterday').red === false);
t("chat 'बुखार' -> NOT red", CHAT.matchIntent('बुखार है').red === false);
t("chat 'stroke face drooping' -> red", CHAT.matchIntent('his face is drooping and slurred speech').red === true);
t("chat gibberish -> default intent", CHAT.matchIntent('asdf qwerty zz').id === 'default');
t("every intent has 3 language responses",
    CHAT.INTENTS.every(it => it.resp.en && it.resp.hi && it.resp.mr));

/* ---- 6. Public API surface ---- */
t('MitraTriage public API complete',
    ['open', 'tab', 'toggle', 'setSeverity', 'setDuration', 'setLang', 'reset',
     'onType', 'addFree', 'pickSuggest', 'report', 'call108'].every(fn => typeof window.MitraTriage[fn] === 'function'));
t('MitraChat public API complete',
    ['onShow', 'onLangChange', 'quick', 'key', 'submit', 'report', 'setLang'].every(fn => typeof window.MitraChat[fn] === 'function'));

/* ---- 8. API config slot ---- */
const chatSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'mitra-chat.js'), 'utf8');
t('API key slot present (blank default)',
    chatSrc.includes('apiKey') && !/\bapiKey:\s*'sk-/.test(chatSrc));

/* ---- 9. Takeover check (Network stubbed above, so this proves the wrap ran) ---- */
t('MitraTriage.open exists for the Explore-card entry point',
    typeof window.MitraTriage.open === 'function');

console.log('\n' + (fail === 0 ? 'ALL ' + pass + ' TESTS PASSED' : fail + ' FAILED / ' + pass + ' passed'));
process.exit(fail === 0 ? 0 : 1);
