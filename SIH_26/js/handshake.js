/* ============================================================
   EMERGENCY MITRA - PRE-ARRIVAL HANDSHAKE STORE (js/handshake.js)
   ============================================================
   Shared request bus between the two portals:

     CITIZEN (citizen.html)  : creates the request and watches the
                               status live (READ-ONLY — no decisions)
     ADMIN   (admin.html)    : sees incoming requests and decides
                               ACKNOWLEDGE / DECLINE

   Backed by localStorage["em_handshake_v1"] so a decision made on
   the admin page reaches the citizen page instantly (storage
   event + em:handshake-changed custom event), even across tabs.

   Request shape:
     { id, hospital, caseType, patient, bed, bedType, etaMin,
       trust, tier, antivenom,
       status: 'PENDING' | 'ACK' | 'DECLINED',
       createdAt, decidedAt, decidedBy, rerouteTo }

   Zero dependencies. Loads before network-cards.js (citizen) and
   before admin-handshake.js (admin).
   ============================================================ */

(function () {
    'use strict';

    var KEY = 'em_handshake_v1';
    var REROUTE_TO = 'Rural Hospital Sevagram';

    function read() {
        try { return JSON.parse(localStorage.getItem(KEY) || '[]') || []; }
        catch (e) { return []; }
    }

    function write(list) {
        try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 40))); } catch (e) { /* private mode */ }
        emit();
    }

    function emit() {
        try { window.dispatchEvent(new CustomEvent('em:handshake-changed')); } catch (e) { /* no-op */ }
    }

    window.HandshakeStore = {
        REROUTE_TO: REROUTE_TO,

        list: read,

        get: function (id) {
            var hit = null;
            read().forEach(function (r) { if (r.id === id) hit = r; });
            return hit;
        },

        count: function () { return read().length; },

        pendingCount: function () {
            var n = 0;
            read().forEach(function (r) { if (r.status === 'PENDING') n++; });
            return n;
        },

        /** Citizen side: file a new pre-arrival request. */
        create: function (req) {
            var r = {
                id: 'HS-' + Math.floor(100 + Math.random() * 900),
                hospital: 'District Hospital Wardha',
                caseType: 'Emergency', patient: 'Citizen', bed: '—', bedType: 'General',
                etaMin: 12, trust: 50, tier: 'MEDIUM', antivenom: '—',
                status: 'PENDING', createdAt: Date.now(),
                decidedAt: null, decidedBy: null, rerouteTo: REROUTE_TO
            };
            for (var k in (req || {})) { if (req[k] != null) r[k] = req[k]; }
            var list = read();
            list.unshift(r);
            write(list);
            return r;
        },

        /** Admin side: the duty-officer decision. Only PENDING moves. */
        decide: function (id, ok, by) {
            var list = read(), hit = null;
            list.forEach(function (r) {
                if (r.id === id && r.status === 'PENDING') {
                    r.status = ok ? 'ACK' : 'DECLINED';
                    r.decidedAt = Date.now();
                    r.decidedBy = by || 'Duty Officer';
                    hit = r;
                }
            });
            if (hit) write(list);
            return hit;
        },

        /** Demo replay: put a request back into PENDING. */
        reset: function (id) {
            var list = read();
            list.forEach(function (r) {
                if (r.id === id) {
                    r.status = 'PENDING';
                    r.createdAt = Date.now();
                    r.decidedAt = null;
                    r.decidedBy = null;
                }
            });
            write(list);
        },

        /** Minutes left before the ambulance arrives (live). */
        remainingMin: function (r) {
            if (!r) return 0;
            var elapsed = Math.floor((Date.now() - (r.createdAt || Date.now())) / 60000);
            return Math.max(0, (r.etaMin || 0) - elapsed);
        }
    };

    /* Cross-tab sync: another page wrote to the store */
    window.addEventListener('storage', function (e) {
        if (e.key === KEY) emit();
    });

    /* Language switch: expose the current language for this module's
       consumers (citizen view + admin panel re-render on the event
       emitted by translations.js after this listener runs). */
    window.HandshakeStore.lang = function () {
        return (window.currentLang === 'hi' || window.currentLang === 'mr') ? window.currentLang : 'en';
    };
})();
