/* ============================================================
   EMERGENCY MITRA - CITIZEN TOAST SHIM (js/toast.js)
   ============================================================
   The citizen portal intentionally does NOT load js/admin.js
   (the dashboard controller). Several citizen-side modules
   (account.js, outbox.js, network-cards.js) still raise UI
   feedback through the shared showToast() contract.

   This shim provides the exact same toast UI (reusing the
   #dash-toast element + styles already in css/styles.css) and
   quietly steps aside wherever admin.js already defines it.
   ============================================================ */
(function () {
    'use strict';

    if (typeof window.showToast === 'function') return;   // admin.js present

    function ensureToastEl() {
        var t = document.getElementById('dash-toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'dash-toast';
            t.innerHTML =
                '<span class="material-symbols-outlined" id="toast-icon">check_circle</span>' +
                '<span id="toast-msg"></span>';
            document.body.appendChild(t);
        }
        return t;
    }

    window.showToast = function (msg, icon) {
        var t = ensureToastEl();
        var msgEl = document.getElementById('toast-msg');
        var iconEl = document.getElementById('toast-icon');
        if (msgEl) msgEl.textContent = msg;
        if (iconEl) iconEl.textContent = icon || 'check_circle';
        t.className = 'show';
        setTimeout(function () {
            t.className = t.className.replace('show', '');
        }, 3200);
    };
})();
