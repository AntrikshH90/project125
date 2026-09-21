/* ============================================================
   EMERGENCY MITRA - ROLE PORTAL BRIDGE (js/portal-bridge.js)
   ============================================================
   Keeps the citizen portal and the admin Command Center
   decoupled but in sync — with ZERO changes to the existing
   app.js / admin.js / trust-layer code.

   CITIZEN PAGES (js/admin.js intentionally NOT loaded):
     - Several modules (trust-ui.js, outbox.js, network-cards.js)
       push new cases into the dashboard's `adminCases` list.
       This shim provides a lightweight stand-in list so those
       flows keep working untouched.
     - Every case pushed there is mirrored into a localStorage
       "case bus" so it survives the page.

   ADMIN PAGE (js/admin.js loaded first):
     - Drains the case bus into the REAL adminCases list, so the
       duty officer instantly sees everything citizens filed
       while the Command Center was closed.

   CAP: newest 60 cases. Key: localStorage "em_case_bus_v1".
   ============================================================ */
(function () {
    'use strict';

    var BUS_KEY = 'em_case_bus_v1';
    var BUS_CAP = 60;

    function readBus() {
        try { return JSON.parse(localStorage.getItem(BUS_KEY) || '[]') || []; }
        catch (e) { return []; }
    }

    function writeBus(items) {
        try {
            localStorage.setItem(BUS_KEY, JSON.stringify(items.slice(0, BUS_CAP)));
        } catch (e) { /* storage full/unavailable — in-memory only */ }
    }

    window.PortalBridge = {
        /** Mirror one case into the bus (citizen side). */
        file: function (c) {
            if (!c || c.__bridged) return;
            try {
                var copy = JSON.parse(JSON.stringify(c));
                copy.__bridged = true;
                var items = readBus();
                items.unshift(copy);
                writeBus(items);
            } catch (e) { /* non-serializable — skip mirroring, keep UI alive */ }
        },

        /**
         * Move every queued citizen case into a live array (admin side).
         * Bulk-unshift (not per-item) so the bus order — newest first —
         * is preserved on top of the dashboard list.
         */
        drain: function (target) {
            var items = readBus();
            if (!target || !items.length) return 0;
            items.forEach(function (c) { delete c.__bridged; });
            Array.prototype.unshift.apply(target, items);
            writeBus([]);
            return items.length;
        },

        pending: function () { return readBus().length; }
    };

    // admin.js declares `let adminCases` at script top level. On the
    // admin page that binding already exists by the time this runs.
    // typeof on an unresolvable name returns "undefined", but a let
    // binding still in TDZ throws — so guard defensively. This keeps
    // the bridge correct even if script order ever changes.
    var onAdminPage = false;
    try { onAdminPage = (typeof adminCases !== 'undefined'); }
    catch (e) { onAdminPage = false; }                 // TDZ => treat as citizen page

    if (!onAdminPage) {
        /* ---- CITIZEN MODE ---- */
        var citizenCases = [];
        citizenCases.unshift = function () {
            for (var i = 0; i < arguments.length; i++) {
                try { window.PortalBridge.file(arguments[i]); }
                catch (e) { /* never block the reporting flow */ }
            }
            return Array.prototype.unshift.apply(citizenCases, arguments);
        };
        window.adminCases = citizenCases;
    } else {
        /* ---- ADMIN MODE ---- */
        try {
            var delivered = window.PortalBridge.drain(adminCases);
            if (delivered > 0 && typeof renderDashboard === 'function') {
                renderDashboard();
            }
        } catch (e) { /* boot-order guard — boot script re-renders anyway */ }
    }
})();
