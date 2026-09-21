import re

with open("antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    html = f.read()

print("Original length:", len(html))

# -------------------------------------------------------------
# 1. UPDATE AKTU PASSING YEAR: '27 -> '29
# -------------------------------------------------------------
html = html.replace("AKTU '27", "AKTU '29")
html = html.replace("<span>B.Tech AIML · AKTU (Dr. APJ Abdul Kalam Tech Univ)</span>",
                    "<span>B.Tech AIML (Class of 2029) · AKTU (Dr. APJ Abdul Kalam Tech Univ)</span>")
html = html.replace("I’m a Second-Year B.Tech student in AIML at <strong>Dr. A.P.J. Abdul Kalam Technical University (AKTU)</strong>,",
                    "I’m a B.Tech student in AIML (Class of 2029) at <strong>Dr. A.P.J. Abdul Kalam Technical University (AKTU)</strong>, Axis Institute,")
html = html.replace("Antriksh is a Second-Year <strong>B.Tech in Artificial Intelligence & Machine Learning (AIML)</strong> student at <strong>Dr. A.P.J. Abdul Kalam Technical University (AKTU)</strong>",
                    "Antriksh is a <strong>B.Tech in Artificial Intelligence & Machine Learning (AIML, Class of 2029)</strong> student at <strong>Dr. A.P.J. Abdul Kalam Technical University (AKTU)</strong>")
html = html.replace("B.Tech background at AKTU", "B.Tech background at AKTU (Class of 2029)")
print("AKTU Class of 2029 updated everywhere.")

# -------------------------------------------------------------
# 2. UPGRADE HERO HEADLINE & PHILOSOPHICAL QUOTE
# -------------------------------------------------------------
OLD_HERO_HEADLINE = """<h1 id="hero-title">
          Curiosity,<br />
          in <span class="outline">motion.</span>
        </h1>"""

NEW_HERO_HEADLINE = """<h1 id="hero-title">
          Architecting intelligence.<br />
          Sculpting the <span class="outline">unseen.</span>
        </h1>

        <div class="hero-quote-card mono" id="hero-quote-card">
          <div class="quote-header">
            <span class="quote-tag">✦ CORE PHILOSOPHY</span>
            <button type="button" class="quote-shuffle-btn" id="quote-shuffle-btn" aria-label="Cycle philosophical quote" title="Shift philosophical perspective">
              <span class="shuffle-icon">↻</span> Shift Thought
            </button>
          </div>
          <p class="hero-quote-text" id="hero-quote-display">
            “Where mathematical rigor meets the poetry of autonomous machine thought.”
          </p>
        </div>"""

if OLD_HERO_HEADLINE in html:
    html = html.replace(OLD_HERO_HEADLINE, NEW_HERO_HEADLINE, 1)
    print("Hero headline and philosophical quote card injected.")
else:
    print("WARNING: OLD_HERO_HEADLINE not matched.")

# Upgrade scene top label
html = html.replace('Curiosity engine / 001', 'Neural Geometry / 001')

# -------------------------------------------------------------
# 3. ADD NEW 3D MODELS TO SHAPE BUTTONS
# -------------------------------------------------------------
OLD_SHAPE_BUTTONS = """              <button class="shape-button" data-shape="mobius" aria-pressed="false">
                The möbius <span aria-hidden="true">⟳</span>
              </button>
              <button class="shape-button" data-shape="nib" aria-pressed="false">
                Pen nib <span aria-hidden="true">✒</span>
              </button>
            </div>"""

NEW_SHAPE_BUTTONS = """              <button class="shape-button" data-shape="mobius" aria-pressed="false">
                The möbius <span aria-hidden="true">⟳</span>
              </button>
              <button class="shape-button" data-shape="nib" aria-pressed="false">
                Pen nib <span aria-hidden="true">✒</span>
              </button>
              <button class="shape-button" data-shape="lorenz" aria-pressed="false">
                Lorenz Chaos <span aria-hidden="true">🦋</span>
              </button>
              <button class="shape-button" data-shape="calabi" aria-pressed="false">
                Calabi-Yau 6D <span aria-hidden="true">🌌</span>
              </button>
              <button class="shape-button" data-shape="hopf" aria-pressed="false">
                Hopf Fibration <span aria-hidden="true">🪐</span>
              </button>
              <button class="shape-button" data-shape="blackhole" aria-pressed="false">
                Accretion Singularity <span aria-hidden="true">🕳</span>
              </button>
            </div>"""

if OLD_SHAPE_BUTTONS in html:
    html = html.replace(OLD_SHAPE_BUTTONS, NEW_SHAPE_BUTTONS, 1)
    print("4 new 3D model buttons injected into playground.")
else:
    print("WARNING: OLD_SHAPE_BUTTONS not matched.")

# Add Graviton Singularity mode toggle to lab actions
OLD_LAB_ACTIONS = """              <button id="lab-audio-toggle" class="lab-action mono" aria-pressed="false" title="Synthesizes soundwave and pulses 3D sculpture">
                <span id="lab-audio-icon">🎵</span> <span id="lab-audio-text">Audio Mode: OFF</span>
              </button>"""

NEW_LAB_ACTIONS = """              <button id="lab-audio-toggle" class="lab-action mono" aria-pressed="false" title="Synthesizes soundwave and pulses 3D sculpture">
                <span id="lab-audio-icon">🎵</span> <span id="lab-audio-text">Audio Mode: OFF</span>
              </button>
              <button id="lab-gravity-toggle" class="lab-action mono" aria-pressed="false" title="Click on canvas to drop gravitational singularities">
                <span>🪐 Gravitons: OFF</span>
              </button>"""

if OLD_LAB_ACTIONS in html:
    html = html.replace(OLD_LAB_ACTIONS, NEW_LAB_ACTIONS, 1)
    print("Graviton toggle button added.")

# -------------------------------------------------------------
# 4. ADD 3RD LAB TAB: NEURAL SYNAPSE TUNER MINI-GAME
# -------------------------------------------------------------
OLD_LAB_TABS = """        <button type="button" class="tab-button" id="tab-vector-btn" data-panel="panel-vector-lab">
          <span>✒️</span> Adobe Illustrator & Vector Studio
        </button>
      </div>"""

NEW_LAB_TABS = """        <button type="button" class="tab-button" id="tab-vector-btn" data-panel="panel-vector-lab">
          <span>✒️</span> Adobe Illustrator & Vector Studio
        </button>
        <button type="button" class="tab-button" id="tab-neural-btn" data-panel="panel-neural-lab">
          <span>🧠</span> Neural Synapse Tuner (Mini-Game)
        </button>
      </div>"""

if OLD_LAB_TABS in html:
    html = html.replace(OLD_LAB_TABS, NEW_LAB_TABS, 1)
    print("Neural lab tab added.")
else:
    print("WARNING: OLD_LAB_TABS not matched.")

# Add Panel 3 HTML right after Panel 2
PANEL_NEURAL_HTML = """
      <!-- Panel 3: Neural Synapse Tuner (Interactive AI Training Mini-Game) -->
      <div id="panel-neural-lab" style="display:none;">
        <div class="neural-stage-wrap">
          <div class="lab-controls">
            <span class="control-title mono">Neural Hyperparameters</span>
            
            <div class="speed-control">
              <label for="neural-lr" class="control-title mono">
                Learning Rate (η) <output id="neural-lr-val" for="neural-lr">0.08</output>
              </label>
              <input id="neural-lr" type="range" min="0.01" max="0.30" step="0.01" value="0.08" />
            </div>

            <div class="speed-control">
              <label for="neural-nodes" class="control-title mono">
                Hidden Synapses <output id="neural-nodes-val" for="neural-nodes">6 Nodes</output>
              </label>
              <input id="neural-nodes" type="range" min="3" max="12" step="1" value="6" />
            </div>

            <div class="render-mode-group">
              <span class="control-title mono">Activation Function</span>
              <div class="mode-pills mono" id="neural-act-pills">
                <button type="button" class="mode-pill-btn active" data-act="gelu">GELU</button>
                <button type="button" class="mode-pill-btn" data-act="relu">ReLU</button>
                <button type="button" class="mode-pill-btn" data-act="swish">Swish</button>
              </div>
            </div>

            <div class="lab-actions" style="margin-top:20px;">
              <button type="button" id="neural-train-btn" class="game-verify-btn mono" style="width:100%; padding:10px 14px;">
                ⚡ Train Weights (Epochs ⟳)
              </button>
            </div>
            <button type="button" id="neural-reset-btn" class="lab-action mono" style="width:100%; margin-top:8px;">
              Reset Data & Weights
            </button>

            <div class="loss-meter-box mono">
              <div style="display:flex; justify-content:space-between;">
                <span>Training Loss:</span>
                <strong id="neural-loss-val" style="color:var(--acid);">0.742</strong>
              </div>
              <div style="display:flex; justify-content:space-between; margin-top:4px;">
                <span>Classification Acc:</span>
                <strong id="neural-acc-val" style="color:#83e1ff;">54.2%</strong>
              </div>
              <canvas id="neural-loss-chart" class="loss-sparkline" width="200" height="38"></canvas>
            </div>
          </div>

          <div class="lab-stage" style="position:relative;">
            <canvas id="neural-canvas" width="600" height="440" role="img" aria-label="Interactive 2D decision boundary classification canvas with non-linear spiral data"></canvas>
            <span class="stage-mark mono" style="position:absolute; bottom:12px; right:16px;">
              Non-Linear Boundary Optimization · Stochastic Gradient Descent
            </span>
          </div>
        </div>

        <div class="lab-footer mono" style="margin-top:20px;">
          <span id="neural-status-text">Stochastic Gradient Descent / 6 Hidden Synapses / Non-linear Spiral Data</span>
          <span>Click 'Train Weights' to optimize decision boundaries and achieve convergence!</span>
        </div>
      </div>
"""

OLD_PANEL_VECTOR_END = """        <div class="lab-footer mono" style="margin-top:20px;">
          <span id="vector-status">Guilloché Rosette / Chartreuse / 8-fold Symmetry / Ready for Adobe Illustrator CC</span>
          <span>Click & drag anchor nodes on canvas to sculpt Bezier curves</span>
        </div>
      </div>"""

if OLD_PANEL_VECTOR_END in html:
    html = html.replace(OLD_PANEL_VECTOR_END, OLD_PANEL_VECTOR_END + "\n" + PANEL_NEURAL_HTML, 1)
    print("Panel 3 Neural Synapse Tuner HTML injected.")
else:
    print("WARNING: OLD_PANEL_VECTOR_END not matched.")

# -------------------------------------------------------------
# 5. EXPAND ILLUSTRATOR STUDIO: CODE INSPECTOR & FIBONACCI
# -------------------------------------------------------------
OLD_VECTOR_PRESETS = """              <button type="button" class="preset-btn" data-preset="mandala">
                <strong>Sacred Symmetry</strong><br>
                <span style="font-size:9px; color:#8c9082;">Radial polygon vector</span>
              </button>"""

NEW_VECTOR_PRESETS = """              <button type="button" class="preset-btn" data-preset="mandala">
                <strong>Sacred Symmetry</strong><br>
                <span style="font-size:9px; color:#8c9082;">Radial polygon vector</span>
              </button>
              <button type="button" class="preset-btn" data-preset="fibonacci">
                <strong>Golden Spiral (φ)</strong><br>
                <span style="font-size:9px; color:#8c9082;">Logarithmic Fibonacci vector</span>
              </button>
              <button type="button" class="preset-btn" data-preset="voronoi">
                <strong>Voronoi Cellular</strong><br>
                <span style="font-size:9px; color:#8c9082;">Algorithmic vector tessellation</span>
              </button>"""

if OLD_VECTOR_PRESETS in html:
    html = html.replace(OLD_VECTOR_PRESETS, NEW_VECTOR_PRESETS, 1)
    print("Fibonacci & Voronoi presets added to Vector Studio.")

# Add SVG Path Code Inspector button and drawer
OLD_EXPORT_SVG_BTN = """            <button type="button" id="export-svg-btn" class="export-svg-btn mono">
              <span>⬇</span> Download SVG Vector (AI Compatible)
            </button>"""

NEW_EXPORT_SVG_BTN = """            <div style="display:flex; gap:8px; margin-top:10px;">
              <button type="button" id="inspect-svg-btn" class="lab-action mono" style="flex:1;">
                🔍 Inspect Path Code
              </button>
              <button type="button" id="export-svg-btn" class="export-svg-btn mono" style="flex:2; margin-top:0;">
                <span>⬇</span> Download SVG (.ai)
              </button>
            </div>
            <div class="svg-code-drawer mono" id="svg-code-drawer" style="display:none;" title="Live SVG Vector Path Code">
              <span id="svg-code-content">&lt;path d="..." /&gt;</span>
            </div>"""

if OLD_EXPORT_SVG_BTN in html:
    html = html.replace(OLD_EXPORT_SVG_BTN, NEW_EXPORT_SVG_BTN, 1)
    print("Inspect SVG Path Code button and drawer injected.")

# -------------------------------------------------------------
# 6. EXPAND ARCHITECTURE MODAL WITH STEP-BY-STEP SIMULATION
# -------------------------------------------------------------
OLD_ARCH_TABS = """    <div class="arch-tabs" id="arch-tabs">
      <button type="button" class="arch-tab-btn active" data-arch="sandforge">SandForge (NVIDIA Nemotron + Nebius)</button>
      <button type="button" class="arch-tab-btn" data-arch="emergency-mitra">Emergency Mitra (SIH'26 MedTech)</button>
      <button type="button" class="arch-tab-btn" data-arch="apex">Apex Intelligence Engine</button>
    </div>"""

NEW_ARCH_TABS = """    <div class="arch-tabs" id="arch-tabs">
      <button type="button" class="arch-tab-btn active" data-arch="sandforge">SandForge (NVIDIA Nemotron + Nebius)</button>
      <button type="button" class="arch-tab-btn" data-arch="sahayak">Sahayak-LM (QLoRA 8B Fine-Tuning)</button>
      <button type="button" class="arch-tab-btn" data-arch="emergency-mitra">Emergency Mitra (SIH'26 MedTech)</button>
      <button type="button" class="arch-tab-btn" data-arch="apex">Apex Intelligence Engine</button>
    </div>"""

if OLD_ARCH_TABS in html:
    html = html.replace(OLD_ARCH_TABS, NEW_ARCH_TABS, 1)
    print("Sahayak-LM tab added to architecture modal.")

# -------------------------------------------------------------
# 7. ADD CSS STYLES FOR ALL NEW FEATURES
# -------------------------------------------------------------
ADDITIONAL_CSS = """
/* --- $1M Portfolio Creative Styles --- */
.hero-quote-card {
  background: rgba(18, 20, 16, 0.78);
  border: 1px solid rgba(214, 255, 98, 0.28);
  border-radius: 14px;
  padding: 12px 18px;
  margin: 16px 0 22px;
  max-width: 540px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  transition: all 0.3s ease;
}
.hero-quote-card:hover {
  border-color: var(--acid);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.32), 0 0 20px rgba(214, 255, 98, 0.18);
}
.quote-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.quote-tag {
  font-size: 8.5px;
  color: var(--acid);
  font-weight: 700;
  letter-spacing: 0.8px;
}
.quote-shuffle-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #8c9082;
  font-size: 9.5px;
  padding: 2px 8px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.quote-shuffle-btn:hover {
  color: var(--acid);
  border-color: var(--acid);
  background: rgba(214, 255, 98, 0.08);
}
.hero-quote-text {
  font-size: 13.5px;
  font-style: italic;
  color: #eceae1;
  margin: 0;
  line-height: 1.5;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

/* Neural Lab Layout */
.neural-stage-wrap {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 24px;
  align-items: start;
  margin-top: 18px;
}
@media (max-width: 900px) {
  .neural-stage-wrap { grid-template-columns: 1fr; }
}
.loss-meter-box {
  background: #11130e;
  border: 1px solid rgba(214, 255, 98, 0.25);
  border-radius: 10px;
  padding: 10px 14px;
  margin-top: 14px;
  font-size: 11px;
}
.loss-sparkline {
  width: 100%;
  height: 38px;
  margin-top: 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  display: block;
}

/* SVG Path Code Drawer */
.svg-code-drawer {
  background: #0f120e;
  border: 1px solid rgba(214, 255, 98, 0.3);
  border-radius: 10px;
  padding: 12px;
  margin-top: 10px;
  font-size: 10px;
  color: #83e1ff;
  max-height: 120px;
  overflow-y: auto;
  word-break: break-all;
  white-space: pre-wrap;
  user-select: all;
  box-shadow: inset 0 2px 8px rgba(0,0,0,0.5);
}

/* Architecture Interactive Simulation Styles */
.sim-box {
  background: #141712;
  border: 1px solid rgba(214, 255, 98, 0.25);
  border-radius: 12px;
  padding: 16px;
  margin-top: 16px;
}
.sim-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.sim-timeline {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 8px 0;
  margin-bottom: 12px;
}
.sim-step-node {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 10px;
  color: #8c9082;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.sim-step-node.active {
  background: rgba(214, 255, 98, 0.15);
  border-color: var(--acid);
  color: var(--acid);
  font-weight: 700;
}
.sim-step-node.failed {
  border-color: #ff754d;
  color: #ff754d;
  background: rgba(255, 117, 77, 0.12);
}
.sim-console-output {
  background: #0b0d09;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 11px;
  color: #d6ff62;
  min-height: 85px;
  max-height: 140px;
  overflow-y: auto;
  white-space: pre-wrap;
}

/* Matrix Digital Rain Easter Egg Canvas */
#matrix-rain-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 9998;
  opacity: 0;
  transition: opacity 0.5s ease;
}
#matrix-rain-canvas.active {
  opacity: 0.85;
}
"""

html = html.replace("</style>", ADDITIONAL_CSS + "\n</style>", 1)
print("Additional CSS added.")

with open("antriksh-portfolio-studio.html", "w", encoding="utf-8") as f:
    f.write(html)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print("Updated HTML saved.")
