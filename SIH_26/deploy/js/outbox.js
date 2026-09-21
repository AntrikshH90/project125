/* ============================================================
   EMERGENCY MITRA - OFFLINE OUTBOX (js/outbox.js)
   ============================================================
   Fully-functional offline-first layer for the prototype:

     - window.Outbox.enqueue(kind, payload)  -> stores submission
       in localStorage when the network is down; returns {queued}
     - window.Outbox.all() / count() / clear()
     - Auto-syncs the queue back into the dashboard when the
       browser fires 'online' (or on load), pushing each item
       into adminCases + re-rendering.
     - Binds to online/offline events and updates the
       #offline-pill status + shows "Queued ✓" toast.

   Zero dependencies. Works on file:// too (localStorage only).
   ============================================================ */
(function () {
    'use strict';

    var KEY = 'em_outbox_v1';

    function read() {
        try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
        catch (e) { return []; }
    }
    function write(items) {
        try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* full */ }
    }

    function enqueue(kind, payload) {
        var items = read();
        items.push({
            id: 'Q-' + Date.now().toString(36).toUpperCase(),
            kind: kind,                      // 'wizard' | 'sos' | 'booking'
            payload: payload,
            queuedAt: new Date().toISOString()
        });
        write(items);
        notify('Saved offline — will sync automatically (' + items.length + ' queued)', 'cloud_upload');
        window.dispatchEvent(new CustomEvent('em:outbox-changed', { detail: { count: items.length } }));
        return { queued: true, id: items[items.length - 1].id };
    }

    function all() { return read(); }
    function count() { return read().length; }
    function clear() { write([]); }

    function remove(id) {
        write(read().filter(function (i) { return i.id !== id; }));
    }

    /* ---- Sync: flush queued submissions into the dashboard ---- */
    function sync() {
        var items = all();
        if (!items.length) return { synced: 0 };

        var synced = 0;
        items.forEach(function (item) {
            try {
                var p = item.payload || {};
                var c = {
                    id: 'EM-' + item.id.replace('Q-', ''),
                    time: 'Queued ' + new Date(item.queuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    patient: p.patient || 'Offline submission',
                    age: p.age || '—',
                    type: p.type || (item.kind === 'booking' ? 'Facility Booking' : 'Emergency'),
                    priority: p.priority || 'URGENT',
                    hospital: p.hospital || 'Pending assignment',
                    doctor: '—',
                    status: item.kind === 'booking' ? 'Appointment Queued' : 'Synced from Offline Queue',
                    eta: p.eta || '—',
                    vitals: p.note || 'Submitted offline — synced on reconnect',
                    trustScore: p.trustScore != null ? p.trustScore : 35,
                    trustTier: 'MEDIUM',
                    trustNote: 'Offline submission — operator review required'
                };
                if (typeof adminCases !== 'undefined') {
                    adminCases.unshift(c);
                    synced++;
                } else if (window.PortalBridge && window.PortalBridge.file) {
                    // Citizen page: no dashboard here. Park the case on the
                    // portal bridge so it reaches the admin Command Center
                    // the next time an officer signs in.
                    window.PortalBridge.file(c);
                    synced++;
                }
            } catch (e) { /* skip malformed item */ }
        });

        if (synced && typeof renderDashboard === 'function') renderDashboard();
        if (synced) {
            clear();
            notify(synced + ' queued submission(s) synced to Command Center', 'cloud_done');
        }
        window.dispatchEvent(new CustomEvent('em:outbox-changed', { detail: { count: synced ? 0 : count() } }));
        return { synced: synced };
    }

    /* ---- Network status + UI ---- */
    function isOnline() { return navigator.onLine; }

    function notify(msg, icon) {
        var t = document.getElementById('dash-toast');
        if (!t || typeof showToast !== 'function') { console.log('[Outbox] ' + msg); return; }
        showToast(msg, icon || 'info');
    }

    function updatePill() {
        var pill = document.getElementById('offline-pill');
        if (!pill) return;
        var dot = pill.querySelector('span');
        var online = isOnline();
        if (dot) dot.style.background = online ? '#16a34a' : '#ba1a1a';
        var label = pill.childNodes[pill.childNodes.length - 1];
        if (label && label.nodeType === 3) label.textContent = online ? 'Online' : 'Offline';
        pill.style.animation = online ? 'none' : 'bedPulse 2.5s infinite';
    }

    document.addEventListener('DOMContentLoaded', function () {
        updatePill();
        var remaining = count();
        if (remaining) notify(remaining + ' offline submission(s) waiting — syncing…', 'cloud_upload');
        sync();
    });
    window.addEventListener('online', function () { updatePill(); sync(); });
    window.addEventListener('offline', function () { updatePill(); notify('You are offline — submissions will be queued', 'cloud_off'); });
    /* Language switch: the Online/Offline pill label is JS-managed —
       refresh it so it follows the chosen language (full-page i18n). */
    window.addEventListener('em:language-changed', function () {
        try {
            var pill = document.getElementById('offline-pill');
            if (!pill) return;
            var lang = window.currentLang || 'en';
            var tr = (window.appTranslations && window.appTranslations[lang]) || {};
            var online = isOnline();
            var key = online ? 'Online' : 'Offline';
            var label = pill.childNodes[pill.childNodes.length - 1];
            if (label && label.nodeType === 3 && tr[key]) label.textContent = tr[key];
        } catch (e) { /* cosmetic only */ }
    });

    window.Outbox = {
        enqueue: enqueue, all: all, count: count, clear: clear,
        remove: remove, sync: sync, isOnline: isOnline
    };
    console.info('[Outbox] offline-first layer ready — queue at localStorage["' + KEY + '"]');
})();
