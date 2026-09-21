/* ============================================================
   EMERGENCY MITRA - EVIDENCE CAPTURE MODULE
   (js/trust/evidence-capture.js)
   ============================================================
   FEATURE 1 support: Conscious Person Mode evidence chain.

     - captureGeo()        : GPS lockdown - lat/lng/timestamp with
                             high accuracy. Never blocks the flow:
                             resolves null on denial/timeout so the
                             emergency always goes through.
     - CameraCapture       : camera-ONLY live capture. Uses
                             getUserMedia directly - there is no
                             file input anywhere, so gallery
                             uploads are structurally impossible.
     - recordVoiceMemo()   : 5-second ambient audio via MediaRecorder
                             + AnalyserNode RMS sampling -> returns a
                             mock AI "sound-profile confidence" score.

   All methods degrade gracefully: permission denied => evidence
   marked MISSING and the credibility engine lowers the score,
   but the alert is never suppressed.
   ============================================================ */

(function () {
    'use strict';

    window.TrustLayer = window.TrustLayer || {};
    const TL = window.TrustLayer;

    /* ------------------------------------------------------------
       GPS LOCKDOWN - geo-tag the emergency payload
       ------------------------------------------------------------ */
    function captureGeo(timeoutMs) {
        return new Promise(resolve => {
            if (!navigator.geolocation) {
                console.warn('[TrustLayer] Geolocation API unavailable');
                return resolve(null);
            }
            navigator.geolocation.getCurrentPosition(
                pos => resolve({
                    lat: +pos.coords.latitude.toFixed(6),
                    lng: +pos.coords.longitude.toFixed(6),
                    accuracyM: Math.round(pos.coords.accuracy),
                    capturedAt: new Date().toISOString(),
                    source: 'gps-lockdown'
                }),
                err => {
                    console.warn('[TrustLayer] GPS denied/error:', err.message);
                    resolve(null);
                },
                { enableHighAccuracy: true, timeout: timeoutMs || 8000, maximumAge: 0 }
            );
        });
    }

    /* ------------------------------------------------------------
       CAMERA-ONLY LIVE CAPTURE (no gallery possible by design)
       ------------------------------------------------------------ */
    const CameraCapture = {
        _stream: null,

        /** Open the rear camera into the given <video> element. */
        async open(videoEl) {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API unavailable in this browser');
            }
            this._stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 } },
                audio: false
            });
            videoEl.srcObject = this._stream;
            await videoEl.play().catch(() => { /* autoplay ok */ });
            return true;
        },

        /** Freeze one live frame to a JPEG data URL and release camera. */
        snap(videoEl) {
            if (!this._stream) throw new Error('Camera not open');
            const canvas = document.createElement('canvas');
            canvas.width = videoEl.videoWidth || 640;
            canvas.height = videoEl.videoHeight || 480;
            canvas.getContext('2d').drawImage(videoEl, 0, 0, canvas.width, canvas.height);
            this.close();
            return {
                dataUrl: canvas.toDataURL('image/jpeg', 0.7),
                capturedAt: new Date().toISOString(),
                source: 'live-camera'   // proves NOT a gallery upload
            };
        },

        close() {
            if (this._stream) {
                this._stream.getTracks().forEach(t => t.stop());
                this._stream = null;
            }
        }
    };

    /* ------------------------------------------------------------
       5-SECOND VOICE MEMO + AI SOUND-PROFILE CONFIDENCE
       Samples RMS loudness while recording; the mock model scores
       the energy/chaos of the ambience (crowd noise, distress,
       traffic). Real deployment swaps in a TF.js audio classifier.
       ------------------------------------------------------------ */
    function recordVoiceMemo(seconds) {
        const duration = seconds || 5;
        return new Promise(async resolve => {
            if (!navigator.mediaDevices || !window.MediaRecorder) {
                console.warn('[TrustLayer] MediaRecorder unavailable');
                return resolve(null);
            }
            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (e) {
                console.warn('[TrustLayer] Mic denied:', e.message);
                return resolve(null);
            }

            // --- AnalyserNode: sample RMS loudness while recording ---
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const srcNode = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 512;
            srcNode.connect(analyser);
            const buf = new Float32Array(analyser.fftSize);
            const samples = [];
            const sampler = setInterval(() => {
                analyser.getFloatTimeDomainData(buf);
                let sum = 0;
                for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
                samples.push(Math.sqrt(sum / buf.length));   // RMS frame
            }, 200);

            // --- Record for exactly `duration` seconds ---
            const chunks = [];
            const rec = new MediaRecorder(stream);
            rec.ondataavailable = e => chunks.push(e.data);
            rec.onstop = () => {
                clearInterval(sampler);
                stream.getTracks().forEach(t => t.stop());
                ctx.close();

                const blob = new Blob(chunks, { type: 'audio/webm' });

                // ---- MOCK AI SOUND-PROFILE MODEL v0.9 ----
                const peak = Math.max(...samples, 0.0001);
                const avg = samples.reduce((a, b) => a + b, 0) / (samples.length || 1);
                const energyScore = Math.min(peak / 0.08, 1);        // louder scene => more credible
                const variance = samples.reduce((a, b) => a + Math.pow(b - avg, 2), 0)
                                 / (samples.length || 1);
                const chaosScore = Math.min(variance * 400, 1);      // dynamic scene => real event
                const soundConfidence = Math.round(
                    (0.55 * energyScore + 0.45 * chaosScore) * 100);

                resolve({
                    blobUrl: URL.createObjectURL(blob),
                    durationSec: duration,
                    samples: samples.map(s => +s.toFixed(4)),
                    soundProfileConfidence: soundConfidence,          // 0..100
                    model: 'ambient-sound-profile-v0.9',
                    recordedAt: new Date().toISOString()
                });
            };
            rec.start();
            setTimeout(() => rec.state !== 'inactive' && rec.stop(), duration * 1000);
        });
    }
    TL.EvidenceCapture = { captureGeo, CameraCapture, recordVoiceMemo };

    console.info('%c[TrustLayer] evidence-capture.js loaded', 'color:#00453d;font-weight:bold');
})();