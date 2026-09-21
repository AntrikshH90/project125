/* ============================================================
   EMERGENCY MITRA - HANDSHAKE: ADMIN DECISIONS (js/admin-handshake.js)
   ============================================================
   Duty-officer side of the Pre-Arrival Handshake.

   - Renders incoming handshake requests in the Command Center
     ("Pre-Arrival Handshake" dash tab) with a live ETA countdown
   - The officer ACKNOWLEDGES (reserve bed, notify citizen) or
     DECLINES (auto-reroute) — the decision is written through
     js/handshake.js so the citizen's screen updates instantly,
     even on another device/tab
   - Updates the Overview KPI card + pending badge on the tab

   ADMIN-ONLY: loaded exclusively by admin.html after admin.js
   (needs showToast + AdminAuth for the officer signature).
   ============================================================ */

(function () {
    'use strict';

    var $ = function (id) { return document.getElementById(id); };
    var TIMER = null;

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g,
            function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
    }

    function toast(msg, icon) {
        if (typeof window.showToast === 'function') window.showToast(msg, icon || 'info');
        else console.log('[AdminHandshake] ' + msg);
    }

    function officerName() {
        try { return (window.AdminAuth && AdminAuth.currentUser()) || 'officer'; }
        catch (e) { return 'officer'; }
    }

    /* ============================================================
       REQUEST CARD
       ============================================================ */
    function cardHtml(r) {
        var left = window.HandshakeStore.remainingMin(r);
        var pending = r.status === 'PENDING';

        var statusBadge = pending
            ? '<span class="dash-badge yellow">⏳ PENDING — ACTION NEEDED</span>'
            : (r.status === 'ACK'
                ? '<span class="dash-badge green">✓ ACKNOWLEDGED</span>'
                : '<span class="dash-badge red">✗ DECLINED → REROUTED</span>');

        var meta =
            '<div class="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-2 text-xs">' +
                '<div class="bg-surface-container p-2 rounded-lg"><span class="text-on-surface-variant block text-[10px] uppercase font-bold">Patient</span><b>' + esc(r.patient) + '</b></div>' +
                '<div class="bg-surface-container p-2 rounded-lg"><span class="text-on-surface-variant block text-[10px] uppercase font-bold">Trust</span><b>🛡 ' + r.trust + ' · ' + esc(r.tier) + '</b></div>' +
                '<div class="bg-surface-container p-2 rounded-lg"><span class="text-on-surface-variant block text-[10px] uppercase font-bold">Bed required</span><b>#' + esc(r.bed) + ' (' + esc(r.bedType) + ')</b></div>' +
                '<div class="bg-surface-container p-2 rounded-lg"><span class="text-on-surface-variant block text-[10px] uppercase font-bold">Antivenom</span><b>' + esc(r.antivenom) + '</b></div>' +
            '</div>';

        var eta = pending
            ? '<div class="flex items-center gap-1.5 text-xs font-bold text-amber-700 mt-2">' +
                '<span class="material-symbols-outlined text-[16px] animate-pulse">schedule</span>' +
                'Ambulance incoming — ETA <b>' + left + '</b> min. Decide before arrival to guarantee the bed.</div>'
            : '<div class="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant mt-2">' +
                '<span class="material-symbols-outlined text-[16px]">' + (r.status === 'ACK' ? 'task_alt' : 'alt_route') + '</span>' +
                (r.status === 'ACK'
                    ? 'Bed reserved & citizen auto-notified • decided by <b>' + esc(r.decidedBy) + '</b>'
                    : 'Case rerouted to <b>' + esc(r.rerouteTo) + '</b> • decided by <b>' + esc(r.decidedBy) + '</b>') +
                '</div>';

        var actions = pending
            ? '<div class="flex gap-2 mt-3 flex-wrap">' +
                '<button onclick="AdminHandshake.decide(\'' + r.id + '\', true)" ' +
                'class="flex-1 min-w-[190px] bg-primary text-on-primary py-2.5 rounded-lg font-bold text-sm hover:bg-primary-container transition-colors flex items-center justify-center gap-2">' +
                '<span class="material-symbols-outlined text-[18px]">task_alt</span>Acknowledge &amp; Reserve Bed #' + esc(r.bed) + '</button>' +
                '<button onclick="AdminHandshake.decide(\'' + r.id + '\', false)" ' +
                'class="flex-1 min-w-[190px] bg-error text-on-error py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">' +
                '<span class="material-symbols-outlined text-[18px]">alt_route</span>Decline &amp; Reroute</button></div>'
            : '<div class="flex justify-end mt-2">' +
                '<button onclick="AdminHandshake.replay(\'' + r.id + '\')" ' +
                'class="border border-outline-variant px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-surface-container-high transition-colors">↻ Replay</button></div>';

        return '<div class="bg-white rounded-xl border ' + (pending ? 'border-2 border-amber-400 shadow-sm' : 'border-outline-variant') + ' p-4">' +
            '<div class="flex justify-between items-start flex-wrap gap-2">' +
                '<div class="flex items-center gap-3">' +
                    '<div class="' + (pending ? 'bg-amber-500/10 text-amber-700' : 'bg-primary-container text-on-primary-container') + ' p-2.5 rounded-xl">' +
                        '<span class="material-symbols-outlined">handshake</span></div>' +
                    '<div>' +
                        '<div class="font-bold text-on-surface leading-tight">' + esc(r.caseType) + ' <span class="font-mono text-xs text-primary">(' + esc(r.id) + ')</span></div>' +
                        '<div class="text-xs text-on-surface-variant">Requested: <b>' + esc(r.hospital) + '</b> • Filed ' + new Date(r.createdAt).toLocaleTimeString() + '</div>' +
                    '</div>' +
                '</div>' +
                statusBadge +
            '</div>' +
            meta + eta + actions +
            '</div>';
    }

    /* ============================================================
       RENDER
       ============================================================ */
    function render() {
        var store = window.HandshakeStore;
        var queue = $('hs-admin-queue');
        if (!store || !queue) return;

        var list = store.list();

        /* KPI card + tab badge */
        var kpi = $('stat-handshakes');
        if (kpi) {
            var pendingN = store.pendingCount();
            kpi.innerHTML = store.count() +
                ' <span class="text-sm font-normal text-on-surface-variant">/ live</span>';
            var kpiNote = kpi.parentNode && kpi.parentNode.querySelector('.text-\\[11px\\]');
            if (kpiNote) {
                kpiNote.textContent = pendingN ? (pendingN + ' awaiting decision') : 'All handled';
                kpiNote.className = pendingN
                    ? 'text-[11px] text-amber-700 font-bold flex items-center gap-0.5'
                    : 'text-[11px] text-[#166534] font-bold flex items-center gap-0.5';
            }
        }
        var tabBadge = $('hs-pending-badge');
        if (tabBadge) {
            var p = store.pendingCount();
            tabBadge.textContent = p + ' New';
            tabBadge.className = 'dash-badge ml-1 ' + (p ? 'red' : 'green');
        }
        var pc = $('hs-panel-pending-count'), ac = $('hs-panel-ack-count'), dc = $('hs-panel-declined-count');
        if (pc) pc.textContent = store.pendingCount() + ' PENDING';
        if (ac) ac.textContent = list.filter(function (r) { return r.status === 'ACK'; }).length + ' ACK';
        if (dc) dc.textContent = list.filter(function (r) { return r.status === 'DECLINED'; }).length + ' REROUTED';

        if (!list.length) {
            queue.innerHTML =
                '<div class="bg-white rounded-xl border-2 border-dashed border-outline-variant p-10 text-center text-on-surface-variant">' +
                    '<span class="material-symbols-outlined" style="font-size:44px;color:#c4d2cc">handshake</span>' +
                    '<div class="font-bold mt-2 text-on-surface">No incoming handshakes</div>' +
                    '<div class="text-xs mt-1">Citizen pre-arrival requests will land here in real time. Use “Simulate Incoming” to test the flow.</div></div>';
            return;
        }

        /* PENDING first (most urgent on top), then newest first */
        list.sort(function (a, b) {
            var rank = function (s) { return s === 'PENDING' ? 0 : 1; };
            return rank(a.status) - rank(b.status) || (b.createdAt - a.createdAt);
        });

        queue.innerHTML = list.map(cardHtml).join('');
    }

    /* ============================================================
       PUBLIC ACTIONS (inline onclick)
       ============================================================ */
    window.AdminHandshake = {
        decide: function (id, ok) {
            var r = window.HandshakeStore.decide(id, ok, officerName());
            if (!r) return;
            toast(ok
                ? 'Handshake ' + r.id + ' ACKNOWLEDGED — bed #' + r.bed + ' reserved, citizen auto-notified'
                : 'Handshake ' + r.id + ' DECLINED — case rerouted to ' + r.rerouteTo,
                ok ? 'task_alt' : 'alt_route');
            render();
        },
        replay: function (id) {
            window.HandshakeStore.reset(id);
            render();
            toast('Request ' + id + ' replayed — back to PENDING', 'restart_alt');
        },
        simulate: function () {
            var cases = [
                { caseType: 'Snakebite Case 🐍', patient: 'Ramesh Pawar (42/M)', bed: '4', bedType: 'ICU', etaMin: 12, trust: 91, tier: 'HIGH', antivenom: '4 vials polyvalent' },
                { caseType: 'RTA — Head Trauma', patient: 'Sunita Kale (29/F)', bed: '7', bedType: 'Trauma Bay', etaMin: 9, trust: 74, tier: 'MEDIUM', antivenom: '—' },
                { caseType: 'Cardiac Emergency', patient: 'Mohan Ingle (58/M)', bed: '2', bedType: 'CCU', etaMin: 15, trust: 88, tier: 'HIGH', antivenom: '—' }
            ];
            var pick = cases[Math.floor(Math.random() * cases.length)];
            var r = window.HandshakeStore.create(pick);
            render();
            toast('Incoming handshake ' + r.id + ' — ' + r.caseType + ' (' + r.etaMin + ' min)', 'handshake');
        },
        render: render
    };

    /* ============================================================
       BOOT
       ============================================================ */
    document.addEventListener('DOMContentLoaded', function () {
        /* seed one demo request so the queue is never empty for judges */
        if (window.HandshakeStore && window.HandshakeStore.count() === 0) {
            window.HandshakeStore.create({
                hospital: 'District Hospital Wardha', caseType: 'Snakebite Case 🐍',
                patient: 'Ramesh Pawar (42/M)', bed: '4', bedType: 'ICU',
                etaMin: 12, trust: 91, tier: 'HIGH', antivenom: '4 vials polyvalent'
            });
        }
        render();
    });

    /* refresh whenever the store changes (this page or citizen page) */
    window.addEventListener('em:handshake-changed', render);
    /* language switch: cards re-render, then the i18n walker translates */
    window.addEventListener('em:language-changed', render);
    window.addEventListener('storage', function (e) {
        if (e.key === 'em_handshake_v1') render();
    });

    /* live ETA countdown while requests are pending */
    TIMER = setInterval(function () {
        var pending = window.HandshakeStore && HandshakeStore.pendingCount() > 0;
        var panel = $('dash-panel-handshake');
        if (pending && panel && panel.classList.contains('active')) render();
    }, 15000);

    /* piggyback on every dashboard render so KPI/badge stay fresh */
    if (typeof window.renderDashboard === 'function') {
        var prevRender = window.renderDashboard;
        window.renderDashboard = function () {
            var r = prevRender.apply(this, arguments);
            try { render(); } catch (e) { /* never break the dashboard */ }
            return r;
        };
    }
})();
