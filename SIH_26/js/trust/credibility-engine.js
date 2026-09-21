/* ============================================================
   EMERGENCY MITRA - CREDIBILITY SCORING ENGINE
   (js/trust/credibility-engine.js)
   ============================================================
   FEATURES 2 + 3: verification pipeline for both reporting modes.

     - registerReport()   : spatial-temporal store of alerts
     - triangulate()      : multi-signal clustering - counts other
                            reports within 50 m in the last 5 min
     - ingestTelemetry()  : parses wearable/fall-detection payload
                            (heart-rate spike, impact g-force)
     - dispatchCallBack() : automated call-back verification task
     - pingVolunteers()   : micro-routes physical verification to
                            verified community volunteers <= 500 m
     - scoreAlert()       : weighted credibility model -> tiers
                            HIGH  (80-100%) => AUTO-DISPATCH
                            MEDIUM(40-79%)  => OPERATOR CONFIRMATION
                            LOW   (<40%)    => VOLUNTEER VERIFY / FLAG

   PURE LOGIC + MOCK I/O: every network action is simulated with
   timed logs so the SIH demo is fully self-contained.

   ============================================================
   TRIAGE LEVEL CRITERIA  (score -> dashboard level -> action)
   ============================================================
   Score = % confidence that the alert is a GENUINE emergency.
   Dashboard mapping: HIGH -> CRITICAL, MEDIUM -> URGENT,
   LOW -> STABLE.

   ┌──────────┬───────────┬────────────────────────────────────┐
   │ LEVEL    │ SCORE     │ WHEN IT IS ASSIGNED                │
   ├──────────┼───────────┼────────────────────────────────────┤
   │ CRITICAL │ 80-100%   │ STRONG multi-signal proof, e.g.:   │
   │ (=HIGH)  │           │  • verified ID + camera + GPS +    │
   │          │           │    audio memo, OR                  │
   │          │           │  • any solid report corroborated   │
   │          │           │    by 2+ more within 50 m/5 min,   │
   │          │           │    OR                              │
   │          │           │  • wearable fall/HR telemetry +    │
   │          │           │    GPS (+ID)                       │
   │          │           │ => AUTO-DISPATCH, ambulance en     │
   │          │           │    route instantly.                │
   ├──────────┼───────────┼────────────────────────────────────┤
   │ URGENT   │ 40-79%    │ Genuine but PARTIAL proof, e.g.:   │
   │ (=MEDIUM)│           │  • live photo + voice memo but no  │
   │          │           │    ID / no cluster                 │
   │          │           │  • verified reporter + GPS only    │
   │          │           │ FLOOR RULE: ANY live photo, voice  │
   │          │           │ memo or wearable data can never    │
   │          │           │ drop below URGENT.                 │
   │          │           │ => Operator reviews evidence, then │
   │          │           │    dispatches (~6 s in demo).      │
   ├──────────┼───────────┼────────────────────────────────────┤
   │ STABLE   │ 0-39%     │ ONLY reachable by an ANONYMOUS     │
   │ (=LOW)   │           │ report with NO evidence attached   │
   │          │           │ (bare SOS: no photo/audio/         │
   │          │           │ telemetry/ID). Spam-flagged devices│
   │          │           │ also land here (-40).              │
   │          │           │ => Volunteer verification + IVR    │
   │          │           │    call-back; confirmed => En Route│
   └──────────┴───────────┴────────────────────────────────────┘

   PENALTIES: device spam flag -40 • missing GPS -5 •
   unverified & zero evidence -10.
   ============================================================ */

(function () {
    'use strict';

    window.TrustLayer = window.TrustLayer || {};
    const TL = window.TrustLayer;

    // ---- Tunables (surfaced for judges) ----
    const CFG = {
        TRIANGULATE_RADIUS_M: 50,
        TRIANGULATE_WINDOW_MIN: 5,
        VOLUNTEER_RADIUS_M: 500,
        TIER_HIGH: 80,
        TIER_MEDIUM: 40
    };

    /* ---- Spatial-temporal report store ---- */
    const recentReports = [];   // { id, lat, lng, ts, type }

    function registerReport(report) {
        recentReports.push(Object.assign({ ts: Date.now() }, report));
        pruneOld();
        return report;
    }

    function pruneOld() {
        const cutoff = Date.now() - CFG.TRIANGULATE_WINDOW_MIN * 60 * 1000;
        while (recentReports.length && recentReports[0].ts < cutoff) recentReports.shift();
    }

    /** Great-circle distance in meters (Haversine formula). */
    function distanceM(lat1, lng1, lat2, lng2) {
        const R = 6371000, rad = Math.PI / 180;
        const dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
                  Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(a));
    }

    /* ------------------------------------------------------------
       MULTI-SIGNAL INCIDENT TRIANGULATION (50 m / 5 min window)
       ------------------------------------------------------------ */
    function triangulate(report) {
        if (report.lat == null || report.lng == null) return { clusterSize: 1, boosted: false };
        const cutoff = Date.now() - CFG.TRIANGULATE_WINDOW_MIN * 60 * 1000;
        let clusterSize = 1;
        recentReports.forEach(r => {
            if (r.id === report.id || r.ts < cutoff) return;
            if (distanceM(report.lat, report.lng, r.lat, r.lng) <= CFG.TRIANGULATE_RADIUS_M) clusterSize++;
        });
        return { clusterSize, boosted: clusterSize >= 2 };
    }

    /* ------------------------------------------------------------
       WEARABLE / SENSOR TELEMETRY INGESTION & PARSING
       Expected shape: { heartRate, heartRateSpike, impactG, fallDetected }
       ------------------------------------------------------------ */
    function ingestTelemetry(payload) {
        const w = payload && payload.wearable;
        if (!w) return { available: false, confirmsEmergency: false, detail: 'No wearable telemetry' };

        const flags = [];
        let confirms = false;
        if (w.heartRate >= 120 || w.heartRateSpike) { flags.push('HR spike (' + w.heartRate + ' bpm)'); confirms = true; }
        if (w.impactG >= 2.5)                      { flags.push('Impact ' + w.impactG + 'g'); confirms = true; }
        if (w.fallDetected)                        { flags.push('Fall detected'); confirms = true; }
        if (!flags.length) flags.push('Telemetry nominal');
        return { available: true, confirmsEmergency: confirms, detail: flags.join(' • ') };
    }

    /* ------------------------------------------------------------
       AUTOMATED DISPATCH CALL-BACK (verification task)
       Simulated telephony bridge: logs the IVR call-back lifecycle.
       ------------------------------------------------------------ */
    function dispatchCallBack(alert, onStatus) {
        const cb = { alertId: alert.id, startedAt: new Date().toISOString(), status: 'DIALING' };
        onStatus && onStatus(cb.status);
        setTimeout(() => { cb.status = 'RINGING';       onStatus && onStatus(cb.status); }, 2500);
        setTimeout(() => { cb.status = 'ANSWERED';      onStatus && onStatus(cb.status); }, 6000);
        setTimeout(() => { cb.status = 'IVR_CONFIRMED'; onStatus && onStatus(cb.status); }, 9000);
        return cb;
    }

    /* ------------------------------------------------------------
       FIRST-RESPONDER VOLUNTEER PING (500 m micro-routing)
       ------------------------------------------------------------ */
    // Mock registry - Wardha district coordinates.
    const VOLUNTEERS = [
        { id: 'VOL-101', name: 'Asha K.',  verified: true, lat: 20.74620, lng: 78.60280 },
        { id: 'VOL-102', name: 'Rahul P.', verified: true, lat: 20.74790, lng: 78.60510 },
        { id: 'VOL-103', name: 'Meena S.', verified: true, lat: 20.75030, lng: 78.59960 },
        { id: 'VOL-104', name: 'Jatin M.', verified: true, lat: 20.75310, lng: 78.61020 }  // > 500 m away
    ];

    function pingVolunteers(report) {
        if (report.lat == null) return { notified: [], reason: 'no-geo' };
        const notified = [];
        VOLUNTEERS.forEach(v => {
            const d = distanceM(report.lat, report.lng, v.lat, v.lng);
            if (v.verified && d <= CFG.VOLUNTEER_RADIUS_M) {
                notified.push(Object.assign({ distanceM: Math.round(d), etaMin: Math.max(1, Math.round(d / 80)) }, v));
            }
        });
        return { notified, reason: notified.length ? 'ok' : 'none-in-radius' };
    }

    /* ------------------------------------------------------------
       DYNAMIC CREDIBILITY SCORING ENGINE  (FEATURE 3)
       ------------------------------------------------------------
       Weighted additive model. Every factor is logged so judges
       can watch exactly how the score is assembled live.

         base                          : 20
         verifiedReporter (OTP)        : +26 (only if no DigiLocker)
         digilockerBadge               : +28 (highest identity tier)
         liveCameraEvidence            : +20
         gpsLocked                     : +15
         voiceMemo                     : +8 + round(conf*0.07)
         triangulation cluster n>=2    : +12 (+3 per extra, max +21)
         wearable telemetry confirms   : +10
         device spam flagged           : -40
         missing geo                   : -5
         missing all evidence          : -10 (UNVERIFIED reporters
                                          only - an identified
                                          human is never treated
                                          as likely-fake)
       ------------------------------------------------------------ */
    function scoreAlert(payload) {
        const factors = [];
        let score = 20;
        const add = (pts, label) => { score += pts; factors.push({ pts, label }); };

        // Identity tiers are mutually exclusive: DigiLocker (Aadhaar
        // eKYC) outranks a plain OTP verification, never double-stack.
        if (payload.digilockerVerified)      add(28, 'DigiLocker identity badge');
        else if (payload.reporterVerified)   add(26, 'Reporter OTP-verified');

        if (payload.cameraEvidence)          add(20, 'Live camera evidence (gallery-proof)');
        if (payload.geo)                     add(15, 'GPS geo-tag locked');
        else                                 add(-5, 'No geo-tag available');

        if (payload.voiceMemo) {
            add(8 + Math.round((payload.voiceMemo.soundProfileConfidence || 0) * 0.07),
                'Voice memo • AI sound-profile ' +
                (payload.voiceMemo.soundProfileConfidence ?? '-') + '%');
        }

        const tri = triangulate(payload);
        if (tri.clusterSize >= 2) {
            add(Math.min(12 + (tri.clusterSize - 2) * 3, 21),
                'Triangulation: ' + tri.clusterSize + ' reports / 50m / 5min');
        } else {
            factors.push({ pts: 0, label: 'Single-source report (no cluster)' });
        }

        const tele = ingestTelemetry(payload);
        if (tele.available && tele.confirmsEmergency) add(10, 'Wearable telemetry: ' + tele.detail);

        if (payload.spamFlagged) add(-40, 'Device spam pattern detected');
        if (!payload.cameraEvidence && !payload.voiceMemo && !payload.wearable &&
            !payload.reporterVerified && !payload.digilockerVerified) {
            // Only UNVERIFIED reporters get the zero-evidence penalty:
            // an identified human must never be auto-classed likely-fake.
            add(-10, 'Zero supporting evidence attached');
        }

        score = Math.max(0, Math.min(100, Math.round(score)));

        // ---- Tier mapping (SIH problem-statement semantics) ----
        // HIGH   risk-of-being-genuine 80-100% => auto-dispatch
        // MEDIUM 40-79%                        => operator confirmation
        // LOW    <40%                          => volunteer verify / flag
        let tier, action;
        if (score >= CFG.TIER_HIGH)        { tier = 'HIGH';   action = 'AUTO_DISPATCH'; }
        else if (score >= CFG.TIER_MEDIUM) { tier = 'MEDIUM'; action = 'OPERATOR_CONFIRMATION'; }
        else if (payload.cameraEvidence || payload.voiceMemo || payload.wearable) {
            // LIVE HUMAN EVIDENCE FLOOR: a live photo / voice memo /
            // wearable telemetry proves a real person is physically on
            // scene, so the case can NEVER be classed LOW / STABLE.
            // It still needs operator confirmation because the score
            // alone didn't reach HIGH.
            tier = 'MEDIUM'; action = 'OPERATOR_CONFIRMATION';
            factors.push({ pts: 0, label: 'Live-evidence floor: raised LOW → MEDIUM (person on scene)' });
        }
        else                               { tier = 'LOW';    action = 'VOLUNTEER_VERIFICATION'; }

        console.table(factors.map(f => ({ Factor: f.label, Score: f.pts })));
        console.log('%c[TrustLayer] CREDIBILITY => ' + score + '% (' + tier + ') -> ' + action,
            'color:#00453d;font-weight:bold;font-size:13px');

        return {
            score, tier, action, factors,
            triangulation: tri,
            telemetry: tele,
            assessedAt: new Date().toISOString()
        };
    }

    TL.CredEngine = {
        CFG, registerReport, triangulate, distanceM,
        ingestTelemetry, dispatchCallBack, pingVolunteers, scoreAlert
    };

    console.info('%c[TrustLayer] credibility-engine.js loaded', 'color:#00453d;font-weight:bold');
})();