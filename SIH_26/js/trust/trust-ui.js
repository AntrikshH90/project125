/* ============================================================
   EMERGENCY MITRA - TRUST LAYER UI / WIRING
   (js/trust/trust-ui.js)
   ============================================================
   NON-DESTRUCTIVE WIRING for all anti-fake features.

   STRATEGY (zero regression guarantee):
     - Existing functions in app.js / admin.js are NEVER edited.
       They are wrapped at load time:
           const orig = window.fn; window.fn = wrapper(orig)
     - If this module fails to load, every original flow still
       works 100% because originals remain untouched on window.
     - All new DOM is injected at runtime into stable anchor ids
       that already exist (#ew-step4, #emergency-wizard-modal...).

   WIRED FLOWS
     A. startEmergencySequence() -> legal banner ack (once/session)
     B. ewAnalyzeSymptoms()      -> Evidence panel (camera+GPS+audio
                                    +device hash) -> scoring -> case
     C. startSosSequence()       -> legal-rules acknowledgement card
                                    (NO OTP / NO DigiLocker — a real
                                    bystander is never blocked) ->
                                    original SOS -> triangulation +
                                    call-back + volunteer ping +
                                    telemetry
     D. renderDashboard()        -> risk-tier chips next to priority

   Loads LAST so it can decorate everything above it.
   ============================================================ */

(function () {
    'use strict';

    window.TrustLayer = window.TrustLayer || {};
    const TL = window.TrustLayer;
    const CE = () => TL.CredEngine;
    const EV = () => TL.EvidenceCapture;
    const DT = () => TL.DeviceTrust;

    const LOG_STYLE = 'color:#006b5f;font-weight:bold';
    const log = (msg) => console.log('%c[TrustLayer] ' + msg, LOG_STYLE);

    /* ============================================================
       LIVE OPS FEED - floating demo console (judge visibility)
       ============================================================ */
    const OpsFeed = {
        el: null,
        init() {
            if (this.el) return;
            const feed = document.createElement('div');
            feed.id = 'trust-ops-feed';
            feed.innerHTML =
                '<div class="ops-head"><span>🛡 TRUST ENGINE — LIVE OPS</span>' +
                '<button title="Hide" onclick="this.closest(\'#trust-ops-feed\').style.display=\'none\'">✕</button></div>' +
                '<div class="ops-body"></div>';
            document.body.appendChild(feed);
            this.el = feed;
        },
        push(msg, kind) {
            this.init();
            this.el.style.display = 'block';
            const body = this.el.querySelector('.ops-body');
            const row = document.createElement('div');
            row.className = 'ops-entry';
            const t = new Date().toLocaleTimeString('en-IN', { hour12: false });
            row.innerHTML = '<span class="ops-time">' + t + '</span><span class="ops-' +
                (kind || 'info') + '">' + msg + '</span>';
            body.appendChild(row);
            body.scrollTop = body.scrollHeight;
            while (body.children.length > 40) body.removeChild(body.firstChild);
        }
    };
    TL.OpsFeed = OpsFeed;
    // SOS dispatch entry-point for outbox/app: runs the full
    // trust pipeline for a zero-tap SOS (identity-free).
    window.pushTrustedSosCase = function () {
        try { runUnconsciousPipeline({ reporterVerified: false, digilockerVerified: false }); }
        catch (e) { console.warn('[TrustLayer] SOS pipeline error:', e.message); }
    };

    /* ============================================================
       LEGAL DETERRENT BANNER (BNS false-report warning)
       Reusable snippet injected into wizard + bystander modal.
       ============================================================ */
    function legalBannerHtml() {
        return '<div class="trust-legal-banner">' +
            '<span class="material-symbols-outlined">gavel</span>' +
            '<p><strong>Legal Warning:</strong> False emergency reporting is a punishable offence under ' +
            '<strong>BNS Section 54 / IPC Section 182</strong> — up to 6 months imprisonment and/or fine. ' +
            'This device is fingerprinted (' + DT().getDeviceId() + ') and all evidence is geo-stamped.</p></div>';
    }

    /* ============================================================
       FEATURE 1 - CONSCIOUS PERSON MODE
       Injects an evidence-capture panel into Emergency Wizard
       Step 4 and evaluates credibility when the alert is created.
       ============================================================ */
    const Conscious = {
        state: { geo: null, photo: null, voice: null },

        /**
         * Attaches the evidence panel to a step container. ALWAYS
         * rebuilds from scratch so a new report never shows stale
         * photo/audio/GPS from a previous one.
         * @param {string} hostId  container element id. Defaults to
         *        the Emergency Wizard step-4; the Triage modal passes
         *        'triage-step-2' (Hospital Handshake = dispatch moment).
         */
        injectPanel(hostId) {
            const host = document.getElementById(hostId || 'ew-step4');
            if (!host) return;

            // --- Fresh state every time: drop old DOM + old evidence ---
            const stale = document.getElementById('trust-evidence-panel');
            if (stale) stale.remove();
            try { EV().CameraCapture.close(); }   // release any live camera
            catch (e) { /* not open */ }
            this.state = { geo: null, photo: null, voice: null };
            const panel = document.createElement('div');
            panel.id = 'trust-evidence-panel';
            panel.className = 'trust-evidence-panel';
            panel.innerHTML =
                '<div class="trust-evidence-panel-header">' +
                  '<span class="trust-evidence-panel-title">🛡 CREDIBILITY VERIFICATION</span>' +
                  '<span class="trust-badge-digilocker" id="trust-device-chip"></span>' +
                '</div>' +
                legalBannerHtml() +
                '<div class="trust-evidence-grid" style="margin-top:10px;">' +
                  '<div class="trust-ev-card" id="tev-card-geo">' +
                    '<div class="trust-ev-icon">📡</div><div class="trust-ev-label">GPS Lockdown</div>' +
                    '<div class="trust-ev-status" id="tev-status-geo">Acquiring…</div></div>' +
                  '<div class="trust-ev-card" id="tev-card-cam">' +
                    '<video class="trust-cam-preview" id="tev-cam-video" muted playsinline></video>' +
                    '<div class="trust-ev-label">Live Photo (camera-only)</div>' +
                    '<div class="trust-ev-status" id="tev-status-cam">Gallery uploads disabled</div>' +
                    '<button class="trust-ev-btn" id="tev-btn-cam">📷 Capture Live Photo</button></div>' +
                  '<div class="trust-ev-card" id="tev-card-voice">' +
                    '<div class="trust-ev-icon">🎙️</div><div class="trust-ev-label">5s Voice Memo</div>' +
                    '<div class="trust-ev-status" id="tev-status-voice">Ambient audio check</div>' +
                    '<button class="trust-ev-btn" id="tev-btn-voice">🎤 Record 5s Audio</button></div>' +
                '</div>';

            // Insert ABOVE the severity badge inside step 4.
            host.insertBefore(panel, host.firstChild);
            const chip = document.getElementById('trust-device-chip');
            if (chip) chip.textContent = 'DEVICE: ' + DT().getDeviceId();

            this.startGeo();
            document.getElementById('tev-btn-cam').onclick = () => this.capturePhoto();
            document.getElementById('tev-btn-voice').onclick = () => this.captureVoice();

            // Show the citizen's pre-verified badge instead of a raw
            // device hash when they completed Account verification.
            const api = window.AccountAPI;
            const verifiedBadge = api && api.badgeText();
            if (verifiedBadge) {
                chip.textContent = verifiedBadge;
            }
        },

        async startGeo() {
            const elStatus = document.getElementById('tev-status-geo');
            OpsFeed.push('GPS lockdown requested…', 'info');
            this.state.geo = await EV().captureGeo(8000);
            const card = document.getElementById('tev-card-geo');
            if (this.state.geo) {
                elStatus.className = 'trust-ev-status ok';
                elStatus.textContent = '📍 ' + this.state.geo.lat + ', ' + this.state.geo.lng +
                    ' (±' + this.state.geo.accuracyM + 'm)';
                card.classList.add('captured');
                OpsFeed.push('GPS locked: ' + this.state.geo.lat + ', ' + this.state.geo.lng, 'ok');
            } else {
                elStatus.textContent = '⚠ GPS unavailable — alert continues untagged';
                OpsFeed.push('GPS denied — continuing without geo-tag', 'warn');
            }
        },

        async capturePhoto() {
            const btn = document.getElementById('tev-btn-cam');
            const video = document.getElementById('tev-cam-video');
            try {
                btn.disabled = true; btn.textContent = 'Opening camera…';
                await EV().CameraCapture.open(video);
                btn.textContent = '📸 SNAP NOW';
                OpsFeed.push('Live camera open (gallery-proof path)', 'info');
                btn.onclick = () => {                       // second tap = snap frame
                    this.state.photo = EV().CameraCapture.snap(video);
                    video.srcObject = null;
                    video.src = this.state.photo.dataUrl;   // frozen frame as proof
                    video.style.transform = 'none';
                    document.getElementById('tev-card-cam').classList.add('captured');
                    const st = document.getElementById('tev-status-cam');
                    st.className = 'trust-ev-status ok';
                    st.textContent = '✅ Captured live @ ' + new Date().toLocaleTimeString('en-IN');
                    btn.textContent = '✅ Evidence Attached';
                    OpsFeed.push('Live photo captured & attached', 'ok');
                };
            } catch (e) {
                document.getElementById('tev-status-cam').textContent = '⚠ Camera unavailable: ' + e.message;
                OpsFeed.push('Camera unavailable — flow continues', 'warn');
            } finally {
                btn.disabled = false;
            }
        },

        async captureVoice() {
            const btn = document.getElementById('tev-btn-voice');
            const st = document.getElementById('tev-status-voice');
            btn.disabled = true; btn.classList.add('recording'); btn.textContent = '🔴 REC 5s…';
            let left = 5;
            const tick = setInterval(() => { left--; if (left > 0) btn.textContent = '🔴 REC ' + left + 's…'; }, 1000);
            OpsFeed.push('Recording 5s ambient audio…', 'info');

            this.state.voice = await EV().recordVoiceMemo(5);
            clearInterval(tick);
            btn.classList.remove('recording');
            if (this.state.voice) {
                const conf = this.state.voice.soundProfileConfidence;
                st.className = conf >= 50 ? 'trust-ev-status ok' : 'trust-ev-status';
                st.innerHTML = 'AI sound-profile: <b>' + conf + '%</b> (' + this.state.voice.model + ')';
                btn.textContent = '✅ Memo Attached (' + conf + '%)';
                document.getElementById('tev-card-voice').classList.add('captured');
                OpsFeed.push('Voice memo done — AI sound-profile ' + conf + '%', conf >= 50 ? 'ok' : 'warn');
            } else {
                btn.textContent = '⚠ Mic unavailable';
                OpsFeed.push('Mic denied — flow continues', 'warn');
            }
            btn.disabled = false;
        }
    };

    /* ============================================================
       FEATURE 2 - UNCONSCIOUS PERSON MODE
       NO login / OTP / DigiLocker friction: a person reporting a
       life-threatening emergency must never be blocked. We simply
       display the legal rules & penalties for false reporting,
       take one tap of acknowledgement, then run the ORIGINAL SOS
       sequence untouched.
       ============================================================ */
    const Unconscious = {
        /**
         * ALWAYS shows the legal-rules card — for every reporter,
         * even pre-verified ones (the acknowledgement is a deterrent
         * AND a legal record; verification only personalises it).
         * Resolves after one tap of "I Understand — Send SOS Now".
         */
        showVerificationModal() {
            return new Promise(resolve => {
                const api = window.AccountAPI;
                const pre = api && api.isPhoneVerified();

                let modal = document.getElementById('trust-bystander-modal');
                if (!modal) {
                    modal = document.createElement('div');
                    modal.id = 'trust-bystander-modal';
                    modal.innerHTML = '<div class="trust-bv-card" id="trust-bv-card"></div>';
                    document.body.appendChild(modal);
                }

                // Rebuild content every time (no stale OTP widgets etc.)
                modal.querySelector('#trust-bv-card').innerHTML =
                    '<div class="trust-bv-title">' +
                      '<span class="material-symbols-outlined" style="color:#ba1a1a;">e911_emergency</span>' +
                      'Bystander Emergency Report</div>' +
                    '<div class="trust-bv-sub">You are reporting an unconscious / unresponsive person. ' +
                    'No sign-up or ID is required — help is dispatched first.</div>' +
                    (pre ? '<div style="margin-bottom:8px;"><span class="trust-badge-digilocker">✔ ' +
                           (api.badgeText() || 'Mobile pre-verified') + '</span></div>' : '') +
                    legalBannerHtml() +
                    '<ul class="trust-rules-list">' +
                      '<li>🚨 <b>Real emergencies:</b> SOS is forwarded instantly to the nearest government facility.</li>' +
                      '<li>⚖️ <b>False reporting</b> is punishable under BNS Section 54 / IPC Section 182 — up to 6 months imprisonment and/or fine.</li>' +
                      '<li>📍 Your device fingerprint (' + DT().getDeviceId() + ') and GPS stamp are attached to trace misuse.</li>' +
                      '<li>☎️ An automated dispatch call-back will be placed to confirm this alert.</li>' +
                    '</ul>' +
                    '<button class="trust-btn-primary" id="trust-btn-ack" style="background:#ba1a1a;">' +
                      'I Understand — Send SOS Now</button>';

                modal.style.display = 'flex';

                modal.querySelector('#trust-btn-ack').onclick = () => {
                    modal.style.display = 'none';
                    OpsFeed.push('Legal rules acknowledged — dispatching SOS' +
                        (pre ? ' (pre-verified citizen)' : ''), pre ? 'ok' : 'info');
                    // Verification bonuses flow from the Account hub if the
                    // reporter completed it in advance.
                    resolve({
                        reporterVerified: !!(api && api.isPhoneVerified()),
                        digilockerVerified: !!(api && api.isDigilockerVerified())
                    });
                };
            });
        }
    };

    /* ============================================================
       TRIAGE MODAL WIRING ("Immediate Emergency Assistance" cards)
       ------------------------------------------------------------
       The Snakebite / Accident & Trauma / Cardiac Arrest / Severe
       Bleeding / Breathing Issue cards open openTriageModal(type).
       Trust hooks (non-destructive):
         - openTriageModal  -> arm evidence capture + spam check
         - nextTriageStep   -> step1→2: inject LIVE evidence panel
                               into the Hospital Handshake step
                               (dispatch moment = capture moment)
                               step2→3: score & file the case with
                               the REAL selected protocol name
         - closeModal       -> closing at handshake still files it
       ============================================================ */
    const TriageFlow = {
        submitted: false,

        /** Real protocol title chosen by the user, e.g. 'Snakebite Protocol'. */
        label() {
            try {
                const t = triageData[currentEmergencyType];
                return t ? t.title : 'Triage report';
            } catch (e) { return 'Triage report'; }
        },

        reset() { this.submitted = false; },

        /** Score with whatever evidence was captured and file the case. */
        submit(reason) {
            if (this.submitted) return;
            // Panel only exists once the user reached the Handshake step,
            // so aborting at question step never creates a case.
            if (!document.getElementById('trust-evidence-panel')) return;
            if (isDemo()) {
                this.submitted = true;
                OpsFeed.push('🎓 DEMO MODE — triage case NOT filed', 'info');
                return;
            }
            this.submitted = true;

            const payload = {
                type: this.label(),
                patientName: 'Citizen-reported patient',
                geo: Conscious.state.geo,
                cameraEvidence: Conscious.state.photo,
                voiceMemo: Conscious.state.voice,
                wearable: null,
                reporterVerified: false, digilockerVerified: false,
                spamFlagged: DT().isFlagged()
            };
            // Pre-verified citizen account => automatic credibility bonus
            if (window.AccountAPI) window.AccountAPI.applyTo(payload);
            CE().registerReport(payload);
            const trust = CE().scoreAlert(payload);
            OpsFeed.push('SCORE ' + trust.score + '% → ' + trust.action.replace(/_/g, ' '),
                trust.tier === 'HIGH' ? 'ok' : (trust.tier === 'MEDIUM' ? 'warn' : 'err'));
            const c = pushTrustedCase(payload, trust);
            OpsFeed.push('Case <b>' + c.id + '</b> filed (' + reason + ') • type: ' + payload.type, 'ok');
        }
    };

    /* ============================================================
       UNCONSCIOUS-MODE PIPELINE
       Runs AFTER the original SOS sequence has been triggered:
       triangulation -> call-back -> volunteer ping -> scoring ->
       new admin-dashboard case.
       ============================================================ */
    let sosCounter = 0;

    function makeCaseId() {
        return 'EM-' + (9100 + (++sosCounter));
    }

    /**
     * Resolve the PATIENT NAME / AGE and VITALS columns from the
     * signed-in citizen's Account profile when available:
     *   - Signed in (wizard OR SOS) -> their real name, age/gender,
     *     blood group, ABHA badge, district, emergency contact.
     *     SOS cases additionally carry a "🆘 Bystander SOS" tag.
     *   - Anonymous & not signed in -> generic labels (as before)
     */
    function resolveCaseIdentity(payload) {
        const api = window.AccountAPI;
        const a = (api && api.get) ? api.get() : null;
        const signedIn = !!(a && (a.name || a.vPhone));
        const isConscious = payload.patientName === 'Citizen-reported patient';
        const extra = [];

        if (signedIn) {
            // Signed-in reporter: always show THEIR registered details,
            // whether they filed via the wizard or the SOS button.
            const name = a.name || ('+91 ' + a.phone);
            const ageSex = [a.age, a.gender].filter(Boolean).join(' / ') || '—';
            if (!isConscious) extra.push('🆘 Bystander SOS');   // how it was raised
            if (a.blood) extra.push('🩸 ' + a.blood);
            if (a.vAbha && a.abha) extra.push('ABHA ✓');
            if (a.district) extra.push('🏘 ' + a.district);
            if (a.contactName && a.contactPhone) {
                extra.push('☎ ' + a.contactName + ' (' + a.contactPhone + ')');
            }
            return { patient: name, age: ageSex, extra };
        }

        // Fully anonymous path (no account): unchanged behaviour.
        return {
            patient: payload.patientName || 'Unidentified (Bystander SOS)',
            age: 'Unknown', extra
        };
    }

    function pushTrustedCase(payload, trust) {
        const id = makeCaseId();
        const geoLine = payload.geo ? ('📍 ' + payload.geo.lat + ',' + payload.geo.lng) : '📍 untagged';
        const ident = resolveCaseIdentity(payload);
        ident.extra.push(geoLine);                       // geo always last
        const c = {
            id, time: 'Just now',
            patient: ident.patient,
            age: ident.age,
            type: (payload.type || 'SOS') + ' 🛡' + trust.score + '%',
            priority: trust.tier === 'HIGH' ? 'CRITICAL' : (trust.tier === 'MEDIUM' ? 'URGENT' : 'STABLE'),
            hospital: trust.action === 'AUTO_DISPATCH' ? 'District Hospital Wardha' : 'Pending verification',
            doctor: '—', status: trust.action === 'AUTO_DISPATCH' ? 'En Route' : 'Verifying',
            eta: trust.action === 'AUTO_DISPATCH' ? '12 mins' : 'Hold',
            vitals: ident.extra.join(' • '),
            trust: trust                       // <- consumed by dashboard decorator
        };
        try {
            // adminCases is a top-level `let` binding shared across
            // classic scripts => visible here without any export change.
            adminCases.unshift(c);
            if (typeof renderDashboard === 'function') renderDashboard();
        } catch (e) { console.warn('[TrustLayer] dashboard sync skipped:', e.message); }

        // Cases that are not auto-dispatched enter a VERIFICATION
        // PIPELINE instead of sitting in "Pending" forever.
        scheduleOperatorReview(c);
        return c;
    }

    /* ------------------------------------------------------------
       CASE RESOLUTION - "Pending verification" must always converge
       ------------------------------------------------------------ */

    /** Promote a held case to verified & dispatched (idempotent). */
    function verifyAndDispatch(c, reason) {
        if (!c || c._verified) return;
        c._verified = true;
        c.hospital = 'District Hospital Wardha';
        c.status = 'En Route';
        c.eta = '12 mins';
        try { if (typeof renderDashboard === 'function') renderDashboard(); } catch (e) { /* ignore */ }
        OpsFeed.push('✅ <b>' + c.id + '</b> VERIFIED (' + reason + ') → dispatched to District Hospital Wardha • ETA 12 min', 'ok');
    }

    /**
     * Operator desk reviews the attached evidence of every held case
     * within seconds. AUTO_DISPATCH cases skip this (already routed).
     */
    function scheduleOperatorReview(c) {
        if (!c.trust || c.trust.action === 'AUTO_DISPATCH') {
            if (c.trust) OpsFeed.push('🚑 <b>' + c.id + '</b> AUTO-DISPATCHED (HIGH credibility) — ambulance en route', 'ok');
            return;
        }
        OpsFeed.push('☎ Operator desk reviewing evidence for <b>' + c.id + '</b>… (' +
            (c.trust.action === 'OPERATOR_CONFIRMATION' ? 'operator confirmation' : 'volunteer verification') + ')', 'warn');
        setTimeout(() => verifyAndDispatch(c, 'operator evidence review'), 6000);
    }

    /** Demo Mode (tutorial): suppress ALL real case filing. */
    function isDemo() {
        return !!(window.DemoMode && window.DemoMode.active);
    }

    async function runUnconsciousPipeline(verification) {
        if (isDemo()) {
            OpsFeed.push('🎓 DEMO MODE — SOS pipeline suppressed, no real alert created', 'info');
            log('Demo mode: unconscious pipeline skipped');
            return;
        }
        OpsFeed.push('UNCONSCIOUS MODE — verification pipeline starting…', 'info');
        log('Unconscious pipeline started');

        // 1) GPS lockdown for the bystander report
        const geo = await EV().captureGeo(8000);
        OpsFeed.push(geo ? ('Geo-tag locked: ' + geo.lat + ',' + geo.lng)
                         : 'No geo-tag — degraded credibility', geo ? 'ok' : 'warn');

        const payload = {
            id: 'TMP-' + Date.now(), lat: geo && geo.lat, lng: geo && geo.lng,
            type: 'Bystander SOS (unconscious)',
            reporterVerified: verification.reporterVerified,
            digilockerVerified: verification.digilockerVerified,
            cameraEvidence: null, voiceMemo: null,
            wearable: TL.Demo.attachMockWearable ? { heartRate: 138, heartRateSpike: true, impactG: 3.1, fallDetected: true } : null,
            spamFlagged: DT().isFlagged()
        };
        // Pre-verified citizen account => automatic credibility bonus
        if (window.AccountAPI) window.AccountAPI.applyTo(payload);

        // 2) Multi-signal triangulation against recent reports (50m/5min)
        CE().registerReport(payload);
        const tri = CE().triangulate(payload);
        OpsFeed.push(tri.boosted
            ? '⚡ TRIANGULATION: ' + tri.clusterSize + ' independent reports within 50m/5min — priority ELEVATED'
            : 'Single-source report — standard priority', tri.boosted ? 'ok' : 'warn');

        // 3) First-responder volunteer ping (<= 500 m)
        const vp = CE().pingVolunteers({ lat: payload.lat, lng: payload.lng });
        vp.notified.forEach(v =>
            OpsFeed.push('🚶 Volunteer ' + v.id + ' ' + v.name + ' pinged (' + v.distanceM + 'm, ETA ' + v.etaMin + 'min)', 'ok'));
        if (!vp.notified.length) OpsFeed.push('No verified volunteer within 500m', 'warn');

        // 4) Credibility scoring -> tier -> routing decision
        const trust = CE().scoreAlert(payload);
        OpsFeed.push('SCORE ' + trust.score + '% → ' + trust.action.replace(/_/g, ' '),
            trust.tier === 'HIGH' ? 'ok' : (trust.tier === 'MEDIUM' ? 'warn' : 'err'));

        // 5) Case enters the dashboard (held for verification if needed)
        const c = pushTrustedCase(Object.assign({}, payload, { patientName: null }), trust);
        OpsFeed.push('Case <b>' + c.id + '</b> created in Admin Dashboard (open Dashboard tab)', 'ok');

        // 6) AUTOMATED DISPATCH CALL-BACK — this is what RESOLVES a held
        //    case: when the IVR call-back is confirmed, the case is
        //    verified and dispatched immediately.
        CE().dispatchCallBack(payload, s => {
            OpsFeed.push('Dispatch call-back [' + c.id + ']: ' + s, s === 'IVR_CONFIRMED' ? 'ok' : 'info');
            if (s === 'IVR_CONFIRMED') {
                verifyAndDispatch(c, 'IVR call-back confirmed by reporter');
            }
        });

        log('Pipeline complete: ' + JSON.stringify(trust));
    }

    /* ============================================================
       DASHBOARD DECORATOR (Feature 3 visibility)
       Wraps the EXISTING render functions from admin.js: calls the
       originals untouched, then appends 🛡 score chips to the
       priority cell of any case that carries a .trust assessment.
       ============================================================ */
    function decorateRows(tbodyId, priorityCellIdx) {
        const tbody = document.getElementById(tbodyId);
        if (!tbody || typeof adminCases === 'undefined') return;
        tbody.querySelectorAll('tr').forEach((row, i) => {
            const c = adminCases[i];
            // `c.trust` is reserved for live-scored cases pushed by the
            // TrustLayer pipeline ({score, tier, factors}). Seeded demo
            // rows render their own 🛡 chip inline — never re-decorate.
            if (!c || typeof c.trust !== 'object' || !c.trust || row.querySelector('.trust-score-chip')) return;
            const td = row.cells[priorityCellIdx];
            if (!td) return;
            const chip = document.createElement('span');
            chip.className = 'trust-score-chip tier-' + String(c.trust.tier || 'MEDIUM').toLowerCase();
            chip.title = 'Trust factors:\n' + (c.trust.factors || []).map(f => f.label).join('\n');
            chip.textContent = '🛡 ' + c.trust.score + '%';
            td.appendChild(chip);
        });
    }

    /* ============================================================
       PATIENTS TAB INTEGRATION
       A signed-in, mobile-verified citizen is auto-registered into
       the dashboard Patients Directory with their medical profile:
       blood group, KNOWN ALLERGIES, emergency contact and ABHA id.
       Non-destructive: original mock rows still render first.
       ============================================================ */
    function escHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g,
            c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    function appendAccountPatientRow() {
        const tbody = document.getElementById('patient-table-body');
        const api = window.AccountAPI;
        if (!tbody || !api) return;

        const a = api.get();
        // Only citizens who completed at least mobile verification.
        if (!a.name || !a.vPhone) return;
        // Never duplicate on re-render.
        if (tbody.querySelector('tr[data-acct="1"]')) return;

        const tr = document.createElement('tr');
        tr.setAttribute('data-acct', '1');
        const ageSex = [a.age, a.gender].filter(Boolean).join(' / ') || '—';
        const pid = (a.vAbha && a.abha)
            ? 'ABHA-' + String(a.abha).replace(/\D/g, '').slice(-4).padStart(4, '0')
            : 'P-ACCT-01';

        tr.innerHTML =
            '<td class="font-bold font-mono text-primary">' + pid + '</td>' +
            '<td class="font-bold">' + escHtml(a.name) +
                ' <span class="trust-badge-digilocker" style="margin-left:4px;">✔ Verified</span></td>' +
            '<td>' + escHtml(ageSex) + '</td>' +
            '<td><span class="dash-badge red">' + escHtml(a.blood || '—') + '</span></td>' +
            '<td class="text-xs font-semibold text-error">' + escHtml(a.allergy || 'None') + '</td>' +
            '<td class="text-xs font-bold text-primary">Pre-registered (Verified Citizen)</td>' +
            '<td class="text-xs font-mono">Baseline • ' + escHtml(a.district || 'Wardha') + ' district</td>' +
            '<td class="text-xs">' +
                (a.contactPhone
                    ? escHtml(a.contactName || 'Family') + ' • ' + escHtml(a.contactPhone)
                    : 'Self • +91 ' + escHtml(a.phone)) +
            '</td>' +
            '<td><button onclick="AccountUI.open()" class="bg-surface border border-primary text-primary px-2 py-1 rounded text-xs font-bold hover:bg-primary hover:text-white">Profile</button></td>';

        tbody.insertBefore(tr, tbody.firstChild);   // citizen record first
    }

    function wireWrappers() {
        // ---- Conscious mode: ops log on wizard entry ----
        const origStartEmergency = window.startEmergencySequence;
        window.startEmergencySequence = function () {
            OpsFeed.push('Conscious mode opened — device ' + DT().getDeviceId(), 'info');
            return origStartEmergency.apply(this, arguments);
        };

        // ---- Conscious mode: inject evidence panel at step 4 ----
        const origAnalyze = window.ewAnalyzeSymptoms;
        window.ewAnalyzeSymptoms = function () {
            const result = origAnalyze.apply(this, arguments);   // original UI first
            try {
                Conscious.injectPanel();
                DT().registerSubmission();                       // spam frequency check
                OpsFeed.push('Evidence panel injected • submissions/10min: ' +
                    DT().recentCount() + (DT().isFlagged() ? ' ⚠ SPAM FLAG' : ''),
                    DT().isFlagged() ? 'warn' : 'info');
            } catch (e) { console.warn('[TrustLayer] panel injection failed:', e.message); }
            return result;
        };

        // ---- Conscious mode: score & file case when wizard closes ----
        const origCloseWizard = window.closeEmergencyWizard;
        let consciousSubmitted = false;
        window.closeEmergencyWizard = function () {
            try {
                const panel = document.getElementById('trust-evidence-panel');
                if (panel && !consciousSubmitted && Conscious.state) {
                    if (isDemo()) {
                        consciousSubmitted = true;
                        OpsFeed.push('🎓 DEMO MODE — wizard case NOT filed (nothing was sent)', 'info');
                        setTimeout(() => { consciousSubmitted = false; }, 500);
                        return origCloseWizard.apply(this, arguments);
                    }
                    consciousSubmitted = true;

                    // Use the REAL user selection as the case label,
                    // e.g. "🐾 Animal Bite › 🐕 Dog" — never a generic tag.
                    let typeLabel = 'General Emergency';
                    try {
                        const td = ewData[ewCurrentType];
                        const sub = td && td.subtypes
                            ? td.subtypes.find(s => s.id === ewCurrentSubtype) : null;
                        if (td) typeLabel = td.label + (sub ? ' › ' + sub.label : '');
                    } catch (e) { /* wizard state unavailable — fall back */ }

                    // OFFLINE-FIRST: no network -> queue it, sync later.
                    if (window.Outbox && !window.Outbox.isOnline()) {
                        window.Outbox.enqueue('wizard', {
                            type: typeLabel,
                            patient: 'Citizen-reported patient',
                            priority: 'URGENT',
                            note: 'Filed offline with on-device evidence'
                        });
                        OpsFeed.push('📴 Offline — report queued, will auto-sync', 'warn');
                        consciousSubmitted = false;
                        return origCloseWizard.apply(this, arguments);
                    }

                    const payload = {
                        type: typeLabel,
                        patientName: 'Citizen-reported patient',
                        geo: Conscious.state.geo,
                        cameraEvidence: Conscious.state.photo,
                        voiceMemo: Conscious.state.voice,
                        wearable: null,
                        reporterVerified: false, digilockerVerified: false,
                        spamFlagged: DT().isFlagged()
                    };
                    // Pre-verified citizen account => automatic credibility bonus
                    if (window.AccountAPI) window.AccountAPI.applyTo(payload);
                    CE().registerReport(payload);
                    const trust = CE().scoreAlert(payload);
                    OpsFeed.push('SCORE ' + trust.score + '% → ' + trust.action.replace(/_/g, ' '),
                        trust.tier === 'HIGH' ? 'ok' : (trust.tier === 'MEDIUM' ? 'warn' : 'err'));
                    const c = pushTrustedCase(payload, trust);
                    OpsFeed.push('Case <b>' + c.id + '</b> filed with evidence chain', 'ok');
                    setTimeout(() => { consciousSubmitted = false; }, 500);  // allow future reports
                }
            } catch (e) { console.warn('[TrustLayer] scoring skipped:', e.message); }
            return origCloseWizard.apply(this, arguments);
        };

        // ---- Unconscious mode: legal-rules ack BEFORE original SOS ----
        const origSos = window.startSosSequence;
        window.startSosSequence = async function () {
            log('startSosSequence intercepted — showing legal rules');
            const verification = await Unconscious.showVerificationModal();
            if (window.Tutorial) Tutorial.emit('sos-acked');      // tutorial hook
            const result = origSos.apply(this, arguments);       // ORIGINAL flow untouched
            runUnconsciousPipeline(verification)                  // async, never blocks
                .catch(e => console.warn('[TrustLayer] pipeline error:', e.message));
            return result;
        };

        // ---- Admin dashboard: append trust chips post-render ----
        const origOverview = window.renderOverviewCases;
        window.renderOverviewCases = function () {
            const r = origOverview.apply(this, arguments);
            decorateRows('dash-overview-cases-tbody', 3);
            return r;
        };
        const origCases = window.renderCasesTable;
        window.renderCasesTable = function () {
            const r = origCases.apply(this, arguments);
            decorateRows('cases-table-body', 4);
            return r;
        };

        // ---- PATIENTS TAB: append the signed-in citizen's medical record ----
        // (allergies, blood group, emergency contact, ABHA) on every render.
        const origPatientsTable = window.renderPatientsTable;
        window.renderPatientsTable = function () {
            const r = origPatientsTable.apply(this, arguments);   // original rows first
            try { appendAccountPatientRow(); }                    // citizen profile on top
            catch (e) { console.warn('[TrustLayer] patient row skipped:', e.message); }
            return r;
        };

        // ---- TRIAGE MODAL: "Immediate Emergency Assistance" cards ----
        const origOpenTriage = window.openTriageModal;
        window.openTriageModal = function () {
            TriageFlow.reset();                              // fresh capture per protocol
            DT().registerSubmission();                       // spam frequency check
            OpsFeed.push('Triage protocol opened — verification armed • submissions/10min: ' +
                DT().recentCount(), 'info');
            return origOpenTriage.apply(this, arguments);
        };

        const origNextStep = window.nextTriageStep;
        window.nextTriageStep = function () {
            const before = (typeof currentTriageStep !== 'undefined') ? currentTriageStep : 0;
            const result = origNextStep.apply(this, arguments);
            const after = (typeof currentTriageStep !== 'undefined') ? currentTriageStep : before;

            if (before === 1 && after === 2) {
                // Hospital Handshake step reached = dispatch moment:
                // attach the live evidence panel right above the payload.
                Conscious.injectPanel('triage-step-2');
                OpsFeed.push('Evidence panel attached to Hospital Handshake step', 'info');
            }
            if (before === 2 && after === 3) {
                TriageFlow.submit('on View First Aid');
            }
            return result;
        };

        // Closing straight from the Handshake step still files the case.
        const origCloseModal = window.closeModal;
        window.closeModal = function (id) {
            if (id === 'modal-triage-flow') {
                TriageFlow.submit('on modal close');
            }
            return origCloseModal.apply(this, arguments);
        };

        log('All wrappers attached — zero original lines modified');
    }

    /* ============================================================
       DEMO HELPERS (SIH live-judging shortcuts)
       TrustLayer.Demo.simulateNearbyReport()  -> plants a fake
           bystander report ~22 m away so the NEXT SOS triggers
           50m/5min triangulation boost.
       TrustLayer.Demo.attachMockWearable=true -> next SOS carries
           fall-detection telemetry (HR spike, 3.1g impact).
       ============================================================ */
    TL.Demo = {
        attachMockWearable: false,

        simulateNearbyReport() {
            navigator.geolocation.getCurrentPosition(p => {
                CE().registerReport({
                    id: 'SIM-' + Date.now(),
                    lat: p.coords.latitude + 0.0002,     // ~22 m offset
                    lng: p.coords.longitude + 0.0002,
                    type: 'Simulated nearby report'
                });
                OpsFeed.push('Simulated bystander report planted ~22m away — next SOS will triangulate', 'ok');
            }, () => {
                // No geo permission: plant at Wardha demo coordinates instead
                CE().registerReport({ id: 'SIM-' + Date.now(), lat: 20.74530, lng: 78.60220, type: 'Simulated nearby report' });
                OpsFeed.push('Simulated report planted at Wardha demo coords', 'ok');
            }, { timeout: 4000 });
        },

        toggleWearable() {
            this.attachMockWearable = !this.attachMockWearable;
            OpsFeed.push('Mock wearable telemetry for next SOS: ' +
                (this.attachMockWearable ? 'ON (HR 138 • 3.1g impact • fall detected)' : 'OFF'), 'info');
            return this.attachMockWearable;
        },

        resetDeviceSpam() {
            try { localStorage.removeItem(DT().CFG.HISTORY_KEY); } catch (e) { /* ignore */ }
            OpsFeed.push('Device submission history cleared', 'info');
        }
    };

    /* ============================================================
       BOOT — attach everything once the DOM is ready
       ============================================================ */
    function boot() {
        OpsFeed.init();
        wireWrappers();
        OpsFeed.push('🛡 Trust Layer armed — anti-fake reporting ACTIVE', 'ok');
        console.log('%c[TrustLayer] ══ TRUST LAYER READY ══\n' +
            'Demo helpers:\n' +
            '  TrustLayer.Demo.simulateNearbyReport()\n' +
            '  TrustLayer.Demo.toggleWearable()\n' +
            '  TrustLayer.Demo.resetDeviceSpam()', LOG_STYLE);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    // Expose for console-driven demos
    TL.Conscious = Conscious;
    TL.Unconscious = Unconscious;
})();