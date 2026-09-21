import re

with open("antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    code = f.read()

# -------------------------------------------------------------------
# 1. ADD 4 NEW GEOMETRIES TO ParticleSculpture.createGeometry
# -------------------------------------------------------------------
OLD_MOBIUS_BRANCH = """      } else if (shape === "mobius") {
        const u = (i / this.count) * TAU;
        const v = ((i % 24) / 23 - 0.5) * 0.85;
        x = (1.25 + v * Math.cos(u / 2)) * Math.cos(u);
        y = v * Math.sin(u / 2) * 1.35;
        z = (1.25 + v * Math.cos(u / 2)) * Math.sin(u);
      } else if (shape === "nib") {"""

NEW_MOBIUS_BRANCH = """      } else if (shape === "mobius") {
        const u = (i / this.count) * TAU;
        const v = ((i % 24) / 23 - 0.5) * 0.85;
        x = (1.25 + v * Math.cos(u / 2)) * Math.cos(u);
        y = v * Math.sin(u / 2) * 1.35;
        z = (1.25 + v * Math.cos(u / 2)) * Math.sin(u);
      } else if (shape === "lorenz") {
        const sigma = 10, rho = 28, beta = 8 / 3;
        let lx = 0.1, ly = 0, lz = 0;
        const dt = 0.009;
        const steps = (i + 1) * 7 + 90;
        for (let s = 0; s < steps; s++) {
          const dx = sigma * (ly - lx);
          const dy = lx * (rho - lz) - ly;
          const dz = lx * ly - beta * lz;
          lx += dx * dt;
          ly += dy * dt;
          lz += dz * dt;
        }
        x = (lx / 16) * 1.15;
        y = ((lz - 25) / 16) * 1.15;
        z = (ly / 16) * 1.15;
      } else if (shape === "calabi") {
        const u = (i / this.count) * TAU * 2;
        const v = ((i % 32) / 32) * Math.PI;
        const n = 5;
        const r = 1.1 + 0.35 * Math.cos(n * u) * Math.sin(v);
        x = r * Math.cos(u) * Math.sin(v);
        y = (r * Math.cos(v) + 0.3 * Math.sin(n * u)) * 1.1;
        z = r * Math.sin(u) * Math.sin(v);
      } else if (shape === "hopf") {
        const circle = i % 36;
        const fiber = Math.floor(i / 36);
        const totalFibers = this.count / 36;
        const theta = (fiber / totalFibers) * Math.PI;
        const phi = (fiber / totalFibers) * TAU * 3;
        const xi = (circle / 36) * TAU;
        const r1 = Math.cos(theta / 2);
        const r2 = Math.sin(theta / 2);
        const p1 = phi / 2 + xi;
        const p2 = phi / 2 - xi;
        const denom = 1.6 - r2 * Math.sin(p2);
        x = (r1 * Math.cos(p1) / denom) * 1.25;
        y = (r1 * Math.sin(p1) / denom) * 1.25;
        z = (r2 * Math.cos(p2) / denom) * 1.25;
      } else if (shape === "blackhole") {
        if (i < 200) {
          const jetSign = i % 2 === 0 ? 1 : -1;
          const jetDist = (Math.floor(i / 2) / 100);
          const r = 0.08 + jetDist * 0.22;
          const ang = i * 2.4;
          x = r * Math.cos(ang);
          z = r * Math.sin(ang);
          y = jetSign * (0.4 + jetDist * 2.2);
        } else {
          const diskIdx = i - 200;
          const r = 0.5 + Math.pow((diskIdx / 952), 0.75) * 1.8;
          const theta = diskIdx * 0.16;
          x = r * Math.cos(theta);
          z = r * Math.sin(theta);
          y = -0.45 / (r * 1.2 + 0.3) + 0.25;
        }
      } else if (shape === "nib") {"""

if OLD_MOBIUS_BRANCH in code:
    code = code.replace(OLD_MOBIUS_BRANCH, NEW_MOBIUS_BRANCH, 1)
    print("4 new geometries (lorenz, calabi, hopf, blackhole) added to createGeometry.")
else:
    print("WARNING: OLD_MOBIUS_BRANCH not matched.")

# -------------------------------------------------------------------
# 2. UPDATE LAB STATUS NAMES FOR 12 MODELS
# -------------------------------------------------------------------
OLD_STATUS_NAMES = """  const shapeNames = {
    knot: "Knot",
    sphere: "Orb",
    wave: "Wave",
    torus: "Torus Ring",
    helix: "DNA Double Helix",
    hypercube: "4D Tesseract",
    mobius: "Möbius Strip",
    nib: "Adobe Pen Nib"
  };"""

NEW_STATUS_NAMES = """  const shapeNames = {
    knot: "Trefoil Knot",
    sphere: "Fibonacci Orb",
    wave: "Harmonic Wave",
    torus: "Donut Torus Ring",
    helix: "DNA Double Helix",
    hypercube: "4D Tesseract",
    mobius: "Möbius Strip",
    nib: "Adobe Pen Nib",
    lorenz: "Lorenz Chaotic Attractor",
    calabi: "Calabi-Yau 6D Manifold",
    hopf: "Hopf Fibration Hypersphere",
    blackhole: "Accretion Singularity"
  };"""

if OLD_STATUS_NAMES in code:
    code = code.replace(OLD_STATUS_NAMES, NEW_STATUS_NAMES, 1)
    print("Shape names updated for 12 models in updateLabStatus.")
else:
    print("WARNING: OLD_STATUS_NAMES not matched.")

# -------------------------------------------------------------------
# 3. UPDATE TAB SWITCHER TO HANDLE 3 TABS (3D, Vector, Neural)
# -------------------------------------------------------------------
OLD_TAB_SWITCHER = """function switchLabTab(tab) {
  if (tab === "3d") {
    if (tab3dBtn) { tab3dBtn.classList.add("active"); tab3dBtn.setAttribute("aria-selected", "true"); }
    if (tabVectorBtn) { tabVectorBtn.classList.remove("active"); tabVectorBtn.setAttribute("aria-selected", "false"); }
    if (panel3dLab) panel3dLab.style.display = "block";
    if (panelVectorLab) panelVectorLab.style.display = "none";
    lab.resize();
  } else {
    if (tab3dBtn) { tab3dBtn.classList.remove("active"); tab3dBtn.setAttribute("aria-selected", "false"); }
    if (tabVectorBtn) { tabVectorBtn.classList.add("active"); tabVectorBtn.setAttribute("aria-selected", "true"); }
    if (panel3dLab) panel3dLab.style.display = "none";
    if (panelVectorLab) panelVectorLab.style.display = "block";
    resizeVectorCanvas();
  }
}
if (tab3dBtn) tab3dBtn.addEventListener("click", () => switchLabTab("3d"));
if (tabVectorBtn) tabVectorBtn.addEventListener("click", () => switchLabTab("vector"));"""

NEW_TAB_SWITCHER = """const tabNeuralBtn = document.getElementById("tab-neural-btn");
const panelNeuralLab = document.getElementById("panel-neural-lab");

function switchLabTab(tab) {
  const tabs = [tab3dBtn, tabVectorBtn, tabNeuralBtn];
  const panels = [panel3dLab, panelVectorLab, panelNeuralLab];

  tabs.forEach(t => { if (t) { t.classList.remove("active"); t.setAttribute("aria-selected", "false"); } });
  panels.forEach(p => { if (p) p.style.display = "none"; });

  if (tab === "3d") {
    if (tab3dBtn) { tab3dBtn.classList.add("active"); tab3dBtn.setAttribute("aria-selected", "true"); }
    if (panel3dLab) panel3dLab.style.display = "block";
    lab.resize();
  } else if (tab === "vector") {
    if (tabVectorBtn) { tabVectorBtn.classList.add("active"); tabVectorBtn.setAttribute("aria-selected", "true"); }
    if (panelVectorLab) panelVectorLab.style.display = "block";
    resizeVectorCanvas();
  } else if (tab === "neural") {
    if (tabNeuralBtn) { tabNeuralBtn.classList.add("active"); tabNeuralBtn.setAttribute("aria-selected", "true"); }
    if (panelNeuralLab) panelNeuralLab.style.display = "block";
    resizeNeuralCanvas();
  }
}
if (tab3dBtn) tab3dBtn.addEventListener("click", () => switchLabTab("3d"));
if (tabVectorBtn) tabVectorBtn.addEventListener("click", () => switchLabTab("vector"));
if (tabNeuralBtn) tabNeuralBtn.addEventListener("click", () => switchLabTab("neural"));"""

if OLD_TAB_SWITCHER in code:
    code = code.replace(OLD_TAB_SWITCHER, NEW_TAB_SWITCHER, 1)
    print("3-tab switcher (3D, Vector, Neural) successfully updated.")
else:
    print("WARNING: OLD_TAB_SWITCHER not matched.")

# -------------------------------------------------------------------
# 4. EXPAND VECTOR STUDIO PRESETS: FIBONACCI & VORONOI
# -------------------------------------------------------------------
OLD_PRESET_BEZIER_DRAW = """    vCtx.stroke();
  } else if (vPreset === "bezier") {"""

NEW_PRESET_BEZIER_DRAW = """    vCtx.stroke();
  } else if (vPreset === "fibonacci") {
    const phi = 1.61803398875;
    const maxR = Math.min(w, h) * 0.42;
    vCtx.beginPath();
    for (let t = 0; t <= Math.PI * 7.5; t += 0.04) {
      const r = (maxR / 16) * Math.pow(phi, (t * vTension) / (Math.PI * 2));
      if (r > maxR) break;
      const x = cx + r * Math.cos(t);
      const y = cy + r * Math.sin(t);
      if (t === 0) vCtx.moveTo(x, y);
      else vCtx.lineTo(x, y);
    }
    vCtx.stroke();
  } else if (vPreset === "voronoi") {
    const cells = Math.max(6, vPetals * 2);
    const pts = [];
    for (let k = 0; k < cells; k++) {
      const a = (k / cells) * Math.PI * 2;
      const d = (Math.sin(k * 1.8 + vTension) * 0.45 + 0.5) * Math.min(w, h) * 0.38;
      pts.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d });
    }
    vCtx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dist = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (dist < Math.min(w, h) * 0.35) {
          vCtx.moveTo(pts[i].x, pts[i].y);
          vCtx.lineTo(pts[j].x, pts[j].y);
        }
      }
    }
    vCtx.stroke();
  } else if (vPreset === "bezier") {"""

if OLD_PRESET_BEZIER_DRAW in code:
    code = code.replace(OLD_PRESET_BEZIER_DRAW, NEW_PRESET_BEZIER_DRAW, 1)
    print("Fibonacci & Voronoi drawing branches added to drawVectorStudio.")
else:
    print("WARNING: OLD_PRESET_BEZIER_DRAW not matched.")

# -------------------------------------------------------------------
# 5. ADD NEURAL SYNAPSE TUNER ENGINE & GRAVITON & CODE INSPECTOR JS
# -------------------------------------------------------------------
NEW_MODULES_JS = """
/* ==========================================================
   PHILOSOPHICAL QUOTE SHUFFLER
========================================================== */
const HERO_QUOTES = [
  "“Where mathematical rigor meets the poetry of autonomous machine thought.”",
  "“We do not merely predict the future of software — we synthesize it.”",
  "“True AI intelligence is not raw scale; it is deep reasoning, verified action, and adaptive grace.”",
  "“Code is silicon sculpture: every model an equation, every agent a living architecture.”",
  "“Building systems that reason through uncertainty and emerge with verifiable clarity.”"
];
let currentQuoteIdx = 0;
const quoteDisplay = document.getElementById("hero-quote-display");
const quoteShuffleBtn = document.getElementById("quote-shuffle-btn");
if (quoteShuffleBtn && quoteDisplay) {
  quoteShuffleBtn.addEventListener("click", () => {
    currentQuoteIdx = (currentQuoteIdx + 1) % HERO_QUOTES.length;
    quoteDisplay.style.opacity = "0.2";
    quoteDisplay.style.transform = "translateY(4px)";
    setTimeout(() => {
      quoteDisplay.textContent = HERO_QUOTES[currentQuoteIdx];
      quoteDisplay.style.opacity = "1";
      quoteDisplay.style.transform = "translateY(0)";
    }, 180);
  });
}

/* ==========================================================
   INTERACTIVE GRAVITON ACCRETION ENGINE (3D PLAYGROUND)
========================================================== */
let gravitonMode = false;
let activeGravitons = [];

const gravityToggleBtn = document.getElementById("lab-gravity-toggle");
if (gravityToggleBtn) {
  gravityToggleBtn.addEventListener("click", () => {
    gravitonMode = !gravitonMode;
    gravityToggleBtn.setAttribute("aria-pressed", String(gravitonMode));
    gravityToggleBtn.style.background = gravitonMode ? "var(--acid)" : "";
    gravityToggleBtn.style.color = gravitonMode ? "#121410" : "";
    gravityToggleBtn.innerHTML = gravitonMode ? "<span>🪐 Gravitons: ON</span>" : "<span>🪐 Gravitons: OFF</span>";
    if (labStatus) {
      labStatus.textContent = gravitonMode ? "Graviton Mode Active: Click on canvas to drop gravitational singularity!" : "Knot / Chartreuse / 1,152 particles";
    }
  });
}

const labCanvasElem = document.getElementById("lab-canvas");
if (labCanvasElem) {
  labCanvasElem.addEventListener("click", e => {
    if (!gravitonMode) return;
    const rect = labCanvasElem.getBoundingClientRect();
    const gx = ((e.clientX - rect.left) / rect.width - 0.5) * 3;
    const gy = ((e.clientY - rect.top) / rect.height - 0.5) * 3;
    activeGravitons.push({ x: gx, y: gy, time: performance.now() });

    // Detonate micro-implosion
    lab.points.forEach(p => {
      const d = Math.hypot(p.x - gx, p.y - gy);
      p.x += (gx - p.x) * 0.45;
      p.y += (gy - p.y) * 0.45;
    });
    lab.dirty = true;
    playPageTurnSound();
  });
}

/* ==========================================================
   SVG PATH CODE INSPECTOR
========================================================== */
const inspectSvgBtn = document.getElementById("inspect-svg-btn");
const svgCodeDrawer = document.getElementById("svg-code-drawer");
const svgCodeContent = document.getElementById("svg-code-content");

if (inspectSvgBtn && svgCodeDrawer && svgCodeContent) {
  inspectSvgBtn.addEventListener("click", () => {
    const isHidden = svgCodeDrawer.style.display === "none";
    svgCodeDrawer.style.display = isHidden ? "block" : "none";
    inspectSvgBtn.textContent = isHidden ? "✕ Hide Path Code" : "🔍 Inspect Path Code";
    if (isHidden) {
      const pal = V_PALETTES[vColorIndex % V_PALETTES.length];
      const codeStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 440" width="100%" height="100%">\\n  <!-- Generated by Antriksh Illustrator Studio -->\\n  <path d="M ${bezierNodes[0].x} ${bezierNodes[0].y} C ${bezierNodes[0].hx1} ${bezierNodes[0].hy1}, ${bezierNodes[1].hx1} ${bezierNodes[1].hy1}, ${bezierNodes[1].x} ${bezierNodes[1].y} C ${bezierNodes[1].hx2 || bezierNodes[1].hx1} ${bezierNodes[1].hy2 || bezierNodes[1].hy1}, ${bezierNodes[2].hx1} ${bezierNodes[2].hy1}, ${bezierNodes[2].x} ${bezierNodes[2].y}" fill="none" stroke="${pal.stroke}" stroke-width="${vStrokeWidth}" stroke-linecap="round" />\\n</svg>`;
      svgCodeContent.textContent = codeStr;
    }
  });
}

/* ==========================================================
   NEURAL SYNAPSE TUNER (INTERACTIVE AI TRAINING MINI-GAME)
========================================================== */
const nCanvas = document.getElementById("neural-canvas");
const nCtx = nCanvas ? nCanvas.getContext("2d") : null;
const nLossChart = document.getElementById("neural-loss-chart");
const nLossCtx = nLossChart ? nLossChart.getContext("2d") : null;

let neuralLR = 0.08;
let neuralNodes = 6;
let neuralLoss = 0.742;
let neuralAcc = 54.2;
let isTrainingNeural = false;
let neuralHistory = [0.742];

// Generate non-linear spiral classification dataset
let spiralData = [];
function generateSpiralData() {
  spiralData = [];
  const pointsPerSpiral = 60;
  for (let i = 0; i < pointsPerSpiral; i++) {
    const r = (i / pointsPerSpiral) * 160 + 20;
    const t = (1.75 * i / pointsPerSpiral) * 2 * Math.PI;
    // Class 0: Acid Green
    spiralData.push({
      x: r * Math.sin(t) + (Math.random() - 0.5) * 14,
      y: r * Math.cos(t) + (Math.random() - 0.5) * 14,
      label: 0
    });
    // Class 1: Cyber Violet
    spiralData.push({
      x: -r * Math.sin(t) + (Math.random() - 0.5) * 14,
      y: -r * Math.cos(t) + (Math.random() - 0.5) * 14,
      label: 1
    });
  }
}
generateSpiralData();

function resizeNeuralCanvas() {
  if (!nCanvas || !nCtx) return;
  const rect = nCanvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  nCanvas.width = Math.round(rect.width * dpr);
  nCanvas.height = Math.round(rect.height * dpr);
  nCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawNeuralStage();
}

function drawNeuralStage() {
  if (!nCanvas || !nCtx) return;
  const rect = nCanvas.getBoundingClientRect();
  const w = rect.width, h = rect.height;
  const cx = w / 2, cy = h / 2;

  nCtx.clearRect(0, 0, w, h);

  // Background subtle grid
  nCtx.strokeStyle = "rgba(255,255,255,0.03)";
  nCtx.lineWidth = 1;
  for (let x = 0; x < w; x += 30) {
    nCtx.beginPath(); nCtx.moveTo(x, 0); nCtx.lineTo(x, h); nCtx.stroke();
  }
  for (let y = 0; y < h; y += 30) {
    nCtx.beginPath(); nCtx.moveTo(0, y); nCtx.lineTo(w, y); nCtx.stroke();
  }

  // Draw simulated decision boundary field
  const progress = Math.max(0, Math.min(1, (0.742 - neuralLoss) / 0.72));
  const cols = 28, rows = 20;
  const cw = w / cols, ch = h / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const px = (i + 0.5) * cw - cx;
      const py = (j + 0.5) * ch - cy;
      const angle = Math.atan2(py, px);
      const dist = Math.hypot(px, py);
      const spiralField = Math.sin(angle * 2 + dist * 0.04 * progress);
      if (spiralField > 0) {
        nCtx.fillStyle = `rgba(214, 255, 98, ${0.03 + progress * 0.06})`;
      } else {
        nCtx.fillStyle = `rgba(184, 162, 255, ${0.03 + progress * 0.06})`;
      }
      nCtx.fillRect(i * cw, j * ch, cw, ch);
    }
  }

  // Draw Decision Boundary Contour Line
  nCtx.strokeStyle = `rgba(255, 255, 255, ${0.25 + progress * 0.55})`;
  nCtx.lineWidth = 1.5;
  nCtx.beginPath();
  for (let a = -Math.PI; a <= Math.PI; a += 0.08) {
    const r = (120 + Math.sin(a * 3 + progress * 4) * 60) * (0.4 + progress * 0.6);
    const bx = cx + Math.cos(a) * r;
    const by = cy + Math.sin(a) * r;
    if (a === -Math.PI) nCtx.moveTo(bx, by);
    else nCtx.lineTo(bx, by);
  }
  nCtx.closePath();
  nCtx.stroke();

  // Draw Spiral Points
  spiralData.forEach(p => {
    nCtx.beginPath();
    nCtx.arc(cx + p.x, cy + p.y, 4.5, 0, Math.PI * 2);
    if (p.label === 0) {
      nCtx.fillStyle = "#d6ff62";
      nCtx.shadowColor = "rgba(214,255,98,0.5)";
    } else {
      nCtx.fillStyle = "#b8a2ff";
      nCtx.shadowColor = "rgba(184,162,255,0.5)";
    }
    nCtx.shadowBlur = 8;
    nCtx.fill();
  });
  nCtx.shadowBlur = 0;

  // Mini loss sparkline chart
  if (nLossCtx && nLossChart) {
    nLossCtx.clearRect(0, 0, 200, 38);
    nLossCtx.strokeStyle = "var(--acid)";
    nLossCtx.lineWidth = 1.8;
    nLossCtx.beginPath();
    const step = 200 / Math.max(1, neuralHistory.length - 1);
    neuralHistory.forEach((l, idx) => {
      const lx = idx * step;
      const ly = 36 - (1 - l / 0.8) * 32;
      if (idx === 0) nLossCtx.moveTo(lx, ly);
      else nLossCtx.lineTo(lx, ly);
    });
    nLossCtx.stroke();
  }
}

function trainNeuralStep() {
  if (!isTrainingNeural) return;
  neuralLoss = Math.max(0.016, Number((neuralLoss * (0.95 - neuralLR * 0.1) - 0.003).toFixed(3)));
  neuralAcc = Math.min(99.8, Number((neuralAcc + (100 - neuralAcc) * 0.14).toFixed(1)));
  neuralHistory.push(neuralLoss);
  if (neuralHistory.length > 25) neuralHistory.shift();

  const lossEl = document.getElementById("neural-loss-val");
  const accEl = document.getElementById("neural-acc-val");
  if (lossEl) lossEl.textContent = neuralLoss.toFixed(3);
  if (accEl) accEl.textContent = `${neuralAcc.toFixed(1)}%`;

  drawNeuralStage();

  if (neuralLoss <= 0.025) {
    isTrainingNeural = false;
    playVictoryFanfare();
    const st = document.getElementById("neural-status-text");
    if (st) {
      st.innerHTML = `<strong style="color:var(--acid);">🏆 CONVERGENCE ACHIEVED!</strong> Model Loss: ${neuralLoss} · Accuracy: ${neuralAcc}% (Optimal Weights)`;
    }
    const btn = document.getElementById("neural-train-btn");
    if (btn) btn.textContent = "⚡ Train Again (Epochs ⟳)";
  } else {
    setTimeout(trainNeuralStep, 60);
  }
}

const nTrainBtn = document.getElementById("neural-train-btn");
if (nTrainBtn) {
  nTrainBtn.addEventListener("click", () => {
    if (isTrainingNeural) return;
    if (neuralLoss <= 0.03) {
      neuralLoss = 0.742;
      neuralAcc = 54.2;
      neuralHistory = [0.742];
    }
    isTrainingNeural = true;
    nTrainBtn.textContent = "⚙ Optimizing Synapse Gradients...";
    trainNeuralStep();
  });
}

const nResetBtn = document.getElementById("neural-reset-btn");
if (nResetBtn) {
  nResetBtn.addEventListener("click", () => {
    isTrainingNeural = false;
    neuralLoss = 0.742;
    neuralAcc = 54.2;
    neuralHistory = [0.742];
    generateSpiralData();
    const lossEl = document.getElementById("neural-loss-val");
    const accEl = document.getElementById("neural-acc-val");
    if (lossEl) lossEl.textContent = "0.742";
    if (accEl) accEl.textContent = "54.2%";
    drawNeuralStage();
    const btn = document.getElementById("neural-train-btn");
    if (btn) btn.textContent = "⚡ Train Weights (Epochs ⟳)";
  });
}

const nLrSlider = document.getElementById("neural-lr");
if (nLrSlider) {
  nLrSlider.addEventListener("input", e => {
    neuralLR = Number(e.target.value);
    document.getElementById("neural-lr-val").textContent = neuralLR.toFixed(2);
  });
}

const nNodesSlider = document.getElementById("neural-nodes");
if (nNodesSlider) {
  nNodesSlider.addEventListener("input", e => {
    neuralNodes = Number(e.target.value);
    document.getElementById("neural-nodes-val").textContent = `${neuralNodes} Nodes`;
  });
}

/* ==========================================================
   SANDFORGE STEP-BY-STEP SIMULATION ENGINE (ARCHITECTURE MODAL)
========================================================== */
const SIM_STEPS = [
  {
    step: "1. Trigger Task",
    desc: "GitHub Issue #42: Broken authentication middleware token extraction",
    log: "▶ Task Received: Issue #42 in repo 'sandforge-demo'\\n✔ Repository cloned into Nebius Sandbox ConTree environment."
  },
  {
    step: "2. AST Planner",
    desc: "NVIDIA Nemotron 3 Nano Omni AST decomposition",
    log: "▶ Nemotron 3 Nano hierarchical planner active.\\n✔ Decomposed AST into 3 sub-problems: auth.ts, token.ts, test-suite.ts.\\n✔ Strategy 1 generated: localized token header parsing fix."
  },
  {
    step: "3. VM Snapshot t0",
    desc: "Nebius Token Factory Sandbox checkpoint snapshot",
    log: "▶ Nebius Container Checkpoint Created: snapshot-contree-t0\\n✔ Snapshot duration: 138ms. RAM state & disk diff indexed."
  },
  {
    step: "4. Patch Gen",
    desc: "NVIDIA Nemotron 3 Super (120B-A12B) generates patch diff",
    log: "▶ Nemotron 3 Super MoE reasoning generation running...\\n✔ Synthesized patch: +14 lines, -6 lines in src/auth.ts\\n✔ Applying diff to local sandbox workspace."
  },
  {
    step: "5. In-Sandbox Tests",
    desc: "Isolated test execution (npm test) -> Tests RED",
    log: "▶ Executing: npm run test\\n✖ FAIL: TokenVerificationTest (AssertionError: expected 401, got 500)\\n✖ Status: 3/5 tests passing. RED DETECTED."
  },
  {
    step: "6. Auto-Rollback & Escalate",
    desc: "Instant VM rollback (~140ms) & Strategy 2 escalation",
    log: "▶ Decision Engine Triggered: ROLLBACK TO SNAPSHOT-T0\\n✔ Rewound sandbox to clean checkpoint in 142ms!\\n✔ Escalating to Strategy 2: Context window expansion & Bearer prefix normalizer."
  },
  {
    step: "7. Re-Synthesis & Tests Pass",
    desc: "Strategy 2 patch re-generated -> Tests GREEN",
    log: "▶ Nemotron 3 Super re-synthesized patch with Bearer normalizer.\\n▶ Executing: npm run test\\n✔ PASS: TokenVerificationTest (24ms)\\n✔ PASS: SessionMiddlewareTest (18ms)\\n✔ ALL 5/5 TESTS PASSED GREEN!"
  },
  {
    step: "8. Verified GitHub PR",
    desc: "Automated Pull Request #43 opened with cryptographic diff",
    log: "▶ GitHub API Commit Created: 'fix(auth): normalize token extraction'\\n✔ Pull Request #43 successfully opened on AntrikshH90/sandforge-demo!\\n🏆 VERIFIED AUTONOMOUS REPAIR COMPLETE."
  }
];

let activeSimStep = 0;

function renderSimTimeline() {
  const container = document.getElementById("sim-timeline-box");
  const logEl = document.getElementById("sim-console-output");
  if (!container || !logEl) return;

  container.innerHTML = SIM_STEPS.map((s, idx) => `
    <button type="button" class="sim-step-node mono ${idx === activeSimStep ? 'active' : ''} ${idx === 4 ? 'failed' : ''}" onclick="selectSimStep(${idx})">
      ${s.step}
    </button>
  `).join("");

  logEl.textContent = SIM_STEPS[activeSimStep].log;
}

window.selectSimStep = function(idx) {
  activeSimStep = idx;
  renderSimTimeline();
  playKeyClickSound();
};
"""

code = code.replace("</script>", NEW_MODULES_JS + "\n</script>", 1)
print("New advanced JS modules injected.")

with open("antriksh-portfolio-studio.html", "w", encoding="utf-8") as f:
    f.write(code)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(code)

print("Both files updated successfully.")
