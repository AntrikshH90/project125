/* Headless functional test for js/trust/credibility-engine.js
   Validates: triangulation clustering, tier mapping, spam penalty. */
'use strict';
const fs = require('fs');
const path = require('path');

global.window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'trust', 'credibility-engine.js'), 'utf8'));
const CE = global.window.TrustLayer.CredEngine;

function assert(name, cond) {
    console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name);
    if (!cond) process.exitCode = 1;
}

// --- Test 1: LOW tier for anonymous report with zero evidence ---
CE.registerReport({ id: 'seed-0', lat: 20.8000, lng: 78.7000 }); // far away seed
const t1 = CE.scoreAlert({ id: 't1', lat: 20.7453, lng: 78.6022 });
assert('T1 low-evidence anonymous alert scores < 40 (got ' + t1.score + ')', t1.score < 40);
assert('T1 tier=LOW action=VOLUNTEER_VERIFICATION', t1.tier === 'LOW' && t1.action === 'VOLUNTEER_VERIFICATION');

// --- Test 2: HIGH tier for fully verified + evidenced + clustered ---
CE.registerReport({ id: 'near-1', lat: 20.74530, lng: 78.60220 });   // ~0 m
CE.registerReport({ id: 'near-2', lat: 20.74532, lng: 78.60222 });   // ~5 m
const t2 = CE.scoreAlert({
    id: 't2', lat: 20.74531, lng: 78.60221,
    digilockerVerified: true,
    cameraEvidence: { source: 'live-camera' },
    geo: { lat: 20.74531, lng: 78.60221, accuracyM: 8 },
    voiceMemo: { soundProfileConfidence: 82 }
});
console.log('   T2 factors:', t2.factors.map(f => f.label + ' (' + f.pts + ')').join(' | '));
assert('T2 triangulation detected cluster >= 3 (got ' + t2.triangulation.clusterSize + ')', t2.triangulation.clusterSize >= 3);
assert('T2 scores >= 80 (got ' + t2.score + ')', t2.score >= 80);
assert('T2 tier=HIGH action=AUTO_DISPATCH', t2.tier === 'HIGH' && t2.action === 'AUTO_DISPATCH');

// --- Test 3: MEDIUM band exists between thresholds ---
const t3 = CE.scoreAlert({ id: 't3', lat: 21.0000, lng: 79.0000, reporterVerified: true });
assert('T3 verified-only remote alert lands in MEDIUM band 40-79 (got ' + t3.score + ')',
    t3.score >= 40 && t3.score < 80);

// --- Test 4: Spam flag drags score down hard ---
const base = CE.scoreAlert({ id: 't4a', lat: 22.0, lng: 80.0, digilockerVerified: true, geo: { lat: 22, lng: 80 } });
const spammed = CE.scoreAlert({ id: 't4b', lat: 22.0, lng: 80.0, digilockerVerified: true, geo: { lat: 22, lng: 80 }, spamFlagged: true });
assert('T4 spam penalty applied (-40): ' + base.score + ' -> ' + spammed.score, spammed.score === Math.max(0, base.score - 40));

// --- Test 5: Telemetry parsing ---
const tel = CE.ingestTelemetry({ wearable: { heartRate: 138, heartRateSpike: true, impactG: 3.1, fallDetected: true } });
assert('T5 telemetry confirms emergency', tel.available && tel.confirmsEmergency);
assert('T5 no telemetry handled gracefully', !CE.ingestTelemetry({}).available);

// --- Test 6: Volunteer ping radius (mock registry) ---
const vp = CE.pingVolunteers({ lat: 20.74620, lng: 78.60280 }); // VOL-101 exact coords
assert('T6 volunteers notified within 500m: ' + vp.notified.length, vp.notified.length >= 1 && vp.notified.length <= 3);
const vpFar = CE.pingVolunteers({ lat: 21.5000, lng: 79.5000 });
assert('T6 no volunteers beyond 500m', vpFar.notified.length === 0);

// --- Test 7: Distance math sanity (~111 km per degree latitude) ---
const d = CE.distanceM(20.0, 78.0, 21.0, 78.0);
assert('T7 haversine 1 deg lat ~ 111km (got ' + Math.round(d / 1000) + 'km)', Math.abs(d - 111195) < 1200);

// --- Test 8: LIVE-EVIDENCE FLOOR — photo/audio/wearable can never be LOW ---
// Quiet 5s memo, no geo, anonymous: raw score 23 (<40) but a real human
// captured live audio on scene => engine must raise tier to MEDIUM.
const t8 = CE.scoreAlert({ id: 't8', lat: 23.0, lng: 81.0, voiceMemo: { soundProfileConfidence: 5 } });
assert('T8 evidence-backed alert is never LOW/STABLE (got ' + t8.score + '% ' + t8.tier + ')',
    t8.tier === 'MEDIUM' && t8.action === 'OPERATOR_CONFIRMATION');

console.log('\nDone.');
