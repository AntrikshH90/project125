// In-memory fallback database. Installed automatically when MongoDB is
// unreachable so the site, admin panel and reservations still work in demo
// mode. Data lives only for the lifetime of the server process.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const store = {
    Reservation: [],
    MenuItem: [],
    User: [],
    Contact: []
};

const makeId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 24);

function eq(a, b) {
    if (a instanceof Date || b instanceof Date) {
        return new Date(a).getTime() === new Date(b).getTime();
    }
    return a === b;
}

function cmp(a, b) {
    const av = a instanceof Date ? a.getTime() : (typeof a === 'number' ? a : String(a));
    const bv = b instanceof Date ? b.getTime() : (typeof b === 'number' ? b : String(b));
    return av < bv ? -1 : av > bv ? 1 : 0;
}

function match(doc, q = {}) {
    return Object.entries(q).every(([key, cond]) => {
        const value = doc[key];
        if (cond && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date)) {
            if ('$in' in cond) return cond.$in.some(c => eq(value, c));
            if ('$gte' in cond && cmp(value, cond.$gte) < 0) return false;
            if ('$gt' in cond && cmp(value, cond.$gt) <= 0) return false;
            if ('$lt' in cond && cmp(value, cond.$lt) >= 0) return false;
            if ('$lte' in cond && cmp(value, cond.$lte) > 0) return false;
            return true;
        }
        return eq(value, cond);
    });
}

function sortDocs(docs, spec = {}) {
    const entries = Object.entries(spec);
    return docs.slice().sort((a, b) => {
        for (const [key, dir] of entries) {
            const av = a[key];
            const bv = b[key];
            let c = 0;
            if (av instanceof Date || bv instanceof Date) {
                c = (av ? new Date(av).getTime() : 0) - (bv ? new Date(bv).getTime() : 0);
            } else if (typeof av === 'number' && typeof bv === 'number') {
                c = av - bv;
            } else {
                c = String(av ?? '').localeCompare(String(bv ?? ''));
            }
            if (c !== 0) return dir >= 0 ? c : -c;
        }
        return 0;
    });
}

function applySelect(doc, sel) {
    if (!sel || typeof sel !== 'string') return doc;
    const out = { ...doc };
    sel.split(/\s+/).forEach(part => {
        if (part.startsWith('-')) delete out[part.slice(1)];
    });
    return out;
}

function buildFind(docs) {
    const chain = {
        sort(spec) { docs = sortDocs(docs, spec); return chain; },
        limit(n) { docs = docs.slice(0, n); return chain; },
        skip(n) { docs = docs.slice(n); return chain; },
        select(sel) { docs = docs.map(d => applySelect(d, sel)); return chain; },
        then(resolve, reject) { return Promise.resolve(docs.map(d => d)).then(resolve, reject); }
    };
    return chain;
}

async function createDoc(model, data = {}) {
    const doc = {
        ...data,
        _id: makeId(),
        createdAt: new Date(),
        updatedAt: new Date()
    };
    if (model === 'User') {
        if (doc.password) doc.password = await bcrypt.hash(doc.password, 12);
        doc.role = doc.role || 'staff';
        doc.comparePassword = function (candidate) { return bcrypt.compare(candidate, doc.password); };
        doc.save = async function () { doc.updatedAt = new Date(); return doc; };
    }
    if (model === 'Reservation') {
        if (!doc.confirmationCode) {
            doc.confirmationCode = 'EO' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
        }
        doc.status = doc.status || 'pending';
        doc.depositPaid = doc.depositPaid || false;
        doc.depositAmount = doc.depositAmount || 0;
    }
    if (model === 'Contact') doc.read = doc.read || false;
    store[model].push(doc);
    return doc;
}

function patchModel(model, Model) {
    Model.findOne = (q = {}) => {
        const doc = store[model].find(d => match(d, q));
        return Promise.resolve(doc || null);
    };
    Model.find = (q = {}) => buildFind(store[model].filter(d => match(d, q)));
    Model.create = (data) => createDoc(model, data);
    Model.insertMany = (arr) => Promise.all(arr.map(d => createDoc(model, d)));
    Model.countDocuments = (q = {}) => Promise.resolve(store[model].filter(d => match(d, q)).length);
    Model.findByIdAndUpdate = (id, patch = {}, opts = {}) => {
        const doc = store[model].find(d => String(d._id) === String(id));
        if (!doc) return Promise.resolve(null);
        const original = { ...doc };
        Object.assign(doc, patch, { updatedAt: new Date() });
        return Promise.resolve(opts.new ? doc : original);
    };
    Model.findByIdAndDelete = (id) => {
        const i = store[model].findIndex(d => String(d._id) === String(id));
        if (i === -1) return Promise.resolve(null);
        return Promise.resolve(store[model].splice(i, 1)[0]);
    };
    Model.deleteMany = (q = {}) => {
        if (!q || Object.keys(q).length === 0) {
            store[model] = [];
        } else {
            store[model] = store[model].filter(d => !match(d, q));
        }
        return Promise.resolve({ deletedCount: store[model].length });
    };
    Model.findById = (id) => ({
        select(sel) {
            const doc = store[model].find(d => String(d._id) === String(id));
            return Promise.resolve(doc ? applySelect(doc, sel) : null);
        }
    });
}

const MENU_SEED = [
    { name: 'Smoked Burrata', category: 'starters', description: 'Heirloom tomatoes, basil oil, smoked sea salt', price: 24, badge: "Chef's Pick", featured: true, order: 1 },
    { name: 'Charred Octopus', category: 'starters', description: 'Smoked paprika, fingerling potatoes, lemon', price: 32, order: 2 },
    { name: 'Fire-Roasted Beet Salad', category: 'starters', description: 'Goat cheese, candied walnuts, balsamic reduction', price: 22, order: 3 },
    { name: 'Tuna Crudo', category: 'starters', description: 'Yuzu kosho, micro herbs, sesame oil', price: 28, order: 4 },
    { name: '45-Day Dry-Aged Ribeye', category: 'mains', description: 'Bone marrow butter, charred shallot jus', price: 85, badge: 'Signature', featured: true, order: 1 },
    { name: 'Wood-Fired Lamb', category: 'mains', description: 'Rosemary jus, roasted root vegetables', price: 72, order: 2 },
    { name: 'Pan-Seared Halibut', category: 'mains', description: 'Saffron broth, fennel, sea grapes', price: 68, order: 3 },
    { name: 'Wagyu Striploin', category: 'mains', description: 'Truffle butter, black garlic', price: 145, badge: 'Reserve', order: 4 },
    { name: 'Smoked Chocolate Tart', category: 'desserts', description: 'Hickory smoke, sea salt, vanilla cream', price: 18, order: 1 },
    { name: 'Crème Brûlée', category: 'desserts', description: 'Tonka bean, caramelized sugar', price: 16, order: 2 },
    { name: 'Burnt Basque Cheesecake', category: 'desserts', description: 'Fig compote, honey', price: 17, order: 3 },
    { name: '2018 Reserve Cabernet', category: 'wines', description: 'Napa Valley, full-bodied, blackberry notes', price: 185, badge: 'Reserve', order: 1 },
    { name: 'Château Margaux 2015', category: 'wines', description: 'Bordeaux, France', price: 650, order: 2 },
    { name: 'Domaine Leflaive Puligny-Montrachet', category: 'wines', description: 'Burgundy, France', price: 320, order: 3 },
    { name: 'Smoked Old Fashioned', category: 'cocktails', description: 'Bourbon, maple, hickory smoke', price: 22, order: 1 },
    { name: 'Ember Negroni', category: 'cocktails', description: 'Mezcal, campari, sweet vermouth', price: 20, order: 2 }
];

function installMemoryFallback() {
    patchModel('Reservation', require('../models/Reservation'));
    patchModel('MenuItem', require('../models/MenuItem'));
    patchModel('User', require('../models/User'));
    patchModel('Contact', require('../models/Contact'));

    if (store.MenuItem.length === 0) {
        MENU_SEED.forEach(item => createDoc('MenuItem', item));
    }
    if (store.User.length === 0) {
        createDoc('User', {
            name: 'Admin',
            email: process.env.ADMIN_EMAIL || 'admin@emberoak.com',
            password: 'admin123',
            role: 'admin'
        });
    }
}

module.exports = { installMemoryFallback };
