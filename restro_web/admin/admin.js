const API = '/api';
let token = localStorage.getItem('adminToken');
let currentUser = null;

// ============ AUTH ============
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');

if (token) checkAuth();

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        const res = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success) {
            token = data.token;
            currentUser = data.user;
            localStorage.setItem('adminToken', token);
            showDashboard();
        } else {
            loginError.textContent = data.message || 'Invalid credentials';
        }
    } catch (err) {
        loginError.textContent = 'Network error';
    }
});

async function checkAuth() {
    try {
        const res = await fetch(`${API}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            currentUser = data.user;
            showDashboard();
        } else {
            localStorage.removeItem('adminToken');
        }
    } catch {
        localStorage.removeItem('adminToken');
    }
}

function showDashboard() {
    loginScreen.style.display = 'none';
    dashboard.style.display = 'grid';
    document.getElementById('adminName').textContent = currentUser.name;
    loadReservations();
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('adminToken');
    location.reload();
});

// ============ NAVIGATION ============
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        const view = item.dataset.view;
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(view + 'View').classList.add('active');
        document.getElementById('viewTitle').textContent = item.textContent.trim().replace(/^\S+\s/, '');
        if (view === 'reservations') loadReservations();
        if (view === 'menu') loadMenu();
        if (view === 'contacts') loadContacts();
        if (view === 'analytics') loadAnalytics();
    });
});

// ============ API HELPER ============
async function api(url, options = {}) {
    const res = await fetch(API + url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...(options.headers || {})
        }
    });
    if (res.status === 401) {
        localStorage.removeItem('adminToken');
        location.reload();
        return { success: false };
    }
    return res.json();
}

// ============ RESERVATIONS ============
async function loadReservations() {
    const data = await api('/reservations?limit=200');
    if (!data.success) return;
    const body = document.getElementById('reservationsBody');
    body.innerHTML = data.data.map(r => `
        <tr>
            <td><code>${r.confirmationCode}</code></td>
            <td>${r.name}<br><small style="color:var(--dim)">${r.email}</small></td>
            <td>${new Date(r.date).toLocaleDateString()}</td>
            <td>${r.time}</td>
            <td>${r.guests}</td>
            <td><span class="status-badge status-${r.status}">${r.status}</span></td>
            <td>
                <button class="action-btn" onclick="updateStatus('${r._id}', 'confirmed')">Confirm</button>
                <button class="action-btn" onclick="updateStatus('${r._id}', 'cancelled')">Cancel</button>
                <button class="action-btn danger" onclick="deleteReservation('${r._id}')">Delete</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--dim)">No reservations yet</td></tr>';

    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);
    const active = data.data.filter(r => r.status !== 'cancelled');
    const todayCount = active.filter(r => new Date(r.date) >= today && new Date(r.date) < tomorrow).length;
    const weekCount = active.filter(r => new Date(r.date) >= today && new Date(r.date) < weekEnd).length;
    const totalGuests = active.reduce((sum, r) => sum + r.guests, 0);
    const pending = data.data.filter(r => r.status === 'pending').length;

    document.getElementById('todayCount').textContent = todayCount;
    document.getElementById('weekCount').textContent = weekCount;
    document.getElementById('totalGuests').textContent = totalGuests.toLocaleString();
    document.getElementById('pendingCount').textContent = pending;
}

async function updateStatus(id, status) {
    await api(`/reservations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
    });
    loadReservations();
}

async function deleteReservation(id) {
    if (!confirm('Delete this reservation?')) return;
    await api(`/reservations/${id}`, { method: 'DELETE' });
    loadReservations();
}

// ============ MENU ============
async function loadMenu() {
    const data = await api('/menu?includeUnavailable=1');
    if (!data.success) return;
    document.getElementById('menuBody').innerHTML = data.data.map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${item.category}</td>
            <td>$${item.price}</td>
            <td>${item.available ? '✓' : '✗'}</td>
            <td>
                <button class="action-btn" onclick="editMenuItem('${item._id}')">Edit</button>
                <button class="action-btn danger" onclick="deleteMenuItem('${item._id}')">Delete</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--dim)">No menu items — run <code>npm run seed</code></td></tr>';
}

const menuModal = document.getElementById('menuModal');
const menuForm = document.getElementById('menuForm');
let editingId = null;

document.getElementById('addMenuItem').addEventListener('click', () => {
    editingId = null;
    menuForm.reset();
    document.getElementById('modalTitle').textContent = 'Add Menu Item';
    menuModal.classList.add('active');
});

document.getElementById('modalClose').addEventListener('click', () => {
    menuModal.classList.remove('active');
});

menuModal.addEventListener('click', (e) => {
    if (e.target === menuModal) menuModal.classList.remove('active');
});

async function editMenuItem(id) {
    const data = await api('/menu?includeUnavailable=1');
    const item = data.data.find(i => i._id === id);
    if (!item) return;
    editingId = id;
    menuForm.name.value = item.name;
    menuForm.category.value = item.category;
    menuForm.description.value = item.description;
    menuForm.price.value = item.price;
    menuForm.badge.value = item.badge || '';
    menuForm.available.checked = item.available;
    menuForm.featured.checked = item.featured || false;
    document.getElementById('modalTitle').textContent = 'Edit Menu Item';
    menuModal.classList.add('active');
}

menuForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(menuForm));
    data.price = parseFloat(data.price);
    data.available = menuForm.available.checked;
    data.featured = menuForm.featured.checked;
    if (!data.badge) delete data.badge;
    if (editingId) {
        await api(`/menu/${editingId}`, { method: 'PUT', body: JSON.stringify(data) });
    } else {
        await api('/menu', { method: 'POST', body: JSON.stringify(data) });
    }
    menuModal.classList.remove('active');
    loadMenu();
});

async function deleteMenuItem(id) {
    if (!confirm('Delete this item?')) return;
    await api(`/menu/${id}`, { method: 'DELETE' });
    loadMenu();
}

// ============ CONTACTS ============
async function loadContacts() {
    const data = await api('/contact');
    if (!data.success) return;
    document.getElementById('contactsBody').innerHTML = data.data.map(c => `
        <tr>
            <td><span class="status-badge status-${c.read ? 'completed' : 'pending'}">${c.type}</span></td>
            <td>${c.name || '—'}</td>
            <td>${c.email}</td>
            <td>${(c.subject || c.message || '').slice(0, 80)}</td>
            <td>${new Date(c.createdAt).toLocaleDateString()}</td>
            <td>${c.read ? '✓' : `<button class="action-btn" onclick="markRead('${c._id}')">Mark read</button>`}</td>
        </tr>
    `).join('') || '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--dim)">No contacts yet</td></tr>';
}

async function markRead(id) {
    await api(`/contact/${id}/read`, { method: 'PATCH' });
    loadContacts();
}

// ============ ANALYTICS ============
async function loadAnalytics() {
    const [resData, contactData] = await Promise.all([
        api('/reservations?limit=1000'),
        api('/contact').catch(() => ({ data: [] }))
    ]);
    const reservations = (resData.data || []).filter(r => r.status !== 'cancelled');
    const total = reservations.length;
    const revenue = reservations.reduce((s, r) => s + (r.guests * 95), 0);
    const avgParty = total ? (reservations.reduce((s, r) => s + r.guests, 0) / total).toFixed(1) : 0;
    const subscribers = (contactData.data || []).filter(c => c.type === 'newsletter').length;
    document.getElementById('totalReservations').textContent = total.toLocaleString();
    document.getElementById('totalRevenue').textContent = '$' + revenue.toLocaleString();
    document.getElementById('avgParty').textContent = avgParty;
    document.getElementById('newsletterCount').textContent = subscribers;
}
