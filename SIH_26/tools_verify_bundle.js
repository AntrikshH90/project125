// Verify every local asset reference in deploy/*.html resolves to a real file
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, 'deploy');
let missing = [], checked = 0;
function checkFile(f) {
    const s = fs.readFileSync(path.join(root, f), 'utf8');
    const re = /(?:src|href)=["']([^"'#?]+)(?:\?[^"']*)?["']/g;
    let m;
    while ((m = re.exec(s))) {
        const r = m[1];
        if (/^(https?:|mailto:|tel:|data:)/.test(r) || r.startsWith('//')) continue;
        checked++;
        const p = path.join(root, f, '..', r);
        if (!fs.existsSync(p)) missing.push(f + ' -> ' + r);
    }
}
for (const f of ['index.html', 'citizen.html', 'admin.html', 'admin-login.html', 'info.html']) checkFile(f);
console.log('refs checked:', checked);
console.log(missing.length ? 'MISSING:\n' + missing.join('\n') : 'NONE — bundle complete');
