/* ============================================================
   EMERGENCY MITRA - ADVANCED EMERGENCY NETWORK CARDS
   (js/network-cards.js)
   ============================================================
   Makes the 6 "Explore" cards FULLY FUNCTIONAL instead of
   static showpieces:

     1. Pre-Arrival Handshake  -> citizen status view (hospital
        response + ready facilities live; the ACK/DECIDE buttons
        live on the admin Command Center, not here) + ETA countdown
     2. AI Preliminary Triage  -> interactive symptom engine with on-device scoring
     3. Ambulance Dispatch     -> nearest-unit selection (haversine) + live ETA animation
     4. Resource Inventory     -> editable stock with auto status + persistence
     5. Audio-First IVR        -> real TTS-driven call simulator that files a case
     6. Offline Passport       -> renders the SIGNED-IN citizen's real medical ID

   Zero dependencies. Loads after outbox.js.
   ============================================================ */
(function () {
    'use strict';

    /* ---------------- shared helpers ---------------- */
    function $(id) { return document.getElementById(id); }
    function toast(msg, icon) {
        if (typeof showToast === 'function') showToast(msg, icon || 'info');
        else console.log('[Network] ' + msg);
    }
    function haversineKm(a, b) {
        var R = 6371, rad = Math.PI / 180;
        var dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
        var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a.lat * rad) * Math.cos(b.lat * rad) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * R * Math.asin(Math.sqrt(h));
    }
    function speak(text, lang) {
        if (!('speechSynthesis' in window)) return;
        var u = new SpeechSynthesisUtterance(text);
        u.lang = lang || ((window.currentLang === 'hi') ? 'hi-IN' : (window.currentLang === 'mr') ? 'mr-IN' : 'en-IN');
        u.rate = 0.98;
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
    }

    /* ============================================================
       1. PRE-ARRIVAL HANDSHAKE — CITIZEN VIEW (read-only status)
       ------------------------------------------------------------
       The citizen SENDS the request and watches the response live.
       The ACKNOWLEDGE / DECLINE decision belongs to the duty
       officer (admin.html -> Pre-Arrival Handshake panel) and is
       written via js/handshake.js (localStorage bus) — this view
       refreshes automatically the moment the decision lands,
       even across pages and tabs. Citizens get status + readiness
       only; no decision buttons.
       ============================================================ */
    var HS_STATE = null, HS_TIMER = null;

    function hsRow(icon, label, ok, note) {
        return '<div class="bg-surface p-sm rounded-lg border border-outline-variant flex justify-between items-center text-sm">' +
            '<span class="flex items-center gap-2">' +
            '<span class="material-symbols-outlined" style="font-size:18px;color:' + (ok ? '#16a34a' : '#9aa8a2') + '">' + icon + '</span>' +
            label + '</span>' +
            '<span class="px-2 py-1 rounded-lg text-xs font-bold text-white" style="background:' + (ok ? '#16a34a' : '#e5e7eb') + ';">' + note + '</span></div>';
    }

    function hsRender() {
        var el = $('handshake-body');
        if (!el || !HS_STATE) return;
        var r = window.HandshakeStore ? HandshakeStore.get(HS_STATE) : null;
        if (!r) {
            el.innerHTML = '<div class="p-md rounded-lg text-sm text-on-surface-variant">Request no longer available.</div>';
            return;
        }
        var left = window.HandshakeStore.remainingMin(r);
        var ackColor = r.status === 'ACK' ? '#16a34a' : (r.status === 'DECLINED' ? '#ba1a1a' : '#d97706');
        var statusLabel = r.status === 'ACK' ? 'ACKNOWLEDGED' : (r.status === 'DECLINED' ? 'REROUTED' : 'AWAITING HOSPITAL…');

        el.innerHTML =
            '<div class="bg-surface-container p-md rounded-lg border border-outline-variant">' +
                '<div class="flex items-center justify-between flex-wrap gap-2 mb-3">' +
                    '<h4 class="font-bold">Pre-Arrival Request — ' + r.hospital + '</h4>' +
                    '<span class="material-symbols-outlined ' + (r.status === 'PENDING' ? 'text-primary animate-pulse' : 'text-on-surface-variant') + '">sensors</span>' +
                '</div>' +
                '<div class="space-y-3">' +
                    '<div class="flex items-center gap-3">' +
                        '<div class="w-2 h-2 rounded-lg bg-error animate-pulse"></div>' +
                        '<span class="font-medium text-error">' + r.caseType + ' — <b id="hs-eta">' + left + ' min ETA</b></span></div>' +
                    '<div class="bg-surface p-sm rounded-lg border border-outline-variant flex justify-between items-center text-sm">' +
                        '<span>Hospital response:</span>' +
                        '<span class="px-2 py-1 rounded-lg text-xs font-bold text-white" style="background:' + ackColor + ';">' + statusLabel + '</span></div>' +
                    hsRow('bed', 'Bed #' + r.bed + ' (' + r.bedType + ')', r.status === 'ACK', r.status === 'ACK' ? 'RESERVED' : 'WAITING') +
                    hsRow('medical_services', 'Medical Officer', r.status === 'ACK', r.status === 'ACK' ? 'NOTIFIED' : 'PENDING') +
                    hsRow('medication', 'Antivenom / critical supplies', r.status === 'ACK', r.status === 'ACK' ? r.antivenom : 'STANDBY') +
                    '<div class="bg-surface p-sm rounded-lg border border-outline-variant text-sm">' +
                        '<div class="flex justify-between"><span>Patient</span><b>' + r.patient + '</b></div>' +
                        '<div class="flex justify-between"><span>Trust score</span><b>🛡 ' + r.trust + ' · ' + r.tier + '</b></div>' +
                        '<div class="flex justify-between"><span>Antivenom requirement</span><b>' + r.antivenom + '</b></div></div>' +
                '</div>' +
                (r.status === 'PENDING'
                    ? '<div class="mt-4 p-sm rounded-lg text-sm font-semibold" style="background:#fff7ed;color:#9a3412;">' +
                        '📡 Request sent to the duty officer. The hospital will acknowledge shortly — this screen updates by itself. For any emergency call 108.</div>'
                    : r.status === 'ACK'
                        ? '<div class="mt-4 p-sm rounded-lg text-sm font-semibold" style="background:#f0fdf4;color:#166534;">' +
                            '✓ ' + r.hospital + ' accepted — bed #' + r.bed + ' (' + r.bedType + ') reserved for this case, medical team on standby.</div>'
                        : '<div class="mt-4 p-sm rounded-lg text-sm font-semibold" style="background:#fdecec;color:#7f1d1d;">' +
                            '✗ ' + r.hospital + ' at capacity — case auto-rerouted to <b>' + r.rerouteTo + '</b> (nearest capable, 8.1 km). New facility is being notified.</div>') +
                '<button onclick="Network.handshakeReset()" class="w-full mt-3 border border-outline-variant py-2 rounded-lg font-bold text-sm hover:bg-surface-variant">↻ Replay simulation</button>' +
            '</div>';
    }

    function hsOpen() {
        /* Reopen the citizen's most recent request if it's still live
           (PENDING/ACK) so an officer's decision is never missed;
           only a DECLINED (or fresh) visit starts a new request. */
        var req = null;
        if (window.HandshakeStore) {
            var list = HandshakeStore.list();
            for (var i = 0; i < list.length; i++) {
                if (list[i].status === 'PENDING' || list[i].status === 'ACK') { req = list[i]; break; }
            }
            if (!req) {
                req = HandshakeStore.create({
                    hospital: 'District Hospital Wardha', caseType: 'Snakebite Case 🐍',
                    patient: 'Ramesh Pawar (42/M)', bed: '4', bedType: 'ICU',
                    etaMin: 12, trust: 91, tier: 'HIGH', antivenom: '4 vials polyvalent'
                });
            }
        }
        if (!req) { toast('Handshake store unavailable', 'error'); return; }
        HS_STATE = req.id;
        if (HS_TIMER) clearInterval(HS_TIMER);
        HS_TIMER = setInterval(function () {
            var m = $('modal-handshake');
            if (!m || !m.classList.contains('show')) return;   // idle when closed
            hsRender();
        }, 20000);
        hsRender();
        openModal('modal-handshake');
        speak('Pre-arrival request sent to District Hospital Wardha. You will see the hospital response here.');
    }
    /* ACKNOWLEDGE / DECLINE deliberately NOT offered to citizens —
       the duty officer decides (admin.html). hsAck survives only as
       a legacy API bridge into the handshake store. */
    function hsAck(ok) {
        if (!HS_STATE || !window.HandshakeStore) return;
        HandshakeStore.decide(HS_STATE, ok, 'Legacy bridge');
        hsRender();
    }
    function hsReset() {
        if (!HS_STATE) { hsOpen(); return; }
        if (window.HandshakeStore) HandshakeStore.reset(HS_STATE);
        hsRender();
    }
    /* Live refresh the instant the officer decides (cross-page) */
    window.addEventListener('em:handshake-changed', function () {
        var m = $('modal-handshake');
        if (HS_STATE && m && m.classList.contains('show')) hsRender();
    });
    /* Language switch: status labels + banners re-render, then the
       translation walker covers interpolated text */
    window.addEventListener('em:language-changed', function () {
        var m = $('modal-handshake');
        if (HS_STATE && m && m.classList.contains('show')) hsRender();
    });

    /* ============================================================
       2. AI PRELIMINARY TRIAGE — interactive on-device symptom engine
       ============================================================ */
    var AI_SYMPTOMS = [
        { id: 'chest', label: 'Chest pain radiating to left arm', w: 40, tag: 'Cardiac' },
        { id: 'breath', label: 'Shortness of breath', w: 30, tag: 'Respiratory' },
        { id: 'unconscious', label: 'Unconscious / unresponsive', w: 45, tag: 'Neuro' },
        { id: 'bleed', label: 'Severe uncontrolled bleeding', w: 38, tag: 'Trauma' },
        { id: 'snake', label: 'Snakebite (fang marks visible)', w: 42, tag: 'Toxicology' },
        { id: 'seizure', label: 'Active seizure / convulsions', w: 35, tag: 'Neuro' },
        { id: 'burn', label: 'Major burns (>20% body)', w: 32, tag: 'Burns' },
        { id: 'vomit', label: 'Persistent vomiting', w: 15, tag: 'Gastro' },
        { id: 'fever', label: 'High fever (102°F+)', w: 12, tag: 'Infection' },
        { id: 'fracture', label: 'Suspected fracture / deformity', w: 18, tag: 'Ortho' }
    ];
    var AI_PICKED = [];

    function aiRender() {
        var el = $('ai-triage-body');
        if (!el) return;
        var chips = AI_SYMPTOMS.map(function (s) {
            var on = AI_PICKED.indexOf(s.id) >= 0;
            return '<button onclick="Network.aiToggle(\'' + s.id + '\')" style="' + (on
                ? 'background:#00453d;color:#fff;border-color:#00453d;'
                : 'background:#fff;color:#37493f;') +
                'border:1.5px solid #cfd8d5;border-radius:999px;padding:7px 12px;font-size:12.5px;font-weight:600;cursor:pointer;">' +
                (on ? '✓ ' : '') + s.label + '</button>';
        }).join('');

        var result = '';
        if (AI_PICKED.length) {
            var score = 0, tags = [];
            AI_PICKED.forEach(function (id) {
                var s = AI_SYMPTOMS.find(function (x) { return x.id === id; });
                score += s.w; tags.push(s.tag);
            });
            var prio = score >= 70 ? ['CRITICAL', '#ba1a1a', 'Level 1'] :
                (score >= 35 ? ['URGENT', '#d97706', 'Level 2'] : ['STABLE', '#16a34a', 'Level 3']);
            var fac = tags.indexOf('Cardiac') >= 0 ? 'District Hospital Wardha (cardiac-capable, 4.2 km)' :
                tags.indexOf('Toxicology') >= 0 ? 'District Hospital Wardha (antivenom in stock, 4.2 km)' :
                tags.indexOf('Burns') >= 0 ? 'SDH Hinganghat (burn unit, 21 km)' :
                'Rural Hospital Sevagram (8.1 km)';
            result =
                '<div class="mt-4 p-md rounded-lg" style="border-left:4px solid ' + prio[1] + ';background:#fafcfa;">' +
                    '<p class="font-bold" style="color:' + prio[1] + ';">Priority: ' + prio[0] + ' (' + prio[2] + ') — score ' + score + '</p>' +
                    '<p class="text-sm mt-1 text-on-surface-variant">Systems involved: <b>' + (tags.join(', ') || '—') + '</b></p>' +
                    '<p class="text-sm mt-1">Recommendation: dispatch ' + (prio[0] === 'CRITICAL' ? 'ALS' : 'BLS') +
                        ' ambulance → <b>' + fac + '</b></p>' +
                    '<p class="text-[11px] text-on-surface-variant mt-2">On-device rule engine — works offline. AI supports, never replaces, clinical judgment.</p>' +
                '</div>' +
                '<button onclick="Network.aiFile()" class="w-full mt-3 bg-primary text-on-primary py-3 rounded-lg font-bold hover:bg-primary-container">File as case → Command Center</button>';
        } else {
            result = '<p class="text-sm text-on-surface-variant mt-4">Select the symptoms you can observe — the engine scores priority instantly.</p>';
        }
        el.innerHTML =
            '<div class="flex flex-wrap gap-2 mb-2">' + chips + '</div>' +
            '<div class="flex justify-between items-center"><span class="text-xs text-on-surface-variant">' + AI_PICKED.length + ' symptoms selected</span>' +
            '<button onclick="Network.aiClear()" class="text-xs font-bold text-primary hover:underline">Clear all</button></div>' + result;
    }
    function aiOpen() { AI_PICKED = []; aiRender(); openModal('modal-triage'); }
    function aiToggle(id) {
        var i = AI_PICKED.indexOf(id);
        if (i >= 0) AI_PICKED.splice(i, 1); else AI_PICKED.push(id);
        aiRender();
    }
    function aiClear() { AI_PICKED = []; aiRender(); }
    function aiFile() {
        if (typeof adminCases === 'undefined') { toast('Dashboard unavailable', 'error'); return; }
        var score = 0, tags = [];
        AI_PICKED.forEach(function (id) {
            var s = AI_SYMPTOMS.find(function (x) { return x.id === id; });
            score += s.w; tags.push(s.tag);
        });
        var prio = score >= 70 ? 'CRITICAL' : (score >= 35 ? 'URGENT' : 'STABLE');
        var trust = prio === 'CRITICAL' ? 88 : (prio === 'URGENT' ? 58 : 34);
        adminCases.unshift({
            id: 'EM-' + Math.floor(1000 + Math.random() * 9000),
            time: 'Just now', patient: 'AI Triage Referral', age: '— / —',
            type: 'AI Preliminary: ' + (tags.join('+') || 'General'),
            priority: prio, hospital: prio === 'CRITICAL' ? 'District Hospital Wardha' : 'Nearest capable',
            doctor: '—', status: prio === 'CRITICAL' ? 'En Route' : 'Verifying',
            eta: prio === 'CRITICAL' ? '12 mins' : 'Hold', vitals: 'AI-assessed pre-arrival',
            trustScore: trust, trustTier: prio === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
            trustNote: 'On-device AI symptom engine'
        });
        if (typeof renderDashboard === 'function') renderDashboard();
        toast('Case filed to Command Center — ' + prio, 'psychology');
        closeModal('modal-triage');
    }

    /* ============================================================
       3. AMBULANCE DISPATCH — nearest-unit selection + live animation
       ============================================================ */
    var FLEET = [
        { id: 'MH-31-EM-102', type: 'ALS', lat: 20.7350, lng: 78.5850, crew: 'Pilot: S. Wagh • Paramedic: 2' },
        { id: 'MH-31-EM-108', type: 'ALS', lat: 20.5610, lng: 78.5330, crew: 'Pilot: D. Kale • Paramedic: 1' },
        { id: 'MH-31-BLS-207', type: 'BLS', lat: 20.7500, lng: 78.6100, crew: 'Pilot: R. More • Attendant: 1' },
        { id: 'MH-31-BLS-311', type: 'BLS', lat: 20.7800, lng: 78.4550, crew: 'Pilot: A. Nikam • Attendant: 1' }
    ];
    var PT_LOC = { lat: 20.7452, lng: 78.6020 };   // Wardha center
    var HOSP_LOC = { lat: 20.7450, lng: 78.6030 };
    var DP_TIMER = null;

    function dpOpen() {
        if (DP_TIMER) clearInterval(DP_TIMER);
        var el = $('dispatch-body');
        var units = FLEET.map(function (a) {
            var d = haversineKm(PT_LOC, a).toFixed(1);
            return { a: a, d: d };
        }).sort(function (x, y) { return x.d - y.d; });
        var best = units[0];

        el.innerHTML =
            '<div class="bg-surface-container rounded-lg border border-outline-variant p-md mb-3">' +
                '<div class="flex justify-between items-center flex-wrap gap-2 mb-2">' +
                    '<h4 class="font-bold">Patient location: Wardha Rural (20.745, 78.602)</h4>' +
                    '<span class="bg-primary text-on-primary px-2 py-1 rounded-lg text-xs font-bold">GPS LOCKED</span></div>' +
                '<div class="text-xs text-on-surface-variant mb-3">4 network units online — engine picks the NEAREST capable unit (not just any):</div>' +
                units.map(function (u) {
                    var isBest = u.a.id === best.a.id;
                    return '<div class="flex justify-between items-center text-sm bg-surface p-sm rounded-lg border mb-2 ' + (isBest ? 'border-primary' : 'border-outline-variant') + '">' +
                        '<span><b>' + u.a.id + '</b> · ' + u.a.type + ' · ' + u.a.crew + '</span>' +
                        '<span class="font-bold ' + (isBest ? 'text-primary' : 'text-on-surface-variant') + '">' + u.d + ' km' + (isBest ? ' ★ SELECTED' : '') + '</span></div>';
                }).join('') +
            '</div>' +
            '<div id="dp-stage"></div>';

        $('dp-stage').innerHTML =
            '<div class="bg-surface-container h-48 lg:h-56 rounded-lg border border-outline-variant relative overflow-hidden flex flex-col items-center justify-center text-on-surface-variant">' +
                '<div class="flex items-center justify-between w-full px-4 lg:px-12 relative z-10">' +
                    '<div class="flex flex-col items-center"><span class="material-symbols-outlined text-[32px] text-error">person_pin_circle</span><span class="font-bold text-xs mt-2">Patient</span></div>' +
                    '<div class="flex-grow border-t-2 border-dashed border-primary mx-4 relative">' +
                        '<span id="dp-truck" class="material-symbols-outlined text-[28px] text-primary absolute top-1/2 transform -translate-y-1/2 bg-surface-container px-1" style="left:0; transition:left 8s linear;">ambulance</span></div>' +
                    '<div class="flex flex-col items-center"><span class="material-symbols-outlined text-[32px] text-primary">local_hospital</span><span class="font-bold text-xs mt-2">DH Wardha</span></div>' +
                '</div>' +
                '<p id="dp-status" class="mt-6 font-medium text-sm text-center px-4">Unit ' + best.a.id + ' (' + best.a.type + ', ' + best.d + ' km away) — dispatching…</p>' +
                '<p id="dp-eta" class="text-2xl font-black text-primary mt-1">ETA ' + Math.max(4, Math.round(best.d * 2.2)) + ' min</p>' +
            '</div>' +
            '<button onclick="Network.dispatchReset()" class="w-full mt-3 border border-outline-variant py-2 rounded-lg font-bold text-sm hover:bg-surface-variant">↻ Re-run dispatch engine</button>';

        openModal('modal-ambulance');
        speak('Dispatching nearest available unit ' + best.a.id + '. Estimated arrival ' + Math.max(4, Math.round(best.d * 2.2)) + ' minutes.');

        var eta = Math.max(4, Math.round(best.d * 2.2)), left = eta;
        DP_TIMER = setInterval(function () {
            var truck = $('dp-truck'), st = $('dp-status'), et = $('dp-eta');
            if (truck && truck.style.left === '') truck.style.left = '0%';
            if (truck) truck.style.left = '92%';
            left--;
            if (left <= 0) {
                clearInterval(DP_TIMER);
                if (st) st.innerHTML = '✅ Unit ' + best.a.id + ' arrived — patient handover in progress';
                if (et) et.textContent = 'ARRIVED';
            } else if (et) et.textContent = 'ETA ' + left + ' min';
        }, 3000);
    }

    /* ============================================================
       4. RESOURCE INVENTORY — editable stock, auto status, persistence
       ============================================================ */
    var INV_FAC = ['District Hospital Wardha', 'Rural Hospital Sevagram', 'SDH Hinganghat', 'PHC Deoli'];
    var INV_ITEMS = [
        { id: 'antivenom', label: 'Polyvalent Antivenom', unit: 'vials', icon: 'medication', warn: 8, crit: 4, init: 24 },
        { id: 'icu', label: 'ICU Beds', unit: 'beds', icon: 'bed', warn: 2, crit: 1, init: 3 },
        { id: 'o2', label: 'Oxygen Cylinders (D)', unit: 'cyl', icon: 'air', warn: 6, crit: 3, init: 15 },
        { id: 'blood', label: 'Blood Units (O+)', unit: 'units', icon: 'bloodtype', warn: 4, crit: 2, init: 9 }
    ];
    var INV_DATA = null, INV_CUR = 0;

    function invLoad() {
        try { INV_DATA = JSON.parse(localStorage.getItem('em_inventory')); } catch (e) { INV_DATA = null; }
        if (!INV_DATA || !INV_DATA[INV_FAC[0]]) {
            INV_DATA = {};
            INV_FAC.forEach(function (f) {
                INV_DATA[f] = {};
                INV_ITEMS.forEach(function (i) { INV_DATA[f][i.id] = i.init; });
            });
        }
    }
    function invSave() { try { localStorage.setItem('em_inventory', JSON.stringify(INV_DATA)); } catch (e) { /* */ } }

    function invRender() {
        var el = $('inventory-body');
        if (!el) return;
        var fac = INV_FAC[INV_CUR];
        var rows = INV_ITEMS.map(function (i) {
            var q = INV_DATA[fac][i.id];
            var badge = q <= i.crit ? ['CRITICAL', '#ba1a1a', '#fdeeee'] : (q <= i.warn ? ['LIMITED', '#d97706', '#fdf6e4'] : ['ADEQUATE', '#16a34a', '#f0fdf4']);
            return '<tr>' +
                '<td class="p-2 font-medium flex items-center gap-2 text-sm"><span class="material-symbols-outlined text-[18px] text-primary">' + i.icon + '</span>' + i.label + '</td>' +
                '<td class="p-2">' +
                    '<div style="display:inline-flex;align-items:center;gap:6px;">' +
                        '<button onclick="Network.invAdj(\'' + i.id + '\',-1)" style="width:26px;height:26px;border-radius:8px;border:1px solid #cfd8d5;background:#fff;font-weight:800;cursor:pointer;">−</button>' +
                        '<b style="min-width:52px;text-align:center;">' + q + ' ' + i.unit + '</b>' +
                        '<button onclick="Network.invAdj(\'' + i.id + '\',1)" style="width:26px;height:26px;border-radius:8px;border:1px solid #cfd8d5;background:#fff;font-weight:800;cursor:pointer;">+</button>' +
                    '</div></td>' +
                '<td class="p-2"><span class="px-2 py-1 rounded-lg text-[10px] font-bold" style="background:' + badge[2] + ';color:' + badge[1] + ';">' + badge[0] + '</span></td>' +
                '</tr>';
        }).join('');
        el.innerHTML =
            '<div class="mb-3 flex flex-wrap items-center gap-2">' +
                '<b class="text-sm">Facility:</b>' +
                '<select onchange="Network.invFac(parseInt(this.value))" class="border border-outline-variant rounded-lg px-2 py-2 text-sm">' +
                    INV_FAC.map(function (f, i) { return '<option value="' + i + '"' + (i === INV_CUR ? ' selected' : '') + '>' + f + '</option>'; }).join('') +
                '</select>' +
                '<button onclick="Network.invReset()" class="text-xs font-bold text-primary hover:underline ml-auto">Reset stock</button>' +
            '</div>' +
            '<div class="bg-surface-container rounded-lg border border-outline-variant overflow-x-auto">' +
                '<table class="w-full text-left min-w-[420px]"><thead class="bg-surface-variant text-on-surface-variant text-xs lg:text-sm">' +
                '<tr><th class="p-2 font-bold">Resource</th><th class="p-2 font-bold">Live Quantity</th><th class="p-2 font-bold">Status</th></tr>' +
                '</thead><tbody class="divide-y divide-outline-variant text-sm">' + rows + '</tbody></table></div>' +
                '<p class="text-[11px] text-on-surface-variant mt-2">Edits persist on-device and flow into dashboard / map badges. Low stock auto-flags CRITICAL for restock alerts.</p>';
    }
    function invOpen() { invLoad(); invRender(); openModal('modal-inventory'); }
    function invAdj(id, delta) {
        var fac = INV_FAC[INV_CUR];
        INV_DATA[fac][id] = Math.max(0, INV_DATA[fac][id] + delta);
        invSave(); invRender();
        var it = INV_ITEMS.find(function (x) { return x.id === id; });
        if (INV_DATA[fac][id] <= it.crit && delta < 0) toast(id.toUpperCase() + ' CRITICAL at ' + fac + ' — restock alert raised', 'warning');
    }
    function invFac(i) { INV_CUR = i; invRender(); }
    function invReset() { invLoad(); try { localStorage.removeItem('em_inventory'); } catch (e) { /* */ } invLoad(); invRender(); toast('Stock reset to baseline', 'restart_alt'); }

    /* ============================================================
       5. AUDIO-FIRST IVR — real TTS call simulator that FILES a case
       ============================================================ */
    var IVR_STEP = 0, IVR_LANG = null, IVR_TYPE = null;
    var IVR_TYPES = ['Animal Bite', 'Accident / Trauma', 'Chemical Exposure', 'Cardiac / Chest'];

    function ivrSpeakStep() {
        if (IVR_STEP === 0) speak('Welcome to Emergency Mitra IVR. For English press 1. हिंदी के लिए 2 दबाएं। मराठीसाठी 3 दबावा. For other languages press 4.');
        else if (IVR_STEP === 1) speak('Select emergency type. Press 1 for animal bite, 2 for accident, 3 for chemical exposure, 4 for cardiac emergency.');
        else if (IVR_STEP === 2) speak('Thank you. Your emergency has been registered and the nearest ambulance is being dispatched. A confirmation SMS has been sent.');
    }
    function ivrRender() {
        var el = $('ivr-body');
        if (!el) return;
        var step = '';
        if (IVR_STEP === 0) {
            step = '<p class="font-medium text-base lg:text-lg mb-6">"Welcome to Emergency Mitra IVR — please select your language" 🔊</p>' +
                '<div class="grid grid-cols-2 gap-3 w-full max-w-md">' +
                ['1|English', '2|हिंदी', '3|मराठी', '4|Others'].map(function (x) {
                    var p = x.split('|');
                    return '<button onclick="Network.ivrPress(' + p[0] + ')" class="bg-surface border border-outline-variant py-3 rounded-lg font-bold hover:bg-surface-variant flex flex-col items-center min-h-[48px]"><span class="text-lg">' + p[0] + '</span><span class="text-sm">' + p[1] + '</span></button>';
                }).join('') + '</div>';
        } else if (IVR_STEP === 1) {
            step = '<p class="font-medium text-base mb-4">Language: <b>' + IVR_LANG + '</b> — select emergency type 🔊</p>' +
                '<div class="grid grid-cols-2 gap-3 w-full max-w-md">' +
                IVR_TYPES.map(function (t, i) {
                    return '<button onclick="Network.ivrPress(' + (i + 1) + ')" class="bg-surface border border-outline-variant py-3 rounded-lg font-bold hover:bg-surface-variant flex flex-col items-center min-h-[48px]"><span class="text-lg">' + (i + 1) + '</span><span class="text-sm">' + t + '</span></button>';
                }).join('') + '</div>';
        } else {
            step = '<div class="text-center py-4">' +
                '<span class="material-symbols-outlined text-[48px] text-primary">task_alt</span>' +
                '<p class="font-bold text-lg mt-2">Case Registered: ' + IVR_TYPE + '</p>' +
                '<p class="text-sm text-on-surface-variant mt-1">Nearest ambulance dispatched • confirmation SMS sent • live in Command Center</p>' +
                '<button onclick="Network.ivrReset()" class="mt-4 border border-outline-variant px-4 py-2 rounded-lg font-bold text-sm hover:bg-surface-variant">↻ Call again</button></div>';
        }
        el.innerHTML =
            '<div class="bg-surface-container p-md rounded-lg border border-outline-variant flex flex-col items-center text-center">' +
                '<span class="material-symbols-outlined text-[36px] text-primary mb-3 ' + (IVR_STEP < 2 ? 'animate-pulse' : '') + '">' + (IVR_STEP < 2 ? 'volume_up' : 'call_end') + '</span>' + step +
            '</div>' +
            '<p class="text-[11px] text-on-surface-variant text-center mt-3">Keypad simulation of the production IVR (Exotel sandbox) — every prompt is spoken aloud via on-device TTS.</p>';
    }
    function ivrOpen() { IVR_STEP = 0; IVR_LANG = null; IVR_TYPE = null; ivrRender(); openModal('modal-ivr'); ivrSpeakStep(); }
    function ivrPress(n) {
        if (IVR_STEP === 0) { IVR_LANG = ['English', 'हिंदी', 'मराठी', 'Others'][n - 1]; IVR_STEP = 1; }
        else if (IVR_STEP === 1) {
            IVR_TYPE = IVR_TYPES[n - 1]; IVR_STEP = 2;
            if (typeof adminCases !== 'undefined') {
                adminCases.unshift({
                    id: 'EM-' + Math.floor(1000 + Math.random() * 9000),
                    time: 'Just now', patient: 'IVR Caller (feature phone)', age: '—',
                    type: '📞 IVR: ' + IVR_TYPE, priority: 'URGENT',
                    hospital: 'Nearest capable', doctor: '—', status: 'Verifying',
                    eta: 'IVR', vitals: 'Voice-only report via IVR keypad',
                    trustScore: 30, trustTier: 'MEDIUM', trustNote: 'IVR channel — call-back verification queued'
                });
                if (typeof renderDashboard === 'function') renderDashboard();
            }
        }
        ivrRender(); ivrSpeakStep();
    }
    function ivrReset() { IVR_STEP = 0; ivrRender(); ivrSpeakStep(); }

    /* ============================================================
       6. OFFLINE PASSPORT — renders the SIGNED-IN citizen's real ID
       ============================================================ */
    function ppOpen() {
        var el = $('passport-body');
        var a = (window.AccountAPI && window.AccountAPI.get) ? window.AccountAPI.get() : {};
        var has = a && a.name;
        var initials = has ? a.name.split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase() : 'RS';
        var abha = has && a.abha ? 'ABHA-' + String(a.abha).replace(/\D/g, '').slice(-4).padStart(4, '0') : (has ? 'P-ACCT-01' : 'ID: EM-1094-AB');
        el.innerHTML =
            '<div class="bg-[#f0f9ff] border-2 border-primary rounded-lg p-4 lg:p-6 flex flex-col sm:flex-row gap-4 items-center shadow-sm">' +
                '<div class="bg-white p-2 rounded-lg border border-outline-variant shrink-0 text-center">' +
                    '<div style="width:96px;height:96px;display:flex;align-items:center;justify-content:center;background:#00453d;color:#fff;border-radius:12px;font-size:30px;font-weight:900;">' + initials + '</div>' +
                    '<div class="text-[10px] font-bold text-on-surface-variant mt-1">SCAN AT DESK</div></div>' +
                '<div class="flex-grow text-left w-full">' +
                    '<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 border-b border-primary/20 pb-2 gap-2">' +
                        '<div><h4 class="text-lg font-bold">' + (has ? a.name : 'Rahul Sharma <span class="text-xs font-normal text-on-surface-variant">(demo — sign in to personalize)</span>') + '</h4>' +
                        '<p class="text-xs text-on-surface-variant">' + abha + '</p></div>' +
                        '<span class="bg-primary text-on-primary px-2 py-1 rounded-lg text-[10px] font-bold">OFFLINE SYNCED</span></div>' +
                    '<div class="grid grid-cols-2 gap-3 text-xs lg:text-sm">' +
                        '<div><p class="text-on-surface-variant text-[10px] uppercase font-medium">Blood Group</p><p class="font-bold text-error">' + (has && a.blood ? a.blood : 'O Positive') + '</p></div>' +
                        '<div><p class="text-on-surface-variant text-[10px] uppercase font-medium">Allergies</p><p class="font-bold">' + (has && a.allergy ? a.allergy : 'Penicillin') + '</p></div>' +
                        '<div><p class="text-on-surface-variant text-[10px] uppercase font-medium">Emergency Contact</p><p class="font-bold">' + (has && a.contactPhone ? a.contactName + ' • ' + a.contactPhone : '+91 98765 43210 (Wife)') + '</p></div>' +
                        '<div><p class="text-on-surface-variant text-[10px] uppercase font-medium">District</p><p class="font-bold">' + (has && a.district ? a.district : 'Wardha') + '</p></div>' +
                    '</div></div>' +
            '</div>' +
            '<p class="text-[11px] text-on-surface-variant mt-3">' + (has
                ? 'Loaded live from your Account Hub profile — cached on-device so it opens without internet at the hospital desk.'
                : 'Complete OTP verification in the Account Hub (top-right) and this passport shows YOUR blood group, allergies and contacts offline.') + '</p>' +
            (has ? '' : '<button onclick="closeModal(\'modal-passport\'); if (window.AccountUI) AccountUI.open();" class="mt-2 bg-primary text-on-primary px-4 py-2 rounded-lg font-bold text-sm">Open Account Hub →</button>');
        openModal('modal-passport');
    }

    /* ---------------- exports ---------------- */
    window.Network = {
        handshakeOpen: hsOpen, handshakeAck: hsAck, handshakeReset: hsReset,
        aiOpen: aiOpen, aiToggle: aiToggle, aiClear: aiClear, aiFile: aiFile,
        dispatchOpen: dpOpen, dispatchReset: dpOpen,
        invOpen: invOpen, invAdj: invAdj, invFac: invFac, invReset: invReset,
        ivrOpen: ivrOpen, ivrPress: ivrPress, ivrReset: ivrReset,
        passportOpen: ppOpen
    };
    console.info('[Network] advanced cards ready — handshake / AI triage / dispatch / inventory / IVR / passport all interactive');
})();
