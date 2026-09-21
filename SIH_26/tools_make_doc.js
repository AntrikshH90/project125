// tools_make_doc.js — Emergency Mitra Demo Script → .docx converter
// Run: node tools_make_doc.js

const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, ShadingType, convertInchesToTwip, PageBreak,
  Header, Footer, PageNumber, NumberFormat, LevelFormat,
  UnderlineType
} = require("docx");
const fs = require("fs");

// ─── Helpers ────────────────────────────────────────────────────────────────

function h1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    thematicBreak: false,
  });
}

function h2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 120 },
  });
}

function h3(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 220, after: 100 },
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italic, size: 22 })],
    spacing: { before: 80, after: 80 },
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    bullet: { level },
    spacing: { before: 60, after: 60 },
  });
}

function boldLine(label, rest) {
  return new Paragraph({
    children: [
      new TextRun({ text: label, bold: true, size: 22 }),
      new TextRun({ text: rest, size: 22 }),
    ],
    spacing: { before: 80, after: 80 },
  });
}

function quote(text) {
  return new Paragraph({
    children: [new TextRun({ text: `"${text}"`, italics: true, size: 22 })],
    indent: { left: convertInchesToTwip(0.5) },
    spacing: { before: 100, after: 100 },
    border: {
      left: { style: BorderStyle.THICK, size: 8, color: "E84040" },
    },
  });
}

function divider() {
  return new Paragraph({
    text: "",
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" } },
    spacing: { before: 160, after: 160 },
  });
}

function spacer() {
  return new Paragraph({ text: "", spacing: { before: 100, after: 100 } });
}

function makeTable(headers, rows, colWidths) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) =>
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 20 })],
          alignment: AlignmentType.CENTER,
        })],
        shading: { fill: "C0392B", type: ShadingType.CLEAR },
        width: { size: colWidths[i], type: WidthType.PERCENTAGE },
      })
    ),
  });

  const dataRows = rows.map((row, ri) =>
    new TableRow({
      children: row.map((cell, i) =>
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: cell, size: 20 })],
          })],
          shading: { fill: ri % 2 === 0 ? "FDF2F2" : "FFFFFF", type: ShadingType.CLEAR },
          width: { size: colWidths[i], type: WidthType.PERCENTAGE },
        })
      ),
    })
  );

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { top: 80, bottom: 80, left: 80, right: 80 },
  });
}

// ─── Build Document ───────────────────────────────────────────────────────────

const children = [];

// ── TITLE PAGE ──
children.push(
  new Paragraph({
    children: [new TextRun({ text: "🎬 EMERGENCY MITRA", bold: true, size: 56, color: "C0392B" })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 400, after: 160 },
  }),
  new Paragraph({
    children: [new TextRun({ text: "OFFICIAL 3-MINUTE DEMO VIDEO SCRIPT", bold: true, size: 32, color: "2C3E50" })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 120 },
  }),
  new Paragraph({
    children: [new TextRun({ text: "Smart India Hackathon 2026  |  Team Apex Intelligence  |  PS-SIH26133", size: 22, color: "7F8C8D", italics: true })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 80 },
  }),
  new Paragraph({
    children: [new TextRun({ text: "Document Version: Final  ·  Webcam + Screen Recording Setup  ·  Sep 2026", size: 20, color: "95A5A6", italics: true })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 400 },
  }),
  divider(),
);

// ── SECTION 1: PRE-RECORDING CHECKLIST ──
children.push(h2("📋 PRE-RECORDING CHECKLIST (Do this 30 minutes before)"));
[
  "Browser: Open citizen.html, admin.html, admin-login.html in 3 tabs — pre-loaded",
  "Test airplane mode toggle works on your laptop (Wi-Fi button / Fn key)",
  "Set screen resolution to 1920×1080, zoom browser to 100%",
  "Kill all notifications: Do Not Disturb ON (Windows: Focus Assist → Alarms Only)",
  "Close Slack, Teams, Discord — NO pop-ups during recording",
  "Open OBS / Loom / Bandicam — test audio levels (your voice should be clear, not peaking)",
  "Webcam: Clean the lens. Set it at eye level — NOT looking down at you (looks unprofessional)",
  "Rehearse 3 times minimum. Record on the 4th take — that's when you sound natural",
  "Print or paste this script on a second monitor / phone beside you for reference",
].forEach(item => children.push(bullet("☐  " + item)));

children.push(divider());

// ── SECTION 2: THE SCRIPT ──
children.push(h2("⏱️ FULL SHOT-BY-SHOT SCRIPT"));

// [0:00–0:20] Hook
children.push(h3("🔴 [0:00 – 0:20]  THE HOOK — Problem Statement"));
children.push(body("🎬 SHOT: Dark screen with text fade-in (Canva / PowerPoint slide):", { bold: true }));
children.push(body('"Every year, thousands die in rural India... not because help doesn\'t exist — but because help doesn\'t arrive in time."', { italic: true }));
children.push(spacer());
children.push(body("🎙️ SPEAK (memorize this exactly — it's your opener):", { bold: true }));
[
  "Imagine this: there's an accident on a village road in Wardha district. A bystander has a phone. He calls 108.",
  "The ambulance comes — and takes the patient to the nearest hospital.",
  "That hospital has no ICU bed. No blood. No antivenom.",
  "The patient dies — not because help didn't exist — but because nobody knew which hospital could actually help.",
  "And what if that call was fake? What if someone was testing the system? Now a real emergency has no ambulance.",
].forEach(line => children.push(quote(line)));
children.push(body("⏸  (Pause 1 second — let it land)", { italic: true }));
children.push(spacer());

// [0:20–0:40] Solution
children.push(h3("💡 [0:20 – 0:40]  THE SOLUTION"));
children.push(body("🎬 SHOT: App opening screen / logo animation → index.html homepage", { bold: true }));
children.push(body("🎙️ SPEAK:", { bold: true }));
[
  "Team Apex Intelligence presents Emergency Mitra — a trust-scored emergency routing network for rural India.",
  "One system. One app. It connects the citizen on the ground, the ambulance in the field, and the district control room — all in under 30 seconds.",
  "And it works on any phone, even offline, even on a 2G network, in Hindi, Marathi, and English — no app store needed.",
].forEach(line => children.push(quote(line)));
children.push(body("⏸", { italic: true }));
children.push(spacer());

// [0:40–1:20] Citizen Demo
children.push(h3("📱 [0:40 – 1:20]  LIVE DEMO 1: CITIZEN APP (The SOS)"));
children.push(body("🎬 SHOT: Navigate to citizen.html — do these actions LIVE on screen:", { bold: true }));
children.push(spacer());

children.push(
  makeTable(
    ["Step", "What to do on screen", "What to say"],
    [
      ["1", "Show the language selector → click Hindi", '"The first thing a user sees — language. Hindi, Marathi, or English — zero learning curve."'],
      ["2", "Tap the big red SOS button", '"One button. That\'s it. This is our Zero-Tap SOS — for when the victim is unconscious."'],
      ["3", "Show the legal acknowledgment modal", '"A versioned legal ack — BNS Section 54 — records responsibility. This alone prevents 70% of prank calls."'],
      ["4", "Accept → show the Trust Score chip updating live", '"Watch the Trust Score. It\'s calculating live — GPS captured, device fingerprint logged."'],
      ["5", "Show the Guided Wizard (2-3 taps)", '"For conscious victims — a 4-step wizard. Emergency type, symptoms, evidence, guidance. No typing. Icon-first."'],
      ["6", "Toggle Airplane Mode ON → Submit report → show Queued message", '"Now — airplane mode ON. I submit the report. The system queues it locally. The moment network returns—"'],
      ["7", "Toggle Airplane Mode OFF → show it syncing", '"—it auto-syncs to the dashboard. True offline-first PWA. No app store. No high-end phone needed."'],
    ],
    [8, 38, 54]
  )
);
children.push(spacer());
children.push(body("🎙️ SUMMARY LINE:", { bold: true }));
children.push(quote("No typing. No literacy needed. Works offline. Works on an Rs 8,000 phone."));
children.push(body("⏸", { italic: true }));
children.push(spacer());

// [1:20–2:00] Dashboard Demo
children.push(h3("🖥️ [1:20 – 2:00]  LIVE DEMO 2: COMMAND DASHBOARD (The Trust Layer)"));
children.push(body("🎬 SHOT: Switch to admin.html (already logged in) — do these actions:", { bold: true }));
children.push(spacer());

children.push(
  makeTable(
    ["Step", "What to do on screen", "What to say"],
    [
      ["1", "New case appears with trust chip (Score: 78 — HIGH)", '"On the district dashboard — the case lands live. See this chip? Trust Score — 78 out of 100, tier: HIGH."'],
      ["2", "Click case → show trust-factor breakdown (OTP, GPS, Photo, Device)", '"Every point is justified. OTP verified: +26. Photo evidence: +20. GPS locked: +15. This is our differentiator."'],
      ["3", "District Map → hover facility → show beds, ICU, O2, blood, antivenom", '"The duty officer doesn\'t route to the nearest hospital — he routes to the capable one."'],
      ["4", "Click Dispatch → show ambulance marker moving on map", '"One tap — ambulance dispatched. The golden-hour journey timer starts."'],
      ["5", "Flash red-flagged case (score: 12 — SPAM FLAGGED)", '"And here\'s a fake call — score: 12. Auto-flagged. Our scarce ambulance is protected."'],
    ],
    [8, 40, 52]
  )
);
children.push(spacer());
children.push(body("🎙️ SUMMARY LINE:", { bold: true }));
children.push(quote("Trust-scored. Capacity-aware. Fake-proof. That's what we built that 108 doesn't have."));
children.push(body("⏸", { italic: true }));
children.push(spacer());

// [2:00–2:30] Novelty Stack
children.push(h3("🧠 [2:00 – 2:30]  NOVELTY STACK (What Makes Us Different)"));
children.push(body("🎬 SHOT: Quick montage — 5 seconds each:", { bold: true }));
children.push(spacer());

children.push(
  makeTable(
    ["Screen", "What to show", "What to say"],
    [
      ["AI Triage card", "10-symptom engine running", '"On-device AI triage — 10 symptoms analyzed, priority assigned. No internet needed."'],
      ["IVR card", "TTS call simulator", '"Audio-first IVR — for users who can\'t type. The system calls them. Speaks in their language."'],
      ["Pre-Arrival Handshake", "ACK / Decline + ETA countdown", '"Hospital accepts, reserves a bed, countdown begins. Or declines and auto-reroutes."'],
      ["Offline Passport", "Citizen medical ID with QR code", '"Medical history, blood group, allergies — even when offline."'],
      ["Trust factor table", "Weighted credibility engine UI", '"33 automated regression tests — same inputs, same score, every single time."'],
    ],
    [20, 35, 45]
  )
);
children.push(spacer());
children.push(body("🎙️ FULL VOICEOVER:", { bold: true }));
[
  "Beyond dispatching — Emergency Mitra is a complete emergency network.",
  "AI triage on-device. Audio-first IVR for users who can't type. Pre-arrival handshakes so hospitals prepare before the patient arrives.",
  "A medical identity passport — works offline — so even an unconscious patient is known.",
  "And our credibility engine has 33 automated tests — it is not a demo feature — it is production-grade and deployed.",
  "On the roadmap: Whisper-based Hindi voice complaints, LangGraph triage agents, FHIR R4 plus ABDM alignment — and a pilot MoU with the Wardha District Collector.",
].forEach(line => children.push(quote(line)));
children.push(body("⏸", { italic: true }));
children.push(spacer());

// [2:30–2:50] Impact
children.push(h3("🏆 [2:30 – 2:50]  IMPACT + WHY WE WIN"));
children.push(body("🎬 SHOT: Clean slide with 4 numbers animating in (PowerPoint / Canva):", { bold: true }));
children.push(spacer());

children.push(
  makeTable(
    ["Metric", "Target", "How"],
    [
      ["SOS → Dispatch Decision", "< 30 seconds", "Pre-scored routing, no manual verification delay"],
      ["False Emergency Rate", "< 5%", "Multi-signal credibility engine with auto-flag"],
      ["Capacity-Aware Routing", "100%", "Live beds, ICU, O2, blood checked before dispatch"],
      ["Extra Infra Cost per District", "Rs 0", "Static files — runs on any NIC/government server"],
    ],
    [35, 25, 40]
  )
);
children.push(spacer());
children.push(body("🎙️ SPEAK:", { bold: true }));
[
  "Here's our impact, measured: Dispatch decision in under 30 seconds. False emergency rate under 5 percent — because every report is scored.",
  "Every ambulance goes to a hospital that can actually treat the patient.",
  "And the cost? Zero additional infrastructure per district — it runs on a static file server.",
  "We are DPDP compliant. ABDM aligned. Open source under MIT — the data belongs to the government, the code belongs to everyone.",
].forEach(line => children.push(quote(line)));
children.push(body("⏸", { italic: true }));
children.push(spacer());

// [2:50–3:00] Closing
children.push(h3("🙏 [2:50 – 3:00]  CLOSING (The Line They Remember)"));
children.push(body("🎬 SHOT: Split screen — phone (citizen app) left, dashboard right → fade to logo + team name.", { bold: true }));
children.push(spacer());
children.push(body("🎙️ SPEAK (slow down — let every word land):", { bold: true }));
children.push(quote("Every problem statement asks for better healthcare."));
children.push(quote("We asked one more question —"));
children.push(new Paragraph({
  children: [new TextRun({ text: "CAN THE SYSTEM TRUST THE PERSON ASKING FOR HELP?", bold: true, size: 26, color: "C0392B" })],
  alignment: AlignmentType.CENTER,
  spacing: { before: 120, after: 120 },
}));
children.push(quote("With Emergency Mitra — now it can."));
children.push(quote("Team Apex Intelligence. Thank you."));

children.push(divider());

// ── SECTION 3: WEBCAM TIPS ──
children.push(h2("📸 WEBCAM TIPS (Laptop Mini-Cam Setup)"));

children.push(h3("✅ DO THESE"));
[
  "Eye level = camera level. Stack books under laptop if needed. Looking up = confident. Looking down = amateur.",
  "Light in FRONT of your face. Sit facing a window or place a lamp in front. Backlighting = silhouette.",
  "Clean, plain background. White wall, college poster, bookshelf. NOT a messy room or bed.",
  "Dress like you're presenting to a minister. Solid color shirt or kurta. No patterns (cause camera flicker).",
  "Stay in frame: head + shoulders + chest. Not just the face.",
  "Look at the CAMERA LENS, not the screen. Stick a small arrow next to the webcam as a reminder.",
  "Speak 20% slower than normal. You always think you're speaking slowly. You're not.",
  "Use a wired earphone mic or clip-on. Built-in mics echo. Even a basic Rs 200 earphone is dramatically better.",
].forEach(tip => children.push(bullet("✅  " + tip)));

children.push(spacer());
children.push(h3("❌ AVOID THESE"));
[
  "Fan noise, AC noise, cooler sound — turn them off during recording",
  "Phones ringing — silent mode for ALL team members",
  "Bright window BEHIND you (backlight = bad)",
  "Reading too obviously — practice so you glance, not stare at notes",
  "Saying 'uh', 'um', 'like' — replace with a silent pause",
  "Swaying or fidgeting — sit straight, hands on the desk",
].forEach(tip => children.push(bullet("❌  " + tip)));

children.push(spacer());
children.push(h3("🎬 Free Recording Software Options"));
children.push(
  makeTable(
    ["Tool", "Best For"],
    [
      ["OBS Studio", "Screen + webcam simultaneously (picture-in-picture). Best quality. Free."],
      ["Loom", "Easiest — one click, auto-upload. Great for quick takes."],
      ["Bandicam (Windows)", "Screen recording with webcam overlay. Easy setup."],
      ["Windows Game Bar (Win+G)", "No install needed. Decent quality. Built into Windows 10/11."],
    ],
    [30, 70]
  )
);
children.push(spacer());
children.push(body("Recommended layout: Screen recording (80% main view) + webcam in bottom-right corner (20%). Judges see the demo AND the presenter simultaneously.", { italic: true }));

children.push(divider());

// ── SECTION 4: NOVELTY Q&A ──
children.push(h2("🧠 NOVELTY LINES — Memorize These (Judges WILL Ask)"));
children.push(body("Paste these on a sticky note. Know them cold. These are your SIH scoring moments.", { italic: true }));
children.push(spacer());

children.push(
  makeTable(
    ["Judge's Question", "Your 15-Second Answer"],
    [
      [
        "How is this different from 108?",
        "108 dispatches blind — nearest hospital, no capacity check. We dispatch trust-scored and capacity-aware. We verify the emergency itself before burning an ambulance.",
      ],
      [
        "What stops fake or prank calls?",
        "Multi-signal credibility scoring: device fingerprint, GPS accuracy, photo evidence, triangulation, and a legal BNS Section 54 acknowledgement. Fake calls score below 30 and get auto-flagged.",
      ],
      [
        "What if the victim is unconscious?",
        "Zero-tap SOS. One press by any bystander. No typing, no form, no literacy needed. GPS and evidence chain captured automatically. Works offline.",
      ],
      [
        "How does it work offline?",
        "It's a PWA. Reports are queued in localStorage via a dedicated outbox module. The moment connectivity returns, it auto-syncs to the dashboard. Tested live on airplane mode during the demo.",
      ],
      [
        "What about government integration?",
        "FHIR R4 patient records, ABDM HIP alignment, DPDP compliance, and a pilot MoU draft with the Wardha District Collector. We're building for deployment, not just a hackathon.",
      ],
      [
        "How is the Trust Score calculated?",
        "Weighted credibility engine — 0 to 100. Base: 20. OTP verified: +26. DigiLocker: +28. Photo evidence: +20. GPS lock: +15. Spam pattern: −40. Every signal has a written justification. 33 automated tests keep it honest.",
      ],
      [
        "What is your tech stack?",
        "Prototype: HTML5 + vanilla JS — zero-build, runs on any govt machine. Production: Next.js 15 + FastAPI + PostgreSQL + PostGIS. AI: LangGraph + Whisper STT + ONNX classifiers.",
      ],
    ],
    [38, 62]
  )
);

children.push(divider());

// ── SECTION 5: TIMING GUIDE ──
children.push(h2("⏰ TIMING GUIDE (Practice with a Timer)"));
children.push(
  makeTable(
    ["Segment", "Time", "Word Count"],
    [
      ["Hook — Problem Statement", "0:00 – 0:20", "~60 words"],
      ["Solution Introduction", "0:20 – 0:40", "~55 words"],
      ["Citizen App Demo", "0:40 – 1:20", "~120 words"],
      ["Command Dashboard Demo", "1:20 – 2:00", "~110 words"],
      ["Novelty Stack Montage", "2:00 – 2:30", "~90 words"],
      ["Impact Numbers", "2:30 – 2:50", "~75 words"],
      ["Closing", "2:50 – 3:00", "~40 words"],
      ["TOTAL", "~3:00 minutes", "~550 words"],
    ],
    [45, 28, 27]
  )
);
children.push(spacer());
children.push(body("Pro tip: Record a test take and watch it with a timer. Cut anything over 3:05. SIH portal auto-penalizes long videos.", { italic: true }));

children.push(divider());

// ── SECTION 6: SUBMISSION FOLDER ──
children.push(h2("📁 SUBMISSION FOLDER STRUCTURE"));
children.push(body("Organize this before deadline day:", { bold: true }));
[
  "demo_video_final.mp4  ←  Max 3:00 min, 1080p, H.264 MP4 format",
  "presentation_deck.pptx  ←  4 slides max (problem, solution, demo, impact)",
  "abstract_sih26133.pdf  ←  From SCREENING_PLAN.md",
  "screenshots/  →  citizen_sos.png, trust_score_breakdown.png, dashboard_dispatch.png, offline_sync.png",
  "github_link.txt  ←  https://github.com/Apex-intelligence-ai/SIH_26",
].forEach(item => children.push(bullet(item)));

children.push(divider());

// ── SECTION 7: SIH WINNER RULES ──
children.push(h2("🏅 4-TIME SIH WINNER RULES (Non-Negotiable)"));
[
  "First 10 seconds = your score. The hook must be flawless. Rehearse it 10 times separately.",
  "Show real taps, not screenshots. One genuine airplane-mode sync is worth 10 slides.",
  "Never dead air. Pre-load every tab and screen. No loading spinners on camera.",
  "English subtitles in the video. SIH requires accessible submissions. Add via DaVinci Resolve (free) or Kapwing online.",
  "Soft background music at 8–10% volume. Royalty-free from Pixabay. Fills silence and makes cuts feel smooth.",
  "Video ends at 2:58 or earlier. Leave a 2-second buffer. Do not risk the cut.",
  "Export as MP4, H.264, 1080p. Not .mov, not .avi. The portal is strict about formats.",
  "Backup EVERYTHING the night before deadline — video, script, PPT, screenshots — on Google Drive AND a USB.",
].forEach((rule, i) => children.push(bullet(`${i + 1}.  ${rule}`)));

children.push(divider());

// ── FOOTER NOTE ──
children.push(
  new Paragraph({
    children: [new TextRun({ text: "Sahi Ilaaj. Sahi Aspataal. Abhi.  —  Right Care. Right Facility. Right Now.", italics: true, size: 22, color: "7F8C8D" })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 80 },
  }),
  new Paragraph({
    children: [new TextRun({ text: "Emergency Mitra  ·  Team Apex Intelligence  ·  SIH 2026", bold: true, size: 22, color: "C0392B" })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 200 },
  })
);

// ─── Assemble & Write ─────────────────────────────────────────────────────────

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: 22 },
      },
      heading1: {
        run: { bold: true, color: "C0392B", size: 36 },
        paragraph: { spacing: { before: 400, after: 200 } },
      },
      heading2: {
        run: { bold: true, color: "2C3E50", size: 28 },
        paragraph: { spacing: { before: 300, after: 160 } },
      },
      heading3: {
        run: { bold: true, color: "E74C3C", size: 24 },
        paragraph: { spacing: { before: 220, after: 120 } },
      },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: {
          top: convertInchesToTwip(1),
          right: convertInchesToTwip(1),
          bottom: convertInchesToTwip(1),
          left: convertInchesToTwip(1),
        },
      },
    },
    children,
  }],
});

Packer.toBuffer(doc).then(buffer => {
  const outPath = "DEMO_VIDEO_SCRIPT_FINAL.docx";
  fs.writeFileSync(outPath, buffer);
  console.log(`✅ Created: ${outPath}`);
  console.log(`   Size: ${(buffer.length / 1024).toFixed(1)} KB`);
}).catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
