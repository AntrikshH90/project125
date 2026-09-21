const baseURL = process.env.API_URL || 'http://localhost:5000/api';

const tests = [
    { name: 'Health Check', method: 'GET', path: '/health' },
    { name: 'Get Menu', method: 'GET', path: '/menu' },
    { name: 'Get Reservations (admin)', method: 'GET', path: '/reservations' }
];

async function test({ name, method, path }) {
    try {
        const res = await fetch(baseURL + path, { method });
        const ok = res.status < 500;
        console.log(`${ok ? '✓' : '✗'} ${name} [${res.status}]`);
        return ok;
    } catch (err) {
        console.log(`✗ ${name} [ERROR: ${err.message}]`);
        return false;
    }
}

(async () => {
    console.log(`\n🔥 Testing ${baseURL}\n`);
    const results = [];
    for (const t of tests) {
        results.push(await test(t));
    }
    const passed = results.filter(Boolean).length;
    console.log(`\n${passed}/${results.length} tests passed\n`);
    process.exit(passed === results.length ? 0 : 1);
})();
