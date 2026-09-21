/* ============================================================
   EMERGENCY MITRA - USER ACCOUNT & PRE-VERIFICATION HUB
   (js/account.js)
   ============================================================
   Lets a citizen verify identity IN ADVANCE so that during a
   real emergency zero friction is needed (no OTP typing, no ID
   checks - alerts are trusted automatically).

   VERIFICATIONS OFFERED
     1. Mobile number  -> SMS OTP (mock gateway, shown on screen)
     2. ABHA ID        -> format-validated + mock ABDM registry check
                          (14-digit xx-xxxx-xxxx-xxxx or name@abha)
     3. DigiLocker     -> mock Aadhaar eKYC badge
     4. Profile        -> name, age, gender, blood group, district,
                          emergency contact (useful to hospitals)

   IDENTITY STRENGTH METER: phone(+30) ABHA(+35) DigiLocker(+25)
   profile complete(+10) => shown as a progress bar.

   TRUST INTEGRATION (consumed by js/trust/*):
     window.AccountAPI.applyTo(payload) stamps reporterVerified /
     digilockerVerified onto every alert automatically. The legal-rules
     card ALWAYS appears before SOS; pre-verified citizens just see
     their ✔ badge on it and get the credibility bonus without typing
     anything. Their medical profile (blood group, allergies, emergency
     contact, ABHA) is auto-registered into the dashboard Patients tab.

   STORAGE: localStorage 'em_account_v1' (survives reloads).
   ============================================================ */

(function () {
    'use strict';

    const KEY = 'em_account_v1';

    function defaults() {
        return {
            name: '', phone: '', age: '', gender: '', blood: '',
            district: '', contactName: '', contactPhone: '', allergy: '',
            abha: '', vPhone: false, vAbha: false, vDigi: false
        };
    }

    function load() {
        try { return Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || '{}')); }
        catch (e) { return defaults(); }
    }
    function save() {
        try { localStorage.setItem(KEY, JSON.stringify(acct)); } catch (e) { /* private mode */ }
    }

    let acct = load();
    let pendingOtp = null;          // OTP issued for the current session
    let modalBuilt = false;

    const $ = (id) => document.getElementById(id);

    /* ------------------------------------------------------------
       HEADER STATE (Sign In <-> Name + green verified dot)
       ------------------------------------------------------------ */
    function renderHeader() {
        const label = $('account-btn-label');
        const dot = $('account-verify-dot');
        if (!label) return;
        if (acct.name) {
            label.textContent = acct.name.split(' ')[0];
        } else if (acct.vPhone) {
            label.textContent = '+91 ' + acct.phone;
        } else {
            label.innerHTML = 'Sign&nbsp;In';
        }
        const fullyVerified = acct.vPhone && (acct.vAbha || acct.vDigi);
        dot.classList.toggle('hidden', !fullyVerified);
    }

    /* ------------------------------------------------------------
       HELPERS
       ------------------------------------------------------------ */
    function toast(msg) {
        // Reuse dashboard toast when available; ops feed always shows it.
        if (typeof showToast === 'function') showToast(msg);
        if (window.TrustLayer && TrustLayer.OpsFeed) {
            TrustLayer.OpsFeed.push('👤 Account: ' + msg, 'info');
        }
        console.log('%c[Account] ' + msg.replace(/<[^>]+>/g, ''), 'color:#1d4ed8;font-weight:bold');
    }

    /** ABHA format rules (ABDM): 14-digit number with/without dashes,
        OR an ABHA address like name@abha / name@sbm. */
    function validAbhaFormat(v) {
        v = (v || '').trim();
        const digits = v.replace(/[-\s]/g, '');
        if (/^\d{14}$/.test(digits)) return true;
        if (/^\d{2}-\d{4}-\d{4}-\d{4}$/.test(v)) return true;
        if (/^[A-Za-z0-9._]{3,}@[A-Za-z]{3,}$/.test(v)) return true;   // ABHA address
        return false;
    }

    /** Identity strength 0-100 for the meter. */
    function strength() {
        let s = 0;
        if (acct.name && acct.phone && acct.blood && acct.district) s += 10;  // profile complete
        if (acct.vPhone) s += 30;
        if (acct.vAbha) s += 35;
        if (acct.vDigi) s += 25;
        return Math.min(100, s);
    }

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g,
            c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    /* ------------------------------------------------------------
       MODAL - built once on first open, refreshed on every open
       ------------------------------------------------------------ */
    function ensureModal() {
        if (modalBuilt) return;
        const overlay = document.createElement('div');
        overlay.id = 'account-modal';
        overlay.innerHTML = '<div class="trust-bv-card" id="acct-card"></div>';
        document.body.appendChild(overlay);
        modalBuilt = true;

        // Click outside the card = close (matches app-wide modal UX)
        overlay.addEventListener('click', e => { if (e.target === overlay) AccountUI.close(); });
    }

    function section(title, icon, bodyHtml) {
        return '<div class="acct-section">' +
            '<div class="acct-section-title"><span class="material-symbols-outlined">' + icon + '</span>' + title + '</div>' +
            bodyHtml + '</div>';
    }

    function badge(ok, text) {
        return '<span class="' + (ok ? 'trust-badge-digilocker' : 'acct-badge-pending') + '">' +
            (ok ? '✓ ' : '⏳ ') + text + '</span>';
    }

    function refresh() {
        const card = $('acct-card');
        const st = strength();

        card.innerHTML =
            // ---- Header ----
            '<div class="flex justify-between items-start mb-1">' +
              '<div class="trust-bv-title" style="margin-bottom:0;">' +
                '<span class="material-symbols-outlined" style="color:#00453d;">account_circle</span>' +
                'My Account &amp; Verification</div>' +
              '<button class="text-on-surface-variant hover:text-on-surface h-9 w-9 flex items-center justify-center rounded-lg hover:bg-surface-container-high" onclick="AccountUI.close()">✕</button>' +
            '</div>' +
            '<div class="trust-bv-sub">Verify once in advance — during a real emergency your alerts are trusted automatically with zero friction.</div>' +

            // ---- Identity strength meter ----
            '<div class="acct-strength-wrap">' +
              '<div class="flex justify-between text-[11px] font-bold mb-1"><span>IDENTITY STRENGTH</span>' +
              '<span id="acct-strength-label">' + st + '%</span></div>' +
              '<div class="acct-strength-bar"><div class="acct-strength-fill" id="acct-strength-fill" style="width:' + st + '%"></div></div>' +
            '</div>';

        // ---- 1. Basic profile ----
        card.innerHTML += section('Basic Details', 'badge',
          '<div class="acct-grid2">' +
            '<div><label class="acct-label">Full Name</label>' +
              '<input id="ac-name" class="acct-input" placeholder="e.g. Ramesh Pawar" value="' + esc(acct.name) + '"></div>' +
            '<div><label class="acct-label">Mobile Number</label>' +
              '<input id="ac-phone" class="acct-input" placeholder="10-digit mobile" maxlength="10" inputmode="numeric" value="' + esc(acct.phone) + '"></div>' +
            '<div><label class="acct-label">Age</label>' +
              '<input id="ac-age" class="acct-input" maxlength="3" inputmode="numeric" value="' + esc(acct.age) + '"></div>' +
            '<div><label class="acct-label">Blood Group</label>' +
              '<select id="ac-blood" class="acct-input">' +
                ['','A+','A-','B+','B-','O+','O-','AB+','AB-'].map(b =>
                  '<option ' + (acct.blood === b ? 'selected' : '') + '>' + b + '</option>').join('') +
              '</select></div>' +
            '<div><label class="acct-label">Known Allergies</label>' +
              '<input id="ac-allergy" class="acct-input" placeholder="e.g. Penicillin / None" value="' + esc(acct.allergy) + '"></div>' +
            '<div><label class="acct-label">District</label>' +
              '<select id="ac-district" class="acct-input">' +
                ['','Wardha','Nagpur','Amravati','Yavatmal','Washim','Bhandara','Gondia','Chandrapur','Akola','Buldhana']
                  .map(d => '<option ' + (acct.district === d ? 'selected' : '') + '>' + d + '</option>').join('') +
              '</select></div>' +
            '<div><label class="acct-label">Gender</label>' +
              '<select id="ac-gender" class="acct-input">' +
                ['','Male','Female','Other'].map(g =>
                  '<option ' + (acct.gender === g ? 'selected' : '') + '>' + g + '</option>').join('') +
              '</select></div>' +
          '</div>' +
          '<button class="trust-btn-primary acct-btn-sm" onclick="AccountUI.saveProfile()">Save Details</button>');

        // ---- 2. Mobile OTP verification ----
        card.innerHTML += section('Mobile Verification', 'sms',
          '<div class="flex items-center gap-2 flex-wrap">' +
            badge(acct.vPhone, acct.vPhone ? 'Verified: +91 ' + esc(acct.phone) : 'Not verified') + '</div>' +
          '<div id="ac-otp-area"></div>' +
          (acct.vPhone ? '' :
          '<button class="trust-btn-primary acct-btn-sm" style="background:#ba1a1a;" onclick="AccountUI.sendOtp()">📱 Send OTP to verify mobile</button>'));

        // ---- 3. ABHA ID ----
        card.innerHTML += section('ABHA ID (Ayushman Bharat Health Account)', 'health_and_safety',
          '<div class="flex items-center gap-2 flex-wrap mb-2">' +
            badge(acct.vAbha, acct.vAbha ? 'Linked: ' + esc(acct.abha) : 'Not linked') + '</div>' +
          (acct.vAbha ? '' :
          '<input id="ac-abha" class="acct-input" placeholder="14-digit xx-xxxx-xxxx-xxxx  OR  name@abha" value="' + esc(acct.abha) + '">' +
          '<button class="trust-btn-primary acct-btn-sm" style="background:#1d4ed8;" onclick="AccountUI.linkAbha()">🪪 Link ABHA via ABDM registry</button>'));

        // ---- 4. DigiLocker eKYC ----
        card.innerHTML += section('DigiLocker Aadhaar eKYC', 'verified_user',
          '<div class="flex items-center gap-2 flex-wrap mb-2">' +
            badge(acct.vDigi, acct.vDigi ? 'Aadhaar eKYC verified' : 'Not linked') + '</div>' +
          (acct.vDigi ? '' :
          '<button class="trust-btn-primary acct-btn-sm" style="background:#1d4ed8;" onclick="AccountUI.digilocker()">🪪 Verify via DigiLocker</button>'));

        // ---- 5. Emergency contact ----
        card.innerHTML += section('Emergency Contact (notified on your SOS)', 'contact_emergency',
          '<div class="acct-grid2">' +
            '<div><label class="acct-label">Contact Name</label>' +
              '<input id="ac-cname" class="acct-input" placeholder="Family / neighbour" value="' + esc(acct.contactName) + '"></div>' +
            '<div><label class="acct-label">Contact Number</label>' +
              '<input id="ac-cphone" class="acct-input" maxlength="10" inputmode="numeric" value="' + esc(acct.contactPhone) + '"></div>' +
          '</div>' +
          '<button class="trust-btn-primary acct-btn-sm" onclick="AccountUI.saveContact()">Save Contact</button>');

        renderHeader();
    }

    /* ------------------------------------------------------------
       ACTIONS (wired to buttons via window.AccountUI)
       ------------------------------------------------------------ */
    function readProfileInputs() {
        acct.name = $('ac-name') ? $('ac-name').value.trim() : acct.name;
        acct.phone = $('ac-phone') ? $('ac-phone').value.trim() : acct.phone;
        acct.age = $('ac-age') ? $('ac-age').value.trim() : acct.age;
        acct.blood = $('ac-blood') ? $('ac-blood').value : acct.blood;
        acct.allergy = $('ac-allergy') ? $('ac-allergy').value.trim() : acct.allergy;
        acct.district = $('ac-district') ? $('ac-district').value : acct.district;
        acct.gender = $('ac-gender') ? $('ac-gender').value : acct.gender;
    }

    function OpsFeedSafe(msg) {
        if (window.TrustLayer && TrustLayer.OpsFeed) TrustLayer.OpsFeed.push('👤 ' + msg, 'info');
    }

    const Actions = {
        toggle() { this.isOpen() ? this.close() : this.open(); },
        isOpen() {
            const m = $('account-modal');
            return !!(m && m.style.display === 'flex');
        },
        open() { ensureModal(); refresh(); $('account-modal').style.display = 'flex'; },
        close() { const m = $('account-modal'); if (m) m.style.display = 'none'; },

        /** Save basic profile fields. */
        saveProfile() {
            readProfileInputs();
            if (!/^\d{10}$/.test(acct.phone)) {
                toast('⚠ Enter a valid 10-digit mobile number first');
                return;
            }
            save();
            toast('✅ Profile saved, ' + (acct.name || 'citizen'));
            refresh();
        },

        saveContact() {
            acct.contactName = $('ac-cname').value.trim();
            acct.contactPhone = $('ac-cphone').value.trim();
            if (acct.contactPhone && !/^\d{10}$/.test(acct.contactPhone)) {
                toast('⚠ Emergency contact must be a 10-digit number');
                return;
            }
            save();
            toast('✅ Emergency contact saved');
            refresh();
        },

        /* ---- Mobile OTP verification (mock SMS gateway) ---- */
        sendOtp() {
            readProfileInputs();
            if (!/^\d{10}$/.test(acct.phone)) {
                toast('⚠ Fill a valid 10-digit mobile in Basic Details first');
                return;
            }
            pendingOtp = String(Math.floor(1000 + Math.random() * 9000));
            save();
            $('ac-otp-area').innerHTML =
                '<div class="trust-bv-sub" style="margin:8px 0 0;">Demo SMS gateway → OTP for +91 ' +
                esc(acct.phone) + ' is <b style="color:#00453d;font-size:15px;">' + pendingOtp + '</b></div>' +
                '<div class="trust-otp-row">' +
                [0, 1, 2, 3].map(i =>
                    '<input class="trust-otp-input" id="ac-otp' + i + '" maxlength="1" inputmode="numeric">').join('') +
                '</div>' +
                '<button class="trust-btn-primary acct-btn-sm" onclick="AccountUI.confirmOtp()">Verify OTP</button>';
            toast('OTP sent via mock SMS gateway: ' + pendingOtp);
        },

        confirmOtp() {
            const entered = [0, 1, 2, 3].map(i => ($('ac-otp' + i) || {}).value || '').join('');
            if (entered === pendingOtp) {
                acct.vPhone = true;
                pendingOtp = null;
                save();
                toast('✅ Mobile verified — identity strength ' + strength() + '%');
                refresh();
            } else {
                toast('❌ Incorrect OTP — try again');
            }
        },

        /* ---- ABHA linking (format check + mock ABDM registry call) ---- */
        linkAbha() {
            const input = $('ac-abha');
            const v = input.value.trim();
            if (!validAbhaFormat(v)) {
                toast('⚠ Invalid ABHA format. Use 14-digit xx-xxxx-xxxx-xxxx or name@abha');
                return;
            }
            acct.abha = v;
            save();
            input.disabled = true;
            input.value = '⏳ Verifying with ABDM registry…';
            OpsFeedSafe('ABHA ' + v.replace(/\d(?=\d{4})/g, '*') + ' → ABDM mock lookup…');
            // Mock registry latency; real deployment: ABDM health-id API
            setTimeout(() => {
                acct.vAbha = true;
                save();
                toast('✅ ABHA linked via ABDM registry — identity strength ' + strength() + '%');
                refresh();
            }, 1400);
        },

        /* ---- DigiLocker Aadhaar eKYC (mock API) ---- */
        digilocker() {
            OpsFeedSafe('DigiLocker eKYC requested…');
            toast('⏳ Contacting DigiLocker…');
            setTimeout(() => {
                acct.vDigi = true;
                save();
                toast('🪪 DigiLocker Aadhaar eKYC verified — identity strength ' + strength() + '%');
                refresh();
            }, 1300);
        }
    };

    /* ------------------------------------------------------------
       PUBLIC API
       ------------------------------------------------------------ */
    window.AccountUI = Actions;

    /**
     * Trust bridge - consumed by js/trust/* when an alert is filed.
     * A pre-verified citizen automatically receives the credibility
     * bonuses WITHOUT any emergency-time friction.
     */
    window.AccountAPI = {
        get: () => Object.assign({}, acct),
        isPhoneVerified: () => !!acct.vPhone,
        isAbhaLinked: () => !!acct.vAbha,
        isDigilockerVerified: () => !!acct.vDigi,
        isFullyVerified: () => !!acct.vPhone && (!!acct.vAbha || !!acct.vDigi),
        displayName: () => acct.name || (acct.vPhone ? '+91 ' + acct.phone : null),

        /** Stamp verification state onto an alert payload. */
        applyTo(payload) {
            if (!payload) return payload;
            if (acct.vAbha || acct.vPhone) payload.reporterVerified = true;
            if (acct.vDigi) payload.digilockerVerified = true;
            return payload;
        },

        /** Human-readable badge for ops feed / evidence panels. */
        badgeText() {
            if (this.isFullyVerified()) {
                return '✔ VERIFIED: ' + (acct.name || '+91 ' + acct.phone) +
                    (acct.vAbha ? ' • ABHA' : '') + (acct.vDigi ? ' • DigiLocker' : '');
            }
            return null;
        }
    };

    renderHeader();
    console.info('%c[Account] account.js loaded — Sign-In ready in header',
        'color:#1d4ed8;font-weight:bold');
})();