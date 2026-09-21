import re

with open("antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    html = f.read()

print("Original HTML length:", len(html))

# -------------------------------------------------------------
# 1. ENHANCE CSS
# -------------------------------------------------------------
NEW_CSS = """
/* ==========================================================
   ENRICHMENTS: 7 INTERACTIVE FEATURES & 3D AVATAR SYSTEM
========================================================== */

/* --- Hero Avatar Hologram Pill --- */
.hero-avatar-pill {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: rgba(20, 22, 19, 0.8);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(214, 255, 98, 0.35);
  padding: 6px 14px 6px 6px;
  border-radius: 999px;
  margin-bottom: 22px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  transition: all 0.3s var(--ease);
  cursor: pointer;
  text-decoration: none;
  width: fit-content;
}
.hero-avatar-pill:hover {
  transform: translateY(-2px) scale(1.02);
  border-color: var(--acid);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.35), 0 0 20px rgba(214, 255, 98, 0.25);
}
.hero-avatar-thumb {
  position: relative;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--acid);
  flex-shrink: 0;
  background: #171816;
}
.hero-avatar-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.hero-avatar-beacon {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  background: var(--acid);
  border-radius: 50%;
  border: 2px solid #141613;
  animation: beacon-pulse 1.8s infinite;
}
.hero-avatar-meta {
  display: flex;
  flex-direction: column;
  text-align: left;
}
.hero-avatar-status {
  font-size: 8.5px;
  color: var(--acid);
  font-weight: 700;
  letter-spacing: 0.5px;
}
.hero-avatar-role {
  font-size: 11px;
  color: #f2f1ea;
  font-weight: 600;
}
.hero-avatar-tag {
  font-size: 9px;
  background: rgba(214, 255, 98, 0.15);
  color: var(--acid);
  padding: 3px 8px;
  border-radius: 999px;
  font-weight: 700;
  margin-left: 4px;
}

/* --- About Section Avatar Enhancements --- */
.avatar-switcher {
  display: flex;
  gap: 6px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 4px;
  border-radius: 999px;
  margin: 0 auto 16px;
  width: fit-content;
}
.avatar-switch-btn {
  background: transparent;
  border: none;
  color: #8c9082;
  font-size: 10px;
  padding: 5px 12px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.avatar-switch-btn.active {
  background: var(--acid);
  color: #121410;
  font-weight: 700;
}
.avatar-img-wrap {
  position: relative;
  width: 160px;
  height: 200px;
  margin: 0 auto 18px;
  border-radius: 18px;
  padding: 3px;
  background: linear-gradient(135deg, var(--acid), var(--violet), var(--orange));
  box-shadow: 0 0 28px rgba(214, 255, 98, 0.22);
  perspective: 600px;
}
.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 15px;
  object-fit: cover;
  object-position: top center;
  background: #1a1c18;
  display: block;
  transition: opacity 0.35s ease, transform 0.3s ease;
}

/* --- Feature 1: Dynamic Foil / Holographic Light Sheen on 3D Book --- */
.cover-foil-sheen {
  position: absolute;
  inset: 0;
  border-radius: 4px 16px 16px 4px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
  background: radial-gradient(circle 280px at var(--foil-x, 50%) var(--foil-y, 50%),
    rgba(255, 240, 160, 0.42) 0%,
    rgba(214, 255, 98, 0.32) 25%,
    rgba(131, 225, 255, 0.22) 50%,
    rgba(255, 140, 220, 0.16) 72%,
    transparent 90%);
  mix-blend-mode: color-dodge;
  z-index: 12;
}
.cover-front:hover .cover-foil-sheen {
  opacity: 1;
}
.cover-title {
  background: linear-gradient(calc(var(--foil-angle, 135deg)), #d6ff62 0%, #ffffff 40%, #ffcf59 70%, #d6ff62 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  transition: filter 0.2s ease;
}

/* --- Feature 2: Interactive Page Curl & Drag-to-Peel Physics --- */
.page-corner-peel {
  position: absolute;
  top: 0;
  right: 0;
  width: 44px;
  height: 44px;
  pointer-events: none;
  z-index: 28;
  overflow: hidden;
}
.page-corner-peel::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 0 0 0;
  border-color: transparent var(--paper) transparent transparent;
  transition: border-width 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
  filter: drop-shadow(-4px 4px 6px rgba(0, 0, 0, 0.28));
}
.book-leaf:not(.flipped) .page-front:hover .page-corner-peel::after {
  border-width: 0 42px 42px 0;
  border-color: transparent #e5e2d6 transparent transparent;
}
.book-leaf.leaf-dragging {
  transition: none !important;
  will-change: transform;
}

/* --- Feature 3: AI Terminal Trigger & Message Avatars --- */
.terminal-trigger-thumb {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid var(--acid);
  display: block;
}
.term-bot-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.term-bot-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid var(--acid);
  flex-shrink: 0;
  margin-top: 2px;
}
.term-bot-body {
  flex: 1;
}

/* --- Feature 4: Audio-Reactive Mode in 3D Playground --- */
.audio-visualizer-bar {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 3px;
  height: 24px;
  position: absolute;
  bottom: 34px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 5;
}
.audio-bar-seg {
  width: 4px;
  height: 4px;
  background: var(--acid);
  border-radius: 2px;
  transition: height 0.08s ease;
  box-shadow: 0 0 8px rgba(214, 255, 98, 0.5);
}

/* --- Feature 5: The Bezier Game HUD --- */
.bezier-game-hud {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: #11130f;
  border: 1px solid rgba(214, 255, 98, 0.25);
  padding: 10px 16px;
  border-radius: 12px;
  margin-bottom: 12px;
  font-size: 11px;
}
.game-meter {
  display: flex;
  align-items: center;
  gap: 8px;
}
.game-meter-bar {
  width: 120px;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  overflow: hidden;
}
.game-meter-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #ff754d, #d6ff62);
  transition: width 0.15s ease;
}
.game-verify-btn {
  background: var(--acid);
  color: #121410;
  font-weight: 700;
  border: none;
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.game-verify-btn:hover {
  transform: scale(1.04);
  box-shadow: 0 0 14px rgba(214, 255, 98, 0.4);
}

/* --- Feature 6: Architecture Deep Dive Modal --- */
.arch-dialog {
  background: #0f110d;
  color: #efeee8;
  border: 1px solid rgba(214, 255, 98, 0.4);
  border-radius: 20px;
  padding: 28px;
  width: min(860px, calc(100% - 32px));
  max-height: 90dvh;
  box-shadow: 0 40px 120px rgba(0, 0, 0, 0.85), 0 0 50px rgba(214, 255, 98, 0.12);
  overflow-y: auto;
}
.arch-tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 12px;
  margin-bottom: 18px;
  overflow-x: auto;
}
.arch-tab-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #8c9082;
  font-size: 11px;
  padding: 7px 14px;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.arch-tab-btn.active {
  background: var(--acid);
  color: #121410;
  font-weight: 700;
  border-color: var(--acid);
}
.arch-flow-box {
  background: #141712;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 20px;
  margin: 16px 0;
  overflow-x: auto;
}
.arch-specs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 16px;
}
.arch-spec-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 12px 14px;
  border-radius: 10px;
}
.arch-spec-label {
  font-size: 10px;
  color: #8c9082;
}
.arch-spec-val {
  font-size: 14px;
  font-weight: 700;
  color: var(--acid);
  margin-top: 4px;
}
.card-arch-btn {
  margin-top: 8px;
  background: rgba(214, 255, 98, 0.12);
  border: 1px solid rgba(214, 255, 98, 0.35);
  color: var(--acid);
  font-size: 10px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s;
}
.card-arch-btn:hover {
  background: var(--acid);
  color: #121410;
}

/* --- Feature 7: Easter Egg Supernova Toast --- */
.supernova-toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(-100px);
  background: linear-gradient(135deg, #181a13, #2a2512);
  border: 2px solid #ffd700;
  color: #fff;
  padding: 12px 24px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 10000;
  box-shadow: 0 10px 40px rgba(255, 215, 0, 0.35);
  transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  pointer-events: none;
}
.supernova-toast.active {
  transform: translateX(-50%) translateY(0);
}
"""

# Insert CSS right before </style>
html = html.replace("</style>", NEW_CSS + "\n</style>", 1)
print("CSS injected.")

# -------------------------------------------------------------
# 2. ENHANCE HERO WITH AVATAR PILL
# -------------------------------------------------------------
HERO_AVATAR_HTML = """
        <a href="#about" class="hero-avatar-pill mono magnetic" id="hero-avatar-pill" aria-label="Meet Antriksh - AI Engineer & Founder">
          <div class="hero-avatar-thumb">
            <img src="images/antriksh-avatar-head.png" alt="Antriksh Yadav 3D Avatar" />
            <span class="hero-avatar-beacon" aria-hidden="true"></span>
          </div>
          <div class="hero-avatar-meta">
            <span class="hero-avatar-status">LIVE · APEX FOUNDER & AI ENGINEER</span>
            <span class="hero-avatar-role">Antriksh Yadav · AKTU '27 · IIT-G Amb.</span>
          </div>
          <span class="hero-avatar-tag">3D AVATAR ↗</span>
        </a>
"""

if '<div class="eyebrow mono">' in html:
    html = html.replace('<div class="eyebrow mono">', HERO_AVATAR_HTML + '\n        <div class="eyebrow mono">', 1)
    print("Hero avatar pill injected.")

# -------------------------------------------------------------
# 3. ENHANCE ABOUT SECTION AVATAR CARD
# -------------------------------------------------------------
OLD_AVATAR_CARD = """        <!-- Interactive Avatar Card -->
        <div class="avatar-card">
          <div class="avatar-img-wrap">
            <img class="avatar-img" src="https://avatars.githubusercontent.com/u/203316506?v=4" alt="Antriksh Yadav" onerror="this.src='https://github.com/AntrikshH90.png';" />
            <div class="avatar-status-pill mono">
              <span class="status-beacon"></span>
              <span>Available for AI Roles</span>
            </div>
          </div>
          <h3 class="avatar-name">Antriksh Yadav</h3>
          <div class="avatar-role mono">AI/ML Engineer · Founder, Apex</div>

          <div class="avatar-badges mono">
            <div class="ambassador-badge">
              <span class="badge-dot"></span>
              <span>Campus Ambassador @ IIT Guwahati</span>
            </div>
            <div class="ambassador-badge">
              <span class="badge-dot"></span>
              <span>Member, Google Developer Group (GDG)</span>
            </div>
            <div class="ambassador-badge">
              <span class="badge-dot"></span>
              <span>B.Tech AIML · AKTU (Dr. APJ Abdul Kalam Tech Univ)</span>
            </div>
            <div class="ambassador-badge">
              <span class="badge-dot"></span>
              <span>McKinsey Forward Program Scholar</span>
            </div>
          </div>
        </div>"""

NEW_AVATAR_CARD = """        <!-- Interactive Avatar Card -->
        <div class="avatar-card" id="about-avatar-card">
          <div class="avatar-switcher mono">
            <button type="button" class="avatar-switch-btn active" data-avatar-src="images/avatar-studio.png">Loft Studio 🏢</button>
            <button type="button" class="avatar-switch-btn" data-avatar-src="images/avatar-dark.png">Obsidian Cyber 🌌</button>
          </div>
          <div class="avatar-img-wrap" id="avatar-tilt-wrap">
            <img class="avatar-img" id="main-avatar-img" src="images/avatar-studio.png" alt="Antriksh Yadav 3D Avatar" />
            <div class="avatar-status-pill mono">
              <span class="status-beacon"></span>
              <span>Available for AI Roles</span>
            </div>
          </div>
          <h3 class="avatar-name">Antriksh Yadav</h3>
          <div class="avatar-role mono">AI/ML Engineer · Founder, Apex Intelligence</div>

          <div class="avatar-badges mono">
            <div class="ambassador-badge">
              <span class="badge-dot"></span>
              <span>Campus Ambassador @ IIT Guwahati</span>
            </div>
            <div class="ambassador-badge">
              <span class="badge-dot"></span>
              <span>Member, Google Developer Group (GDG)</span>
            </div>
            <div class="ambassador-badge">
              <span class="badge-dot"></span>
              <span>B.Tech AIML · AKTU (Dr. APJ Abdul Kalam Tech Univ)</span>
            </div>
            <div class="ambassador-badge">
              <span class="badge-dot"></span>
              <span>McKinsey Forward Program Scholar</span>
            </div>
            <div class="ambassador-badge">
              <span class="badge-dot"></span>
              <span>47 Verified Industry Honors & Credentials</span>
            </div>
          </div>
        </div>"""

if OLD_AVATAR_CARD in html:
    html = html.replace(OLD_AVATAR_CARD, NEW_AVATAR_CARD, 1)
    print("About avatar card enhanced with toggle and 3D images.")
else:
    print("WARNING: OLD_AVATAR_CARD not exact match.")

# -------------------------------------------------------------
# 4. ENHANCE 3D BOOK COVER WITH FOIL SHEEN & CORNER PEEL
# -------------------------------------------------------------
OLD_COVER_FRONT = """                <div class="leaf-face page-front cover-front" role="button" aria-label="Open credential book">
                  <div class="cover-frame"></div>"""

NEW_COVER_FRONT = """                <div class="leaf-face page-front cover-front" id="book-cover-front" role="button" aria-label="Open credential book">
                  <div class="cover-foil-sheen" id="cover-foil-sheen" aria-hidden="true"></div>
                  <div class="page-corner-peel" aria-hidden="true"></div>
                  <div class="cover-frame"></div>"""

if OLD_COVER_FRONT in html:
    html = html.replace(OLD_COVER_FRONT, NEW_COVER_FRONT, 1)
    print("Cover front foil sheen and corner peel added.")
else:
    print("WARNING: OLD_COVER_FRONT not exact match.")

# Add corner peel to other page fronts
html = html.replace(
    '<div class="leaf-face page-front" role="region"',
    '<div class="leaf-face page-front" role="region"><div class="page-corner-peel" aria-hidden="true"></div>'
)
print("Page corner peels added to inner leaves.")

# -------------------------------------------------------------
# 5. ENHANCE 3D PLAYGROUND WITH AUDIO REACTIVE CONTROLS
# -------------------------------------------------------------
OLD_LAB_ACTIONS = """            <div class="lab-actions">
              <button id="palette-button" class="lab-action">Shift color ↗</button>
              <button id="lab-pause" class="lab-action" aria-pressed="false">Pause Ⅱ</button>
            </div>"""

NEW_LAB_ACTIONS = """            <div class="lab-actions">
              <button id="palette-button" class="lab-action">Shift color ↗</button>
              <button id="lab-pause" class="lab-action" aria-pressed="false">Pause Ⅱ</button>
              <button id="lab-audio-toggle" class="lab-action mono" aria-pressed="false" title="Synthesizes soundwave and pulses 3D sculpture">
                <span id="lab-audio-icon">🎵</span> <span id="lab-audio-text">Audio Mode: OFF</span>
              </button>
              <button id="lab-mic-toggle" class="lab-action mono" aria-pressed="false" style="display:none;" title="Dance 3D sculpture to your microphone">
                <span>🎤 Mic Input</span>
              </button>
            </div>"""

if OLD_LAB_ACTIONS in html:
    html = html.replace(OLD_LAB_ACTIONS, NEW_LAB_ACTIONS, 1)
    print("Audio reactive controls added to 3D Playground.")

# Add audio visualizer overlay to lab stage
OLD_LAB_STAGE = """          <div class="lab-stage">
            <canvas
              id="lab-canvas"
              role="img"
              aria-label="Interactive 3D particle sculpture with 8 mathematical shapes and orbit controls."
            ></canvas>
            <span class="stage-mark mono">Drag to Orbit · Scroll to Zoom · 8 Mathematical Geometries</span>
          </div>"""

NEW_LAB_STAGE = """          <div class="lab-stage">
            <canvas
              id="lab-canvas"
              role="img"
              aria-label="Interactive 3D particle sculpture with 8 mathematical shapes and orbit controls."
            ></canvas>
            <div class="audio-visualizer-bar" id="audio-visualizer-hud" style="display:none;" aria-hidden="true"></div>
            <span class="stage-mark mono">Drag to Orbit · Scroll to Zoom · 8 Mathematical Geometries</span>
          </div>"""

if OLD_LAB_STAGE in html:
    html = html.replace(OLD_LAB_STAGE, NEW_LAB_STAGE, 1)
    print("Audio visualizer overlay added to lab stage.")

# -------------------------------------------------------------
# 6. ENHANCE ILLUSTRATOR STUDIO WITH THE BEZIER GAME
# -------------------------------------------------------------
OLD_PRESET_BEZIER = """              <button type="button" class="preset-btn" data-preset="bezier">
                <strong>Interactive Pen Tool</strong><br>
                <span style="font-size:9px; color:#8c9082;">Draggable anchor nodes</span>
              </button>
            </div>"""

NEW_PRESET_BEZIER = """              <button type="button" class="preset-btn" data-preset="bezier">
                <strong>Interactive Pen Tool</strong><br>
                <span style="font-size:9px; color:#8c9082;">Draggable anchor nodes</span>
              </button>
              <button type="button" class="preset-btn" data-preset="bezier-game" id="preset-bezier-game">
                <strong style="color:var(--acid);">🎮 The Bezier Challenge</strong><br>
                <span style="font-size:9px; color:#8c9082;">Precision Spline Mini-Game</span>
              </button>
            </div>"""

if OLD_PRESET_BEZIER in html:
    html = html.replace(OLD_PRESET_BEZIER, NEW_PRESET_BEZIER, 1)
    print("Bezier game preset added.")

# Add game HUD above vector stage
OLD_VECTOR_STAGE = """          <div class="vector-stage">
            <canvas id="vector-canvas" width="600" height="440" role="img" aria-label="Interactive generative vector canvas with bezier curves"></canvas>"""

NEW_VECTOR_STAGE = """          <div class="vector-stage">
            <div class="bezier-game-hud mono" id="bezier-game-hud" style="display:none;">
              <div>
                <span id="bezier-level-title" style="color:var(--acid); font-weight:700;">LEVEL 1: S-CURVE WAVE</span>
                <span style="color:#8c9082; margin-left:8px;" id="bezier-level-hint">Match the golden dashed target guide</span>
              </div>
              <div class="game-meter">
                <span>Precision: <strong id="bezier-accuracy-text">0%</strong></span>
                <div class="game-meter-bar">
                  <div class="game-meter-fill" id="bezier-meter-fill"></div>
                </div>
                <button type="button" class="game-verify-btn mono" id="bezier-verify-btn">Verify Spline ↗</button>
                <button type="button" class="game-verify-btn mono" id="bezier-next-btn" style="display:none; background:#83e1ff;">Next Level ➔</button>
              </div>
            </div>
            <canvas id="vector-canvas" width="600" height="440" role="img" aria-label="Interactive generative vector canvas with bezier curves"></canvas>"""

if OLD_VECTOR_STAGE in html:
    html = html.replace(OLD_VECTOR_STAGE, NEW_VECTOR_STAGE, 1)
    print("Bezier game HUD added.")

# -------------------------------------------------------------
# 7. ADD ARCHITECTURE MODAL & EASTER EGG TOAST HTML
# -------------------------------------------------------------
MODALS_HTML = """
  <!-- Architecture Deep Dive Modal -->
  <dialog class="arch-dialog mono" id="arch-dialog" aria-labelledby="arch-dialog-title">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <div>
        <span style="color:var(--acid); font-size:10.5px; font-weight:700;">ENGINEERING ARCHITECTURE DOSSIER</span>
        <h2 id="arch-dialog-title" style="font-size:22px; font-weight:800; margin:4px 0 0; color:#fff;">System Architecture Deep Dive</h2>
      </div>
      <button type="button" class="dialog-close" id="arch-dialog-close" aria-label="Close architecture modal">×</button>
    </div>

    <div class="arch-tabs" id="arch-tabs">
      <button type="button" class="arch-tab-btn active" data-arch="sandforge">SandForge (NVIDIA Nemotron + Nebius)</button>
      <button type="button" class="arch-tab-btn" data-arch="emergency-mitra">Emergency Mitra (SIH'26 MedTech)</button>
      <button type="button" class="arch-tab-btn" data-arch="apex">Apex Intelligence Engine</button>
    </div>

    <div id="arch-body">
      <!-- Dynamic Architecture content injected via JS -->
    </div>
  </dialog>

  <!-- Supernova Easter Egg Toast -->
  <div class="supernova-toast mono" id="supernova-toast" aria-live="polite">
    <span style="font-size:18px;">🏆</span>
    <div>
      <span style="color:#ffd700; font-weight:800;">ACHIEVEMENT UNLOCKED: "Cyber Architect"</span><br>
      <span style="font-size:11px; color:#dcd8c8;">Konami Code sequence detected · Golden Supernova Mode engaged!</span>
    </div>
  </div>
"""

# Insert modals before </body>
html = html.replace("</body>", MODALS_HTML + "\n</body>", 1)
print("Architecture modal and Supernova toast HTML added.")

with open("antriksh-portfolio-studio.html", "w", encoding="utf-8") as f:
    f.write(html)

print("Saved updated HTML structure.")
