<div align="center">

<img src="logo.png" alt="Emergency Mitra" width="88"/>

# 🚑 Emergency Mitra

**Right Care. Right Facility. Right Now.**

[![CI](https://github.com/Apex-intelligence-ai/SIH_26/actions/workflows/ci.yml/badge.svg)](https://github.com/Apex-intelligence-ai/SIH_26/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-33%20passing-brightgreen)](#-running-it)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![SIH 2026](https://img.shields.io/badge/Smart%20India%20Hackathon-2026-FF6B35)
![PS-26133](https://img.shields.io/badge/PS-SIH26133%20·%20HealthTech-2E86AB)

*Trust-scored emergency routing network for rural India*

</div>

Emergency Mitra is a trust-scored emergency routing network for rural India, built for
**Smart India Hackathon 2026** (Problem Statement **SIH-26133** — *"Accessibility and
quality of public healthcare services, particularly in rural and underserved areas"*,
Govt. of Maharashtra, MedTech/HealthTech).

It started with a simple, uncomfortable fact: in districts like Wardha, people don't die
because help doesn't exist. They die because nobody nearby knows *which* facility has a
free ICU bed, O2, blood, or antivenom — and because a handful of fake calls poison the
trust that the whole 108 system runs on. Emergency Mitra attacks both problems at once.

---

## 💡 The Idea in 30 Seconds

| The rural reality | What Emergency Mitra does |
|---|---|
| Ambulances route to the *nearest* hospital, not the one that can actually treat you | Capacity-aware routing — beds, ICU, O2, blood & antivenom checked **before** dispatch |
| Fake & prank emergency calls waste scarce ambulances | A weighted **credibility score (0–100)** built from device fingerprints, GPS accuracy, evidence, multi-report triangulation — with legal accountability (BNS §54 ack) |
| Nobody can verify an unconscious patient's identity | Pre-verified medical identity (OTP + ABHA/DigiLocker in the roadmap) |
| Apps fail on ₹8,000 phones and 2G networks | Lightweight PWA, three languages (English / हिंदी / मराठी), icon-only mode for low-literacy users |

**Two golden journeys:**
1. **Guided Emergency Wizard** — conscious victim/bystander answers simple questions,
   attaches photo/audio/GPS evidence, files the case.
2. **Zero-tap SOS** — for when the victim is unconscious. One long-press, legal ack,
   GPS lock, evidence chain — no other interaction needed.

Both land on a **Command Dashboard** where a district duty officer sees the case with a
trust chip and verifies/dispatches in seconds.

---

## 🔐 The Trust Layer (our differentiator)

Most teams build "an app". We built the *guardrails* that make an emergency app
deployable by a government:

- **Device fingerprinting** — repeat/spam reporters are caught across sessions
- **Evidence capture** — photo, 5-second audio, GPS with accuracy value
- **Triangulation** — multiple independent reports of the same incident boost the score
- **Weighted credibility engine** — every point has a written justification
  (e.g. *verified OTP +26, photo evidence +20, no-GPS −5, spam patterns −40*)
- **Legal accountability** — the SOS flow records a versioned BNS §54 acknowledgement
- **Graceful degradation** — if a signal is missing, scoring continues with what's known

The scoring rules live in [`js/trust/credibility-engine.js`](js/trust/credibility-engine.js)
and are locked down by tests — same inputs, same score, every time.

---

## ✨ Current Features (working prototype)

- 🧙 **Guided Emergency Wizard** — type → questions → evidence → file
- 🆘 **Zero-tap Bystander SOS** with legal ack + GPS + evidence chain
- 🏥 **Facilities Finder** — 11 Wardha facilities seeded, GPS distance sort, call/directions
- 📊 **Command Dashboard** — live-style case feed, trust chips, patient directory
- 🔊 **Audio evidence capture** — 5s recording straight into the case
- 🌐 **Three languages** — English, हिंदी, मराठी (partial coverage, being completed)
- 👤 **Account Hub** — OTP login, medical profile, identity-strength meter (Demo Mode)
- 🎓 **Interactive tutorial + Demo Mode** — train ASHAs and duty officers in-app
- 🖼 **Low-literacy friendly UI** — icons first, minimal text

---

## 🧪 Running It

No build step. No npm install. That's deliberate — this must run on government machines
and low-end phones without ceremony.

```bash
# Option 1 — just open it
# Double-click index.html (or use a local server for camera/GPS features:)

# Option 2 — recommended (enables camera/GPS which need a real origin)
python -m http.server 8000        # or: npx serve .
# open http://localhost:8000
```

### Tests

The regression suites are plain Node scripts — zero dependencies:

```bash
npm test            # all 33 tests (trust + facilities + tutorial)
npm run test:trust  # scoring rules only
```

**33 tests, all green.** If a change breaks a suite, it doesn't ship — CI
(GitHub Actions) runs the same suites on every push and pull request.

---

## 🗺️ Repository Structure

```
SIH_26/
├── index.html                      # Single-page app (citizen + dashboard modals)
├── logo.png
├── css/
│   ├── styles.css                  # Custom styles (hero, wizard, modals, dashboard)
│   └── trust.css                   # Trust layer UI (legal banner, evidence panel, OTP)
├── js/
│   ├── app.js                      # Citizen flows: hero, wizard, SOS, facilities
│   ├── admin.js                    # Command dashboard logic
│   ├── account.js                  # Account hub: OTP (mock), profile, identity meter
│   ├── facilities.js               # Facilities finder (haversine + cache)
│   ├── translations.js             # EN/HI/MR strings
│   ├── tailwind-config.js          # Design tokens
│   ├── tutorial.js                 # Interactive tutorial + Demo Mode
│   └── trust/
│       ├── credibility-engine.js   # ⭐ The scoring rules (pure, tested)
│       ├── device-trust.js         # Device fingerprinting + spam guard
│       ├── evidence-capture.js     # Camera / GPS / 5s audio capture
│       └── trust-ui.js             # Trust chips, badges, risk UI
└── test/
    ├── test-credibility-engine.js
    ├── test-facilities.js
    └── test-tutorial.js
```

---

## 🛠️ Tech Choices (and why)

| Layer | Choice | Why |
|---|---|---|
| Frontend (prototype) | HTML5 + Tailwind + **vanilla JS** | Zero-build = fast on rural Android phones, deploys as plain static files (NIC-hosting friendly) |
| Frontend (production v2) | **Next.js 15 + TypeScript** | SEO for public health pages, typed codebase for 6-member team, Vercel/NIC hosting |
| App model | **PWA** | Installable without an app store, works offline — critical for 2G/3G belts |
| Maps & geo | Leaflet + haversine now → **PostGIS** at scale | Distance queries belong in the database at district scale |
| Backend | **FastAPI (Python) + REST + WebSocket** | Async for concurrent SOS bursts; PostGIS makes triangulation a first-class query |
| Database | **PostgreSQL + PostGIS** + **Redis** | PostGIS for geo-triangulation; Redis for OTP TTL, rate limits, token revocation |
| Vector search | **Qdrant** | RAG over first-aid protocols & drug formularies in EN/HI/MR |
| Auth | OTP via MSG91 + JWT | Indian provider, judges and pilots recognize it |
| AI/ML | **LangGraph agent pipeline + Whisper STT + ONNX classifiers** | Whisper for Hindi/Marathi voice complaints; LangGraph orchestrates triage→scoring→dispatch agents; ONNX audio classifier for scream/crash; rules keep working if ML is down |

---

## 🛣️ Roadmap to Production

This repo is the **working prototype** — the product spine is real and tested. The
production build (8-week plan) adds, in order:

1. **Weeks 1–2** — FastAPI scaffold, Postgres schema, real OTP/JWT auth, cases API
2. **Weeks 3–4** — Evidence upload with SHA-256 chain, server-side scoring, WebSocket
   live dashboard, offline-first queue + background sync
3. **Weeks 5–6** — IVR call-back verification (Exotel sandbox), teleconsult, queue/token
   system, ASHA mode, **LangGraph triage agents + Whisper voice pipeline** in shadow mode
4. **Weeks 7–8** — Security hardening (OWASP ZAP), UAT on real devices, pilot docs,
   rehearsals and submission

Target pilot: **Wardha district** with a signed MoU — District Collector + District
Health Officer.

---

## 👥 Team Apex Intelligence

| Member | Role |
|---|---|
| M1 | Team Lead · Architecture · Trust-scoring owner |
| M2 | Frontend Lead · Citizen app & PWA |
| M3 | Frontend · Command dashboard · i18n |
| M4 | Backend · APIs, auth, integrations |
| M5 | Database · DevOps · Security & compliance |
| M6 | AI/ML · Audio classifier, triage NLP, fraud detection |

---

## 🤝 Contributing

1. Create a branch from `main` (`feat/your-feature`)
2. Keep the three test suites green — run them before every commit
3. Open a PR; the lead reviews and merges only when CI passes

---

## 📄 License

Released under the **MIT License** — see [LICENSE](LICENSE).
Open source by choice: the data belongs to the government, the code belongs to everyone.

---

<div align="center">

**Emergency Mitra** — built by students who believe the nearest ambulance
should also be the *right* one.

*"Sahi Ilaaj. Sahi Asptaal. Abhi."*

</div>
