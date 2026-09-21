import re

with open("antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    content = f.read()

# -------------------------------------------------------------------
# 1. Update ParticleSculpture with Audio Reactive & Supernova logic
# -------------------------------------------------------------------
OLD_SCULPTURE_CONSTRUCTOR = """    this.renderMode = options.renderMode || "particles";

    if (!this.ctx) return;"""

NEW_SCULPTURE_CONSTRUCTOR = """    this.renderMode = options.renderMode || "particles";
    this.audioReactive = false;
    this.audioAnalyser = null;
    this.audioData = null;
    this.supernova = false;
    this.supernovaStart = 0;
    this.savedColor = null;

    if (!this.ctx) return;"""

if OLD_SCULPTURE_CONSTRUCTOR in content:
    content = content.replace(OLD_SCULPTURE_CONSTRUCTOR, NEW_SCULPTURE_CONSTRUCTOR, 1)
    print("ParticleSculpture constructor patched.")
else:
    print("WARNING: OLD_SCULPTURE_CONSTRUCTOR not matched.")

OLD_SCULPTURE_RENDER_START = """    const [r, g, b] = this.color;
    const scale = Math.min(w, h) * 0.265 * (this.zoom || 1);"""

NEW_SCULPTURE_RENDER_START = """    let [r, g, b] = this.color;

    // Audio reactive & Supernova calculation
    let audioBass = 0, audioMid = 0, audioTreble = 0;
    if (this.audioReactive && this.audioAnalyser && this.audioData) {
      try {
        this.audioAnalyser.getByteFrequencyData(this.audioData);
        audioBass = (this.audioData[1] + this.audioData[2] + this.audioData[3]) / 3 / 255;
        audioMid = (this.audioData[6] + this.audioData[8] + this.audioData[10]) / 3 / 255;
        audioTreble = (this.audioData[14] + this.audioData[18] + this.audioData[22]) / 3 / 255;
      } catch(e){}
    }

    if (this.supernova) {
      const elapsed = (performance.now() - this.supernovaStart) / 1000;
      if (elapsed > 4.5) {
        this.supernova = false;
        if (this.savedColor) this.color = [...this.savedColor];
      } else {
        r = 255; g = 215; b = 0; // Celestial Gold
      }
    }

    let scale = Math.min(w, h) * 0.265 * (this.zoom || 1);
    if (this.audioReactive) scale *= (1 + audioBass * 0.45);
    if (this.supernova) {
      const sElapsed = (performance.now() - this.supernovaStart) / 1000;
      if (sElapsed < 2.0) scale *= (1 + (2.0 - sElapsed) * 0.7);
    }"""

if OLD_SCULPTURE_RENDER_START in content:
    content = content.replace(OLD_SCULPTURE_RENDER_START, NEW_SCULPTURE_RENDER_START, 1)
    print("ParticleSculpture render start patched for audio & supernova.")
else:
    print("WARNING: OLD_SCULPTURE_RENDER_START not matched.")

# Point deformation for audio reactive
OLD_POINT_LOOP = """      if (this.shape === "wave" && !this.morphing) {
        py = Math.sin(point.x * 2.1 + this.time) *
             Math.cos(point.z * 1.8 + this.time * 0.65) * 0.55;
      }

      const x = point.x * cy - point.z * sy;"""

NEW_POINT_LOOP = """      if (this.shape === "wave" && !this.morphing) {
        py = Math.sin(point.x * 2.1 + this.time) *
             Math.cos(point.z * 1.8 + this.time * 0.65) * 0.55;
      }

      let px = point.x;
      if (this.audioReactive) {
        py += Math.sin(point.x * 4.2 + this.time * 2.5) * audioMid * 0.42;
        px += Math.cos(point.z * 4.2 + this.time * 2.5) * audioTreble * 0.35;
      }

      const x = px * cy - point.z * sy;"""

if OLD_POINT_LOOP in content:
    content = content.replace(OLD_POINT_LOOP, NEW_POINT_LOOP, 1)
    print("ParticleSculpture point loop patched for audio ripple.")
else:
    print("WARNING: OLD_POINT_LOOP not matched.")

# Add methods to ParticleSculpture prototype
SCULPTURE_METHODS = """
  setAudioReactive(active, analyserNode) {
    this.audioReactive = active;
    this.audioAnalyser = analyserNode;
    if (active && analyserNode) {
      this.audioData = new Uint8Array(analyserNode.frequencyBinCount);
    } else {
      this.audioData = null;
    }
    this.dirty = true;
  }

  triggerSupernova() {
    this.supernova = true;
    this.supernovaStart = performance.now();
    this.savedColor = [...this.color];
    this.color = [255, 215, 0];
    this.createGeometry("hypercube", true);
    this.dirty = true;
  }
"""

if "destroy() {" in content:
    content = content.replace("destroy() {", SCULPTURE_METHODS + "\n  destroy() {", 1)
    print("ParticleSculpture setAudioReactive and triggerSupernova methods added.")
else:
    print("WARNING: destroy() not matched in ParticleSculpture.")

# -------------------------------------------------------------------
# 2. Add Architecture Button to Project Cards in openDossier
# -------------------------------------------------------------------
OLD_OPEN_DOSSIER = """  dialogDemo.hidden = false;
  if (!preview) {
    preview = new ParticleSculpture(
      document.getElementById("preview-canvas"),
      { shape: p.shape, color: p.color }
    );
  } else {"""

NEW_OPEN_DOSSIER = """  // Add Architecture Deep Dive button if project has system architecture
  if (["sandforge", "emergency-mitra", "apex"].includes(p.id)) {
    const archBtn = document.createElement("button");
    archBtn.type = "button";
    archBtn.className = "card-arch-btn mono";
    archBtn.innerHTML = "<span>📐 System Architecture Deep Dive</span>";
    archBtn.addEventListener("click", () => {
      openArchModal(p.id === "sandforge" ? "sandforge" : p.id === "emergency-mitra" ? "emergency-mitra" : "apex");
    });
    dialogLinks.appendChild(archBtn);
  }

  dialogDemo.hidden = false;
  if (!preview) {
    preview = new ParticleSculpture(
      document.getElementById("preview-canvas"),
      { shape: p.shape, color: p.color }
    );
  } else {"""

if OLD_OPEN_DOSSIER in content:
    content = content.replace(OLD_OPEN_DOSSIER, NEW_OPEN_DOSSIER, 1)
    print("openDossier updated with Architecture Deep Dive button.")
else:
    print("WARNING: OLD_OPEN_DOSSIER not matched.")

# -------------------------------------------------------------------
# 3. Add Comprehensive Features & Event Handlers at End of Script
# -------------------------------------------------------------------
COMPREHENSIVE_FEATURES_JS = """
/* ==========================================================
   7 INTERACTIVE FEATURES CONTROLLER
========================================================== */

/* ---------- 1. 3D AVATAR SYSTEM & ABOUT TILT ---------- */
const avatarSwitchBtns = document.querySelectorAll(".avatar-switch-btn");
const mainAvatarImg = document.getElementById("main-avatar-img");
avatarSwitchBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    avatarSwitchBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    if (mainAvatarImg) {
      mainAvatarImg.style.opacity = "0.2";
      mainAvatarImg.style.transform = "scale(0.96)";
      setTimeout(() => {
        mainAvatarImg.src = btn.dataset.avatarSrc;
        mainAvatarImg.style.opacity = "1";
        mainAvatarImg.style.transform = "scale(1)";
      }, 160);
    }
  });
});

const aboutAvatarCard = document.getElementById("about-avatar-card");
if (aboutAvatarCard) {
  aboutAvatarCard.addEventListener("mousemove", e => {
    const rect = aboutAvatarCard.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    aboutAvatarCard.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) translateY(-4px)`;
  });
  aboutAvatarCard.addEventListener("mouseleave", () => {
    aboutAvatarCard.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg) translateY(0)";
  });
}

/* ---------- 2. DYNAMIC FOIL / HOLOGRAPHIC LIGHT SHEEN ---------- */
const bookCoverElem = document.getElementById("book-cover-front") || document.querySelector(".cover-front");
if (bookCoverElem) {
  bookCoverElem.addEventListener("mousemove", e => {
    const rect = bookCoverElem.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const angle = Math.round(Math.atan2(y - 50, x - 50) * (180 / Math.PI) + 180);
    bookCoverElem.style.setProperty("--foil-x", `${x}%`);
    bookCoverElem.style.setProperty("--foil-y", `${y}%`);
    bookCoverElem.style.setProperty("--foil-angle", `${angle}deg`);
    const tiltX = ((e.clientX - rect.left) / rect.width - 0.5) * 6;
    const tiltY = ((e.clientY - rect.top) / rect.height - 0.5) * -6;
    bookCoverElem.style.transform = `perspective(1000px) rotateY(${tiltX}deg) rotateX(${tiltY}deg)`;
  });
  bookCoverElem.addEventListener("mouseleave", () => {
    bookCoverElem.style.transform = "none";
  });
}

/* ---------- 3. INTERACTIVE PAGE CURL & DRAG-TO-PEEL PHYSICS ---------- */
let isDragPeeling = false;
let dragStartX = 0;
let dragActiveLeaf = null;
let dragIsForward = true;

if (bookElem) {
  bookElem.addEventListener("pointerdown", e => {
    if (e.target.closest("button, a, .cert-card-row, .toc-item")) return;
    if (isFlipping) return;
    const rect = bookElem.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    dragStartX = e.clientX;

    if (clickX > rect.width * 0.45 && currentLeaf < totalLeaves) {
      isDragPeeling = true;
      dragIsForward = true;
      dragActiveLeaf = bookLeaves[currentLeaf];
      if (dragActiveLeaf) {
        dragActiveLeaf.classList.add("leaf-dragging");
        dragActiveLeaf.style.zIndex = 60;
      }
    } else if (clickX <= rect.width * 0.45 && currentLeaf > 0) {
      isDragPeeling = true;
      dragIsForward = false;
      dragActiveLeaf = bookLeaves[currentLeaf - 1];
      if (dragActiveLeaf) {
        dragActiveLeaf.classList.add("leaf-dragging");
        dragActiveLeaf.style.zIndex = 60;
      }
    }
  });

  window.addEventListener("pointermove", e => {
    if (!isDragPeeling || !dragActiveLeaf) return;
    const rect = bookElem.getBoundingClientRect();
    const bookWidth = rect.width;
    const dx = e.clientX - dragStartX;

    if (dragIsForward) {
      const progress = clamp(-dx / (bookWidth * 0.45), 0, 1);
      const angle = -progress * 180;
      dragActiveLeaf.style.transform = `rotateY(${angle}deg)`;
    } else {
      const progress = clamp(dx / (bookWidth * 0.45), 0, 1);
      const angle = -180 + progress * 180;
      dragActiveLeaf.style.transform = `rotateY(${angle}deg)`;
    }
  });

  const finishDragPeel = e => {
    if (!isDragPeeling || !dragActiveLeaf) return;
    isDragPeeling = false;
    const rect = bookElem.getBoundingClientRect();
    const bookWidth = rect.width;
    const dx = e.clientX - dragStartX;

    dragActiveLeaf.classList.remove("leaf-dragging");
    dragActiveLeaf.style.transform = "";

    if (dragIsForward) {
      if (-dx > bookWidth * 0.16) {
        flipForward();
      } else {
        updateBookState();
      }
    } else {
      if (dx > bookWidth * 0.16) {
        flipBackward();
      } else {
        updateBookState();
      }
    }
    dragActiveLeaf = null;
  };

  window.addEventListener("pointerup", finishDragPeel);
  window.addEventListener("pointercancel", finishDragPeel);
}

/* ---------- 4. AUDIO-REACTIVE 3D PLAYGROUND ENGINE ---------- */
let synthRunning = false;
let synthOscs = [];
let synthGain = null;
let labAnalyser = null;

function toggleAudioReactiveMode() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch(e){}

  const toggleBtn = document.getElementById("lab-audio-toggle");
  const toggleText = document.getElementById("lab-audio-text");
  const micBtn = document.getElementById("lab-mic-toggle");
  const hud = document.getElementById("audio-visualizer-hud");

  if (!synthRunning && audioCtx) {
    labAnalyser = audioCtx.createAnalyser();
    labAnalyser.fftSize = 64;
    synthGain = audioCtx.createGain();
    synthGain.gain.setValueAtTime(0.09, audioCtx.currentTime);

    const freqs = [55, 110, 220, 277.18, 329.63];
    synthOscs = freqs.map((f, i) => {
      const osc = audioCtx.createOscillator();
      osc.type = i === 0 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(f, audioCtx.currentTime);
      const oscGain = audioCtx.createGain();
      oscGain.gain.setValueAtTime(1 / freqs.length, audioCtx.currentTime);
      osc.connect(oscGain);
      oscGain.connect(synthGain);
      osc.start();
      return osc;
    });

    synthGain.connect(labAnalyser);
    labAnalyser.connect(audioCtx.destination);

    lab.setAudioReactive(true, labAnalyser);
    synthRunning = true;

    if (toggleBtn) {
      toggleBtn.setAttribute("aria-pressed", "true");
      toggleBtn.style.background = "var(--acid)";
      toggleBtn.style.color = "#121410";
    }
    if (toggleText) toggleText.textContent = "Audio Mode: ON";
    if (micBtn) micBtn.style.display = "inline-flex";
    if (hud) {
      hud.style.display = "flex";
      renderVisualizerBars();
    }
  } else {
    synthOscs.forEach(o => { try { o.stop(); o.disconnect(); } catch(e){} });
    synthOscs = [];
    if (synthGain) { synthGain.disconnect(); synthGain = null; }
    lab.setAudioReactive(false, null);
    synthRunning = false;

    if (toggleBtn) {
      toggleBtn.setAttribute("aria-pressed", "false");
      toggleBtn.style.background = "";
      toggleBtn.style.color = "";
    }
    if (toggleText) toggleText.textContent = "Audio Mode: OFF";
    if (micBtn) micBtn.style.display = "none";
    if (hud) hud.style.display = "none";
  }
}

function renderVisualizerBars() {
  const hud = document.getElementById("audio-visualizer-hud");
  if (!hud) return;
  hud.innerHTML = "";
  for (let i = 0; i < 16; i++) {
    const seg = document.createElement("div");
    seg.className = "audio-bar-seg";
    hud.appendChild(seg);
  }

  function updateBars() {
    if (!synthRunning || !labAnalyser) return;
    const data = new Uint8Array(labAnalyser.frequencyBinCount);
    labAnalyser.getByteFrequencyData(data);
    const segs = hud.querySelectorAll(".audio-bar-seg");
    segs.forEach((seg, i) => {
      const val = data[i * 2] || 0;
      const h = Math.max(4, Math.round((val / 255) * 22));
      seg.style.height = `${h}px`;
    });
    requestAnimationFrame(updateBars);
  }
  updateBars();
}

const labAudioToggle = document.getElementById("lab-audio-toggle");
if (labAudioToggle) {
  labAudioToggle.addEventListener("click", toggleAudioReactiveMode);
}

/* ---------- 5. THE BEZIER GAME (ILLUSTRATOR MINI-GAME) ---------- */
const BEZIER_LEVELS = [
  {
    title: "LEVEL 1: S-CURVE WAVE",
    hint: "Align the nodes to match the golden dashed spline",
    target: [
      { x: 120, y: 320, hx1: 180, hy1: 140 },
      { x: 300, y: 120, hx1: 220, hy1: 80, hx2: 380, hy2: 160 },
      { x: 480, y: 320, hx1: 420, hy1: 400 }
    ],
    startNodes: [
      { x: 120, y: 360, hx1: 160, hy1: 240, hx2: 80, hy2: 400 },
      { x: 300, y: 220, hx1: 250, hy1: 180, hx2: 350, hy2: 220 },
      { x: 480, y: 360, hx1: 440, hy1: 300, hx2: 520, hy2: 280 }
    ]
  },
  {
    title: "LEVEL 2: SYMMETRIC HEART SPLINE",
    hint: "Sculpt the curve into a balanced heart contour with cusp apex",
    target: [
      { x: 300, y: 350, hx1: 200, hy1: 260 },
      { x: 180, y: 150, hx1: 180, hy1: 90, hx2: 260, hy2: 90 },
      { x: 300, y: 180, hx1: 280, hy1: 140, hx2: 320, hy2: 140 }
    ],
    startNodes: [
      { x: 280, y: 340, hx1: 220, hy1: 280, hx2: 160, hy2: 340 },
      { x: 220, y: 190, hx1: 200, hy1: 140, hx2: 280, hy2: 150 },
      { x: 340, y: 260, hx1: 320, hy1: 200, hx2: 400, hy2: 280 }
    ]
  },
  {
    title: "LEVEL 3: ILLUSTRATOR PEN NIB",
    hint: "Recreate the iconic Adobe Illustrator fountain pen contour",
    target: [
      { x: 300, y: 100, hx1: 240, hy1: 180 },
      { x: 220, y: 260, hx1: 220, hy1: 300, hx2: 260, hy2: 340 },
      { x: 300, y: 360, hx1: 280, hy1: 340, hx2: 320, hy2: 340 }
    ],
    startNodes: [
      { x: 300, y: 140, hx1: 260, hy1: 200, hx2: 200, hy2: 240 },
      { x: 240, y: 280, hx1: 220, hy1: 320, hx2: 280, hy2: 330 },
      { x: 320, y: 340, hx1: 310, hy1: 330, hx2: 360, hy2: 300 }
    ]
  }
];

let bezierLevel = 0;
let bezierAccuracy = 0;
let isBezierGameMode = false;

function initBezierGameLevel(lvl) {
  bezierLevel = lvl % BEZIER_LEVELS.length;
  const cfg = BEZIER_LEVELS[bezierLevel];
  bezierNodes = JSON.parse(JSON.stringify(cfg.startNodes));
  
  const title = document.getElementById("bezier-level-title");
  const hint = document.getElementById("bezier-level-hint");
  const nextBtn = document.getElementById("bezier-next-btn");
  if (title) title.textContent = cfg.title;
  if (hint) hint.textContent = cfg.hint;
  if (nextBtn) nextBtn.style.display = "none";
  
  drawVectorStudio();
}

function calculateBezierAccuracy() {
  if (!isBezierGameMode) return 0;
  const cfg = BEZIER_LEVELS[bezierLevel];
  const tgt = cfg.target;
  let totalDist = 0;
  const count = Math.min(tgt.length, bezierNodes.length);
  for (let i = 0; i < count; i++) {
    const d1 = Math.hypot(tgt[i].x - bezierNodes[i].x, tgt[i].y - bezierNodes[i].y);
    const d2 = Math.hypot(tgt[i].hx1 - bezierNodes[i].hx1, tgt[i].hy1 - bezierNodes[i].hy1);
    totalDist += (d1 + d2) / 2;
  }
  const avgDist = totalDist / count;
  const acc = Math.max(0, Math.min(100, Math.round(100 - avgDist * 0.85)));
  bezierAccuracy = acc;

  const txt = document.getElementById("bezier-accuracy-text");
  const fill = document.getElementById("bezier-meter-fill");
  if (txt) txt.textContent = `${acc}%`;
  if (fill) fill.style.width = `${acc}%`;
  return acc;
}

const verifySplineBtn = document.getElementById("bezier-verify-btn");
const nextLevelBtn = document.getElementById("bezier-next-btn");

if (verifySplineBtn) {
  verifySplineBtn.addEventListener("click", () => {
    const acc = calculateBezierAccuracy();
    if (acc >= 80) {
      playPageTurnSound();
      const hint = document.getElementById("bezier-level-hint");
      if (hint) {
        hint.innerHTML = `<span style="color:var(--acid); font-weight:700;">🎉 LEVEL PASSED! (${acc}% Precision) — Adobe Vector Precision Master!</span>`;
      }
      if (nextLevelBtn) nextLevelBtn.style.display = "inline-flex";
    } else {
      const hint = document.getElementById("bezier-level-hint");
      if (hint) {
        hint.innerHTML = `<span style="color:#ff754d;">Need 80%+ to clear (Current: ${acc}%). Drag anchor nodes & handles closer!</span>`;
      }
    }
  });
}

if (nextLevelBtn) {
  nextLevelBtn.addEventListener("click", () => {
    initBezierGameLevel(bezierLevel + 1);
  });
}

// Hook preset button
const bezierGamePresetBtn = document.getElementById("preset-bezier-game");
if (bezierGamePresetBtn) {
  bezierGamePresetBtn.addEventListener("click", () => {
    document.querySelectorAll("[data-preset]").forEach(b => b.classList.remove("active"));
    bezierGamePresetBtn.classList.add("active");
    vPreset = "bezier";
    isBezierGameMode = true;
    const hud = document.getElementById("bezier-game-hud");
    if (hud) hud.style.display = "flex";
    initBezierGameLevel(0);
  });
}

// Draw target guide curve when in game mode
const origDrawVectorStudio = drawVectorStudio;
drawVectorStudio = function() {
  origDrawVectorStudio();
  if (isBezierGameMode && vCanvas && vCtx) {
    const cfg = BEZIER_LEVELS[bezierLevel];
    const tgt = cfg.target;
    vCtx.save();
    vCtx.setLineDash([6, 6]);
    vCtx.strokeStyle = "rgba(255, 215, 0, 0.65)";
    vCtx.lineWidth = 2;
    vCtx.beginPath();
    vCtx.moveTo(tgt[0].x, tgt[0].y);
    vCtx.bezierCurveTo(tgt[0].hx1, tgt[0].hy1, tgt[1].hx1, tgt[1].hy1, tgt[1].x, tgt[1].y);
    if (tgt[2]) {
      vCtx.bezierCurveTo(tgt[1].hx2 || tgt[1].hx1, tgt[1].hy2 || tgt[1].hy1, tgt[2].hx1, tgt[2].hy1, tgt[2].x, tgt[2].y);
    }
    vCtx.stroke();
    vCtx.restore();
    calculateBezierAccuracy();
  }
};

/* ---------- 6. ARCHITECTURE MODAL CONTROLLER ---------- */
const ARCH_DATA = {
  sandforge: {
    title: "SandForge — Autonomous Multi-Agent GitHub PR Engine",
    subtitle: "Built for Nebius × NVIDIA Global AI Hackathon",
    flowchart: `
<svg viewBox="0 0 760 380" style="width:100%; height:auto;" aria-label="SandForge Architecture Flowchart">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#d6ff62" />
    </marker>
    <marker id="arrow-fail" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#ff754d" />
    </marker>
  </defs>
  <g transform="translate(30, 40)">
    <rect width="180" height="60" rx="8" fill="#171915" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
    <text x="16" y="26" fill="#8c9082" font-size="10" font-family="monospace">STAGE 01 · TRIGGER</text>
    <text x="16" y="46" fill="#fff" font-size="12" font-weight="bold" font-family="monospace">GitHub Task / Issue</text>
  </g>
  <path d="M 210 70 L 270 70" stroke="#d6ff62" stroke-width="2" marker-end="url(#arrow)"/>
  <g transform="translate(280, 40)">
    <rect width="210" height="60" rx="8" fill="#171915" stroke="#d6ff62" stroke-width="1.5"/>
    <text x="16" y="26" fill="#d6ff62" font-size="10" font-family="monospace">NVIDIA NEMOTRON 3 NANO</text>
    <text x="16" y="46" fill="#fff" font-size="12" font-weight="bold" font-family="monospace">Hierarchical AST Planner</text>
  </g>
  <path d="M 490 70 L 540 70" stroke="#d6ff62" stroke-width="2" marker-end="url(#arrow)"/>
  <g transform="translate(550, 40)">
    <rect width="180" height="60" rx="8" fill="#171915" stroke="#b8a2ff" stroke-width="1.5"/>
    <text x="16" y="26" fill="#b8a2ff" font-size="10" font-family="monospace">NEBIUS TOKEN FACTORY</text>
    <text x="16" y="46" fill="#fff" font-size="12" font-weight="bold" font-family="monospace">ConTree VM Snapshot t0</text>
  </g>
  <path d="M 640 100 L 640 160" stroke="#d6ff62" stroke-width="2" marker-end="url(#arrow)"/>
  <g transform="translate(520, 160)">
    <rect width="210" height="60" rx="8" fill="#171915" stroke="#83e1ff" stroke-width="1.5"/>
    <text x="16" y="26" fill="#83e1ff" font-size="10" font-family="monospace">NEMOTRON 3 SUPER (120B)</text>
    <text x="16" y="46" fill="#fff" font-size="12" font-weight="bold" font-family="monospace">MoE Reasoning Patch Gen</text>
  </g>
  <path d="M 520 190 L 450 190" stroke="#d6ff62" stroke-width="2" marker-end="url(#arrow)"/>
  <g transform="translate(260, 160)">
    <rect width="180" height="60" rx="8" fill="#171915" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
    <text x="16" y="26" fill="#8c9082" font-size="10" font-family="monospace">ISOLATED SANDBOX</text>
    <text x="16" y="46" fill="#fff" font-size="12" font-weight="bold" font-family="monospace">Test Suite (npm test)</text>
  </g>
  <path d="M 260 190 L 200 190" stroke="#d6ff62" stroke-width="2"/>
  <path d="M 200 190 L 200 280 L 430 280" stroke="#ff754d" stroke-width="1.5" stroke-dasharray="4 4" marker-end="url(#arrow-fail)"/>
  <text x="210" y="270" fill="#ff754d" font-size="10" font-family="monospace">TEST FAILS (Escalate Strategy 1-4 & Rollback Snapshot)</text>
  <g transform="translate(440, 255)">
    <rect width="260" height="50" rx="6" fill="#201512" stroke="#ff754d" stroke-width="1.2"/>
    <text x="14" y="22" fill="#ff754d" font-size="10" font-weight="bold" font-family="monospace">ROLLBACK & ESCALATE</text>
    <text x="14" y="38" fill="#dcd8c8" font-size="10.5" font-family="monospace">~140ms VM Checkpoint Rewind</text>
  </g>
  <path d="M 640 255 L 640 220" stroke="#ff754d" stroke-width="1.5" stroke-dasharray="4 4" marker-end="url(#arrow-fail)"/>
  <path d="M 200 190 L 140 190" stroke="#d6ff62" stroke-width="2" marker-end="url(#arrow)"/>
  <g transform="translate(20, 160)">
    <rect width="110" height="60" rx="8" fill="#152012" stroke="#d6ff62" stroke-width="2"/>
    <text x="12" y="26" fill="#d6ff62" font-size="9" font-weight="bold" font-family="monospace">TESTS PASS</text>
    <text x="12" y="46" fill="#fff" font-size="11" font-weight="bold" font-family="monospace">Verified PR ↗</text>
  </g>
</svg>`,
    specs: [
      { label: "Planner Model", val: "NVIDIA Nemotron 3 Nano Omni" },
      { label: "Patch Synthesizer", val: "Nemotron 3 Super (120B-A12B)" },
      { label: "Sandbox Platform", val: "Nebius Token Factory Sandboxes" },
      { label: "Rollback Latency", val: "~140ms per VM checkpoint" },
      { label: "Escalation Depth", val: "4-Tier Strategy Cascade" },
      { label: "Verification Rate", val: "6/6 Test Suites Passed" }
    ],
    links: [
      { label: "Inspect SandForge Repo ↗", href: "https://github.com/AntrikshH90/sandforge" },
      { label: "Demo Target Repo ↗", href: "https://github.com/AntrikshH90/sandforge-demo" }
    ]
  },
  "emergency-mitra": {
    title: "Emergency Mitra — Real-Time MedTech Routing Engine",
    subtitle: "Built for Smart India Hackathon (SIH 2026)",
    flowchart: `
<svg viewBox="0 0 760 260" style="width:100%; height:auto;" aria-label="Emergency Mitra Flowchart">
  <defs>
    <marker id="arrow2" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#ff956c" />
    </marker>
  </defs>
  <g transform="translate(20, 30)">
    <rect width="150" height="70" rx="8" fill="#171915" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
    <text x="14" y="28" fill="#8c9082" font-size="10" font-family="monospace">INPUT STAGE</text>
    <text x="14" y="48" fill="#fff" font-size="11" font-weight="bold" font-family="monospace">Voice / Text SOS</text>
  </g>
  <path d="M 170 65 L 210 65" stroke="#ff956c" stroke-width="2" marker-end="url(#arrow2)"/>
  <g transform="translate(220, 30)">
    <rect width="160" height="70" rx="8" fill="#171915" stroke="#ff956c" stroke-width="1.5"/>
    <text x="14" y="28" fill="#ff956c" font-size="10" font-family="monospace">AI EDGE TRIAGE</text>
    <text x="14" y="48" fill="#fff" font-size="11" font-weight="bold" font-family="monospace">Severity Scoring (1-5)</text>
  </g>
  <path d="M 380 65 L 420 65" stroke="#ff956c" stroke-width="2" marker-end="url(#arrow2)"/>
  <g transform="translate(430, 30)">
    <rect width="160" height="70" rx="8" fill="#171915" stroke="#83e1ff" stroke-width="1.5"/>
    <text x="14" y="28" fill="#83e1ff" font-size="10" font-family="monospace">GEO-ROUTER</text>
    <text x="14" y="48" fill="#fff" font-size="11" font-weight="bold" font-family="monospace">Haversine + Traffic</text>
  </g>
  <path d="M 590 65 L 620 65" stroke="#ff956c" stroke-width="2" marker-end="url(#arrow2)"/>
  <g transform="translate(630, 30)">
    <rect width="110" height="70" rx="8" fill="#152012" stroke="#d6ff62" stroke-width="1.5"/>
    <text x="12" y="28" fill="#d6ff62" font-size="9" font-family="monospace">DISPATCH</text>
    <text x="12" y="48" fill="#fff" font-size="11" font-weight="bold" font-family="monospace">PWA Alert ↗</text>
  </g>
</svg>`,
    specs: [
      { label: "Architecture", val: "Offline-First Service Worker PWA" },
      { label: "Deployment", val: "Vercel Edge Network" },
      { label: "Geo Engine", val: "Dynamic Haversine + Traffic Matrix" },
      { label: "Hackathon Track", val: "Smart India Hackathon (SIH '26)" }
    ],
    links: [
      { label: "Open Live App (emergency-mitra.vercel.app) ↗", href: "https://emergency-mitra.vercel.app" }
    ]
  },
  apex: {
    title: "Apex Intelligence — Multi-Modal Agentic Studio Engine",
    subtitle: "Enterprise Autonomous Agent Infrastructure",
    flowchart: `
<svg viewBox="0 0 760 240" style="width:100%; height:auto;" aria-label="Apex Engine Architecture">
  <defs>
    <marker id="arrow3" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#d6ff62" />
    </marker>
  </defs>
  <g transform="translate(30, 30)">
    <rect width="180" height="60" rx="8" fill="#171915" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
    <text x="14" y="26" fill="#8c9082" font-size="10" font-family="monospace">INGESTION PIPELINE</text>
    <text x="14" y="46" fill="#fff" font-size="11" font-weight="bold" font-family="monospace">APIs, Docs, Audio Streams</text>
  </g>
  <path d="M 210 60 L 260 60" stroke="#d6ff62" stroke-width="2" marker-end="url(#arrow3)"/>
  <g transform="translate(270, 30)">
    <rect width="210" height="60" rx="8" fill="#171915" stroke="#b8a2ff" stroke-width="1.5"/>
    <text x="14" y="26" fill="#b8a2ff" font-size="10" font-family="monospace">RAG & GRAPH EMBEDDINGS</text>
    <text x="14" y="46" fill="#fff" font-size="11" font-weight="bold" font-family="monospace">Hybrid Vector + Knowledge Graph</text>
  </g>
  <path d="M 480 60 L 530 60" stroke="#d6ff62" stroke-width="2" marker-end="url(#arrow3)"/>
  <g transform="translate(540, 30)">
    <rect width="190" height="60" rx="8" fill="#171915" stroke="#d6ff62" stroke-width="1.5"/>
    <text x="14" y="26" fill="#d6ff62" font-size="10" font-family="monospace">AGENTIC CONTROLLER</text>
    <text x="14" y="46" fill="#fff" font-size="11" font-weight="bold" font-family="monospace">LangChain / Claude / Nemotron</text>
  </g>
</svg>`,
    specs: [
      { label: "Core Foundation", val: "Apex Intelligence Studio" },
      { label: "Orchestration", val: "LangChain, LlamaIndex, Nemotron 3" },
      { label: "User Interfaces", val: "Full-Stack 3D Web + Web Audio" },
      { label: "Production Builds", val: "20+ Real-World Deployments" }
    ],
    links: [
      { label: "Explore Apex Studio Section ↗", href: "#apex" }
    ]
  }
};

function renderArchitectureModal(key) {
  const data = ARCH_DATA[key] || ARCH_DATA.sandforge;
  const body = document.getElementById("arch-body");
  if (!body) return;

  body.innerHTML = `
    <div style="margin-bottom:12px;">
      <h3 style="font-size:18px; color:#fff; margin:0 0 4px;">${data.title}</h3>
      <p style="font-size:12px; color:#8c9082; margin:0;">${data.subtitle}</p>
    </div>
    <div class="arch-flow-box">${data.flowchart}</div>
    <div class="arch-specs-grid">
      ${data.specs.map(s => `
        <div class="arch-spec-card">
          <div class="arch-spec-label mono">${s.label}</div>
          <div class="arch-spec-val mono">${s.val}</div>
        </div>
      `).join("")}
    </div>
    <div style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
      ${data.links.map(l => `
        <a href="${l.href}" ${l.href.startsWith("http") ? 'target="_blank" rel="noopener"' : ''} class="pill mono" style="font-size:11px; padding:8px 16px;">
          ${l.label}
        </a>
      `).join("")}
    </div>
  `;
}

function openArchModal(key = "sandforge") {
  renderArchitectureModal(key);
  const archModal = document.getElementById("arch-dialog");
  if (archModal) {
    document.querySelectorAll(".arch-tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.arch === key);
    });
    if (typeof archModal.showModal === "function") {
      archModal.showModal();
    } else {
      archModal.open = true;
    }
    document.body.classList.add("modal-open");
  }
}

const archCloseBtn = document.getElementById("arch-dialog-close");
if (archCloseBtn) {
  archCloseBtn.addEventListener("click", () => {
    const archModal = document.getElementById("arch-dialog");
    if (archModal) {
      if (typeof archModal.close === "function") archModal.close();
      else archModal.open = false;
    }
    document.body.classList.remove("modal-open");
  });
}

document.querySelectorAll(".arch-tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".arch-tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderArchitectureModal(btn.dataset.arch);
  });
});

/* ---------- 7. PORTFOLIO EASTER EGGS (KONAMI CODE & SUPERNOVA) ---------- */
const KONAMI_CODE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
let konamiIndex = 0;

function playVictoryFanfare() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const now = audioCtx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      gain.gain.setValueAtTime(0.12, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.36);
    });
  } catch(e){}
}

function triggerSupernovaEasterEgg() {
  playVictoryFanfare();
  if (typeof hero !== "undefined" && hero && typeof hero.triggerSupernova === "function") {
    hero.triggerSupernova();
  }
  if (typeof lab !== "undefined" && lab && typeof lab.triggerSupernova === "function") {
    lab.triggerSupernova();
  }
  const toast = document.getElementById("supernova-toast");
  if (toast) {
    toast.classList.add("active");
    setTimeout(() => { toast.classList.remove("active"); }, 5500);
  }
}

window.addEventListener("keydown", e => {
  const key = e.key.toLowerCase();
  if (e.key === KONAMI_CODE[konamiIndex] || key === KONAMI_CODE[konamiIndex].toLowerCase()) {
    konamiIndex++;
    if (konamiIndex === KONAMI_CODE.length) {
      konamiIndex = 0;
      triggerSupernovaEasterEgg();
    }
  } else {
    konamiIndex = 0;
  }

  if (e.key.toLowerCase() === "g" && !["input", "textarea"].includes((document.activeElement || {}).tagName?.toLowerCase() || "")) {
    triggerSupernovaEasterEgg();
  }
});
"""

# Insert right before </script>
content = content.replace("</script>", COMPREHENSIVE_FEATURES_JS + "\n</script>", 1)
print("Comprehensive features JS appended.")

with open("antriksh-portfolio-studio.html", "w", encoding="utf-8") as f:
    f.write(content)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated both antriksh-portfolio-studio.html and index.html!")
