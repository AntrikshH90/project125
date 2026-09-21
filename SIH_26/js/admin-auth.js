/* ============================================================
   EMERGENCY MITRA - ADMIN AUTHENTICATION GATE (js/admin-auth.js)
   ============================================================
   Shared by admin-login.html (sign-in) and admin.html (guard).

   PROTOTYPE AUTH: credentials are hard-coded below because this
   is a demo build with no backend. Before production, swap
   AdminAuth.login() for a real server call (state SSO / JWT) —
   nothing else in the portal needs to change.

   SESSION: sessionStorage "em_admin_session_v1" (per-tab, dies
   with the tab) holding { user, at }. Sessions expire after a
   8-hour duty shift.

   API
     AdminAuth.login(u, p)        -> { ok, user } | { ok:false }
     AdminAuth.logout()
     AdminAuth.isAuthenticated()  -> bool (false once expired)
     AdminAuth.currentUser()      -> 'admin' | 'officer' | null
   ============================================================ */
(function () {
    'use strict';

    var KEY = 'em_admin_session_v1';
    var SHIFT_MS = 8 * 60 * 60 * 1000;   // one duty shift

    // Demo duty-officer accounts (shown on the login page).
    var USERS = {
        'admin': 'mitra123',
        'officer': 'wardha108'
    };

    function read() {
        try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); }
        catch (e) { return null; }
    }

    window.AdminAuth = {
        login: function (username, password) {
            var u = String(username || '').trim().toLowerCase();
            if (USERS[u] && USERS[u] === String(password)) {
                var session = { user: u, at: Date.now() };
                try { sessionStorage.setItem(KEY, JSON.stringify(session)); }
                catch (e) { /* private mode — session lives in memory only */ }
                return { ok: true, user: u };
            }
            return { ok: false };
        },

        logout: function () {
            try { sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ }
        },

        isAuthenticated: function () {
            var s = read();
            if (!s || !s.user) return false;
            if (Date.now() - (s.at || 0) > SHIFT_MS) {
                this.logout();
                return false;
            }
            return true;
        },

        currentUser: function () {
            var s = read();
            return s ? (s.user || null) : null;
        }
    };
})();
