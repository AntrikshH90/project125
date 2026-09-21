# 📋 Emergency Mitra — Feature & Task Tracker
### Built vs Pending — poora project ek nazar mein · Updated: 2026-09-03
Legend: ✅ BUILT & LIVE · 🟡 PARTIAL · ⬜ PENDING (roadmap)

---

## 1️⃣ Citizen App (Frontend)

| Feature | Status | Notes |
|---|---|---|
| Guided Emergency Wizard (4-step: type → subtype → symptoms → guidance) | ✅ | 6 emergency types, 33+ subtypes |
| Zero-tap Bystander SOS (legal ack + GPS + evidence chain) | ✅ | TrustLayer pipeline integrated |
| SOS pressed-state + haptic (vibrate) feedback | ✅ | |
| Speak Emergency (voice complaint) v2 | ✅ | Continuous listening, fuzzy slips, 3 alternatives, live transcript, EN/HI/MR (62+ Devanagari keywords) |
| First-Aid Listen button (TTS voice-out of Do's) | ✅ | speechSynthesis, EN/HI/MR voices |
| Trust-score breakdown UI (0–100 ring + factor table) | ✅ | Real engine call, judges ke liye auditable |
| Facilities Finder (11 Wardha facilities, haversine, call/directions) | ✅ | |
| Live bed-availability badges (green/amber/FULL) | ✅ | Capacity-aware routing proof |
| Facility booking (persistent via localStorage) | ✅ | Offline → outbox queue |
| Account Hub (OTP mock, profile, identity-strength meter) | ✅ | Demo Mode |
| Offline Emergency Passport (live citizen data, initials QR) | ✅ | Sign-in pe personalized |
| Interactive Tutorial + Demo Mode (33-test protected) | ✅ | |
| Three languages EN/HI/MR | 🟡 | Core UI covered; long-tail strings pending |
| Low-literacy icon-first mode | 🟡 | Icons-heavy UI already; dedicated mode pending |
| Web Push notifications (case status) | ⬜ | W4 |
| PWA manifest + service worker (installable) | ⬜ | W2 |
| Camera evidence upload w/ EXIF strip | ⬜ | W3 (capture hooks ready) |
| e-Prescription / record timeline citizen view | ⬜ | W5 |

## 2️⃣ Trust Layer (Anti-Fake Engine) — HUMARA DIFFERENTIATOR

| Feature | Status | Notes |
|---|---|---|
| Weighted credibility engine (0–100, every factor justified) | ✅ | base 20, OTP +26, DigiLocker +28, photo +20, GPS +15, spam −40... |
| Tier mapping HIGH/MEDIUM/LOW → auto-dispatch / operator / volunteer | ✅ | |
| Device fingerprinting + spam pattern flag | ✅ | DEV-XXXX ids, −40 penalty |
| Multi-report triangulation (50m/5min cluster boost) | ✅ | +12 to +21 |
| Wearable telemetry ingestion (HR spike, fall, impact-g) | ✅ | Mock payloads |
| IVR call-back verification pipeline (simulated lifecycle) | ✅ | DIALING→RINGING→ANSWERED→IVR_CONFIRMED |
| Volunteer micro-routing ping (≤500m verified volunteers) | ✅ | Wardha mock registry |
| Live-evidence floor (photo/voice can never be LOW) | ✅ | |
| 33 automated regression tests | ✅ | trust 13 · facilities 8 · tutorial 12 |
| Server-side scoring (same rules in Python) | ⬜ | W2 (JS↔Python test vectors planned) |

## 3️⃣ Command Dashboard (Ops)

| Feature | Status | Notes |
|---|---|---|
| Case feed with 🛡 trust chips (score + tier, hover = reason) | ✅ | Overview + Active Cases dono |
| Golden-Hour Journey timeline (Filed→Verified→Dispatched→En Route→Facility→Closed) | ✅ | Click case ID |
| Live District Map (Leaflet + OSM: facilities, tier-colored cases, ambulances) | ✅ | |
| KPI cards (active cases, ambulances, beds...) | ✅ | |
| Hospital bed management panel | ✅ | |
| Patients directory (+ signed-in citizen auto-row) | ✅ | |
| Medical inventory table | ✅ | |
| Ambulance fleet & GPS cards | ✅ | |
| Broadcast alert center | ✅ | UI level |
| Quick Admission (files real case into feed) | ✅ | |
| WebSocket live sync (real-time push) | ⬜ | W2 (mock sync exists) |
| Charts (cases/day, response trends) | ⬜ | W3-W5 |

## 4️⃣ Advanced Emergency Network (6 interactive cards)

| Feature | Status | Notes |
|---|---|---|
| Pre-Arrival Handshake — live ACK/Decline + bed reserve + ETA countdown + TTS | ✅ | Decline → auto-reroute Sevagram |
| AI Preliminary Triage — 10-symptom interactive engine, score → priority → file case | ✅ | On-device rule engine |
| Smart Ambulance Dispatch — nearest-unit haversine selection, animated run, live ETA | ✅ | 4-unit fleet |
| Resource Inventory — editable +/- stock, auto CRITICAL alert, localStorage persist | ✅ | 4 facilities |
| Audio-First IVR — real TTS call simulator, keypad flow, files case | ✅ | Exotel prod path W5 |
| Offline Passport — signed-in citizen's real medical ID | ✅ | |

## 5️⃣ Offline-First Layer

| Feature | Status | Notes |
|---|---|---|
| Outbox queue (localStorage) for wizard/SOS/booking | ✅ | js/outbox.js |
| Auto-sync on reconnect → dashboard feed | ✅ | |
| Live online/offline pill + status panel (queued items list) | ✅ | |
| Service worker caching (app shell offline) | ⬜ | W2-W4 |
| Background sync API | ⬜ | W4 |

## 6️⃣ Backend / Infra (Production Build)

| Feature | Status | Notes |
|---|---|---|
| FastAPI scaffold + /health | ⬜ | W1 |
| Docker compose (api, postgis, redis, minio) | ⬜ | W1 |
| Postgres schema + Alembic migrations | ⬜ | W1-W3 |
| Real OTP (MSG91) + JWT auth | ⬜ | W1-W2 |
| Cases API + server-side scoring + audit log | ⬜ | W2 |
| WebSocket /ws/ops + /ws/citizen | ⬜ | W2 |
| Evidence upload (S3/MinIO presigned, SHA-256 chain) | ⬜ | W3 |
| FHIR Patient/Encounter + ABDM hooks | ⬜ | W3 |
| Referral/SLA engine, queue/token APIs | ⬜ | W4 |
| IVR (Exotel sandbox) + teleconsult (LiveKit) | ⬜ | W5 |
| CI/CD, staging deploy, load test (200 users) | ⬜ | W1, W6 |
| OWASP ZAP clean + DPDP compliance doc | ⬜ | W7 |

## 7️⃣ AI/ML

| Feature | Status | Notes |
|---|---|---|
| Audio emergency classifier (scream/crash) | ⬜ | W2-W4 (Colab PoC planned) |
| Triage NLP (LLM zero-shot, golden-set eval) | ⬜ | W3-W4 |
| Fraud anomaly detection | ⬜ | W4-W5 |
| Shadow mode → blend on | ⬜ | W5-W6 |
| On-device rule engine (AI support ab bina ML ke) | ✅ | AI Triage card + sound-profile mock |

## 8️⃣ Repo Hygiene / SIH Submission Kit

| Item | Status |
|---|---|
| GitHub org repo (Apex-intelligence-ai/SIH_26), code-only | ✅ |
| CI (GitHub Actions: 33 tests + syntax check on push/PR) | ✅ |
| README (badges, story, structure, roadmap) · LICENSE (MIT) · CONTRIBUTING · SECURITY | ✅ |
| Issue/PR templates, .editorconfig, package.json scripts | ✅ |
| GitHub Pages live deploy | ✅ |
| Mobile-first polish (sheet modals, safe-area, no-zoom inputs) | ✅ |
| Encoding integrity (UTF-8, emojis, Devanagari clean) | ✅ |
| 2-min demo video | ⬜ | *submission task* |
| 4-slide deck + PPT fixes (MAITRY, SMS claim, Trust Score USP#1) | ⬜ | *submission task* |
| SIH portal abstract (draft ready in SCREENING_PLAN.md) | ⬜ | *submission task* |

---

**Snapshot:** ~85% prototype features built & live · Backend/ML/PWA pending by design (8-week roadmap) · Screening blocker sirf video + PPT hai.


